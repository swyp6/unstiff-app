import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, radius, semanticColors } from "@/constants/tokens";
import { trackClick } from "@/features/analytics/analytics";
import {
  getPushMessages,
  markAllPushMessagesRead,
  markPushMessageRead,
} from "@/features/notifications/api";
import { NotificationEmptyState } from "@/features/notifications/components/notification-empty-state";
import { NotificationHeader } from "@/features/notifications/components/notification-header";
import { NotificationRow } from "@/features/notifications/components/notification-row";
import {
  appendUniqueMessages,
  buildNotificationListEntries,
  type NotificationListEntry,
} from "@/features/notifications/message-list";
import type { PushMessageResponse } from "@/features/notifications/types";
import { useUnreadPushCountStore } from "@/features/notifications/unread-count-store";

// Figma `surface/background`. tokens.ts는 Figma Variables sync 결과인데 아직
// surface/* 가 포함돼 있지 않아 값으로 둔다. 빈 상태 종 일러스트의 사선 여백도
// 이 색으로 그려져 있어 화면 배경과 반드시 같아야 한다.
const SURFACE_BACKGROUND = "#fafafa";

const PAGE_SIZE = 20;

// 서버 응답이 비어 있는 것(빈 상태)과 못 불러온 것(에러)을 섞지 않기 위해 로딩
// 상태를 명시적으로 구분한다.
type LoadStatus = "loading" | "error" | "ready";

// 로컬에서 확정한 읽음을 서버 응답 위에 덮어쓴다. 읽음은 monotonic(false →
// true)이라 이미 읽은 알림이 다시 안 읽음으로 돌아가면 안 되는데, 목록 GET과
// read-all은 서로를 기다리지 않는다 — read-all 반영 전에 만들어진 페이지가
// 뒤늦게 도착하면 read:false를 그대로 들고 온다. forceAllRead는 "이 응답이
// read-all보다 늦었다"는 판정이고(readAllGenerationRef 참고), readIds는 개별
// 읽음으로 확정한 id다. 둘 다 아니면 서버 값을 그대로 믿는다.
function applyLocalReads(
  items: PushMessageResponse[],
  forceAllRead: boolean,
  readIds: Set<number>,
) {
  return items.map((message) =>
    message.read || (!forceAllRead && !readIds.has(message.id))
      ? message
      : { ...message, read: true },
  );
}

export default function NotificationsScreen() {
  const [messages, setMessages] = useState<PushMessageResponse[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const decrementUnreadCount = useUnreadPushCountStore(
    (state) => state.decrementUnreadCount,
  );
  const setUnreadCount = useUnreadPushCountStore(
    (state) => state.setUnreadCount,
  );

  const isMountedRef = useRef(true);
  // read-all 요청이 동시에 두 개 나가지 않게 하는 가드(진입마다 한 번은 나간다).
  const isMarkingAllAsReadRef = useRef(false);
  // read-all이 성공할 때마다 올라간다. 목록 요청은 시작 시점 값을 들고 있다가
  // 응답에서 비교해, 자기가 날아가 있는 동안 read-all이 끼어들었는지만 본다.
  // "과거에 read-all이 성공한 적 있다"는 영구 플래그로 두면 그 뒤에 새로 도착한
  // 알림까지 읽음으로 덮어버린다 — 판정 대상은 응답 하나의 stale 여부다.
  const readAllGenerationRef = useRef(0);
  // 첫 페이지를 다시 부를 때마다 올라간다 — 이전 세대의 응답(첫 페이지든 다음
  // 페이지든)이 새 목록을 덮어쓰지 못하게 하는 기준.
  const generationRef = useRef(0);
  // 첫 조회/다음 페이지를 통틀어 한 번에 하나의 요청만 나가게 하는 가드.
  const isFetchingRef = useRef(false);
  const cursorRef = useRef<number | undefined>(undefined);
  const hasNextRef = useRef(true);
  // 읽음 상태는 monotonic(false → true)이다. 뒤늦게 도착한 페이지가 이미 읽음
  // 처리한 알림을 다시 안 읽음으로 되돌리지 않도록 로컬 결과를 기억해 둔다.
  const readIdsRef = useRef<Set<number>>(new Set());
  // 같은 알림을 연타해도 읽음 요청이 한 번만 나가게 한다.
  const pendingReadIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    isMountedRef.current = true;
    const generation = ++generationRef.current;
    const readAllGeneration = readAllGenerationRef.current;

    isFetchingRef.current = true;
    cursorRef.current = undefined;
    hasNextRef.current = true;
    readIdsRef.current = new Set();
    pendingReadIdsRef.current = new Set();

    // 화면 상태(loading/에러 초기화)는 최초 mount의 초기값과 retry() 이벤트
    // 핸들러가 이미 맞춰둔다 — effect 안에서 동기적으로 setState 하지 않는다.
    // 첫 요청은 cursor 없이 size만 보낸다 — cursor=0을 억지로 보내지 않는다.
    getPushMessages({ size: PAGE_SIZE })
      .then((page) => {
        if (!isMountedRef.current || generation !== generationRef.current) {
          return;
        }
        setMessages(
          applyLocalReads(
            page.items,
            readAllGeneration !== readAllGenerationRef.current,
            readIdsRef.current,
          ),
        );
        cursorRef.current = page.nextCursor;
        hasNextRef.current = page.hasNext;
        setStatus("ready");
      })
      .catch(() => {
        if (!isMountedRef.current || generation !== generationRef.current) {
          return;
        }
        // 실패를 "받은 알림이 없어요"로 위장하지 않는다.
        setStatus("error");
      })
      .finally(() => {
        if (generation === generationRef.current) isFetchingRef.current = false;
      });

    return () => {
      isMountedRef.current = false;
    };
  }, [reloadKey]);

  useFocusEffect(
    useCallback(() => {
      if (isMarkingAllAsReadRef.current) return;
      isMarkingAllAsReadRef.current = true;

      markAllPushMessagesRead()
        .then(() => {
          // 먼저 올린다 — 지금 날아가 있는 목록 요청은 응답에서 이 차이를 보고
          // 자기 items를 읽음으로 보정한다. read-all 뒤에 시작하는 요청은 같은
          // 값을 들고 있으므로 그 사이 새로 온 알림을 덮지 않는다.
          readAllGenerationRef.current += 1;
          if (!isMountedRef.current) return;
          // 이미 도착해 있는 목록은 여기서 맞춘다. 서버가 read-all 반영 전에
          // 만든 페이지라 read:false로 남아 있을 수 있는데, 그대로 두면 행을
          // 눌렀을 때 이미 읽은 알림에 개별 읽음 요청이 한 번 더 나간다.
          setMessages((previous) =>
            applyLocalReads(previous, true, readIdsRef.current),
          );
          setUnreadCount(0);
        })
        .catch(() => {
          // API 실패는 화면을 막을 이유가 없다 — 목록은 이미 로드됐고,
          // 사용자가 개별 알림을 클릭하면 그때 개별 읽음 처리가 진행된다.
        })
        .finally(() => {
          isMarkingAllAsReadRef.current = false;
        });
    }, [setUnreadCount]),
  );

  const loadMore = useCallback(() => {
    // hasNext=false면 더 부르지 않고, 이미 요청 중이면 스크롤이 튀어도 같은
    // cursor로 중복 요청하지 않는다.
    if (isFetchingRef.current || !hasNextRef.current) return;
    const cursor = cursorRef.current;
    if (cursor === undefined) return;

    const generation = generationRef.current;
    const readAllGeneration = readAllGenerationRef.current;
    isFetchingRef.current = true;
    setIsLoadingMore(true);

    getPushMessages({ cursor, size: PAGE_SIZE })
      .then((page) => {
        if (!isMountedRef.current || generation !== generationRef.current) {
          return;
        }
        setMessages((previous) =>
          appendUniqueMessages(
            previous,
            applyLocalReads(
              page.items,
              readAllGeneration !== readAllGenerationRef.current,
              readIdsRef.current,
            ),
          ),
        );
        cursorRef.current = page.nextCursor;
        hasNextRef.current = page.hasNext;
      })
      .catch(() => {
        // 다음 페이지 실패는 이미 보고 있는 목록을 건드리지 않는다 — 다시
        // 스크롤을 내리면 같은 cursor로 재시도된다.
      })
      .finally(() => {
        if (!isMountedRef.current || generation !== generationRef.current) {
          return;
        }
        isFetchingRef.current = false;
        setIsLoadingMore(false);
      });
  }, []);

  const handlePressMessage = useCallback(
    (message: PushMessageResponse) => {
      trackClick("notifications", "row_open");
      // 이미 읽은 알림은 매번 호출하지 않는다(엔드포인트 자체는 idempotent다).
      // 유형별 이동 화면은 서버 `data` 계약이 확정되지 않아 아직 붙이지 않는다.
      if (message.read) return;

      const pendingReadIds = pendingReadIdsRef.current;
      if (pendingReadIds.has(message.id)) return;
      pendingReadIds.add(message.id);

      const generation = generationRef.current;
      markPushMessageRead(message.id)
        .then(() => {
          if (!isMountedRef.current || generation !== generationRef.current) {
            return;
          }
          readIdsRef.current.add(message.id);
          setMessages((previous) =>
            previous.map((item) =>
              item.id === message.id ? { ...item, read: true } : item,
            ),
          );
          decrementUnreadCount();
        })
        .catch(() => {
          // 실패하면 읽은 것으로 확정하지 않는다 — 행은 안 읽음으로 남는다.
        })
        .finally(() => {
          pendingReadIds.delete(message.id);
        });
    },
    [decrementUnreadCount],
  );

  function retry() {
    trackClick("notifications", "load_retry");
    setStatus("loading");
    setMessages([]);
    setIsLoadingMore(false);
    setReloadKey((key) => key + 1);
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/home");
  }

  const entries = useMemo(
    () => buildNotificationListEntries(messages, new Date()),
    [messages],
  );

  function renderEntry(entry: NotificationListEntry) {
    if (entry.kind === "section") {
      return (
        <ThemedText
          style={[styles.sectionTitle, { marginTop: entry.spacingTop }]}
          typography="caption-1-bold"
        >
          {entry.title}
        </ThemedText>
      );
    }

    return (
      <View style={{ marginTop: entry.spacingTop }}>
        <NotificationRow
          message={entry.message}
          onPress={handlePressMessage}
          timeLabel={entry.timeLabel}
        />
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <NotificationHeader onBack={handleBack} />

      {status === "loading" ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color={semanticColors["label-normal"]} />
        </View>
      ) : status === "error" ? (
        <View style={styles.centerContent}>
          <ThemedText
            style={styles.errorText}
            themeColor="textSecondary"
            typography="body-2-medium"
          >
            알림을 불러오지 못했습니다.
          </ThemedText>
          <Pressable
            accessibilityLabel="다시 시도"
            accessibilityRole="button"
            onPress={retry}
            style={styles.retryButton}
          >
            <ThemedText
              style={styles.retryButtonText}
              typography="body-1-medium"
            >
              다시 시도
            </ThemedText>
          </Pressable>
        </View>
      ) : messages.length === 0 ? (
        <NotificationEmptyState
          // 마이페이지 탭의 nested Stack을 건드리지 않는 root Stack 사본으로
          // 보낸다(app/notification-settings). replace라서 이 화면을 대신
          // 차지하고, 거기서 뒤로가기를 누르면 지금처럼 홈으로 돌아간다.
          onOpenSettings={() => {
            trackClick("notifications", "open_settings_from_empty");
            router.replace("/notification-settings");
          }}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={entries}
          keyExtractor={(entry) => entry.key}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.listFooter}>
                <ActivityIndicator color={semanticColors["label-normal"]} />
              </View>
            ) : null
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => renderEntry(item)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: SURFACE_BACKGROUND,
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  listFooter: {
    paddingVertical: 16,
  },
  // 제목 아래 10px 간격은 첫 행 entry의 spacingTop이 담당한다.
  sectionTitle: {
    color: primitiveColors.charcoal[5],
  },
  centerContent: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: semanticColors["primary-normal"],
    borderRadius: radius.default,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: semanticColors["primary-on"],
  },
});
