import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";
import { semanticColors } from "@/constants/tokens";
import {
  BotBubbleText,
  BotMessageRow,
  ChatBubble,
} from "@/features/chat/components/chat-bubble";
import { AiContentReportToast } from "@/features/reports/components/ai-content-report-toast";
import { ChatDateDivider } from "@/features/chat/components/chat-date-divider";
import { ChatHeader } from "@/features/chat/components/chat-header";
import { ChatInputBar } from "@/features/chat/components/chat-input-bar";
import { ChatLockedBar } from "@/features/chat/components/chat-locked-bar";
import { ChatOptionsBar } from "@/features/chat/components/chat-options-bar";
import { ChatRetryAction } from "@/features/chat/components/chat-retry-action";
import { ExternalAiConsentModal } from "@/features/chat/components/external-ai-consent-modal";
import { TypingIndicator } from "@/features/chat/components/typing-indicator";
import { useChatStore } from "@/features/chat/chat-store";
import type { ChatMessage } from "@/features/chat/types";

// Figma 채팅 화면 바탕(#fafafa). 토큰에 없는 Figma 고정값이라 로컬 상수.
const CHAT_SURFACE_BACKGROUND = "#fafafa";

// 이 거리 안이면 "최신을 보고 있다"고 보고 봇 응답/typing 때 맨 아래로 따라간다.
// inverted 목록이라 offset 0이 맨 아래다.
const NEAR_BOTTOM_OFFSET = 80;

// 날짜 구분선/부제목에 쓰는 라벨 — 오늘/어제는 고정 문구, 그 전은 실제 날짜.
function getDayLabel(date: Date) {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / 86_400_000,
  );
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  return new Intl.DateTimeFormat("ko-KR", {
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatSubtitle(iso: string) {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${getDayLabel(date)} ${time}`;
}

function isToday(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

// 대화 끝에 봇 자리에 그리는 일시 상태 — 서버 history에 없는 UI라 messages와
// 따로 계산한다. 한 번에 하나만 보인다.
type ChatPendingState =
  | "preparing-question" // B-01 오늘의 질문/선택지 준비중
  | "load-failed" // B-02 질문/선택지 로드 실패 + 다시 시도
  | "typing" // 답변 작성중(점 애니메이션)
  | "send-failed"; // B-08 답변 저장 실패 + 다시 시도

const PENDING_BUBBLE_TEXT: Record<
  Exclude<ChatPendingState, "typing">,
  string
> = {
  "preparing-question": "오늘의 질문과 선택지를 준비중이야 ...",
  "load-failed": "질문과 선택지를 불러오지 못했어\n잠시 후 다시 시도해줘.",
  "send-failed": "선택한 답변을 저장하지 못했어.\n다시 시도해줘.",
};

type ChatRowContent = { key: string } & (
  | { type: "divider"; label: string }
  | { type: "message"; message: ChatMessage }
  | { type: "pending"; pending: ChatPendingState }
  | { type: "retry" }
);
type ChatRow = ChatRowContent & { spacingTop: number };

// Figma Messages / Turns 간격: 구분선 다음 첫 row 20, 같은 turn 안 16, 다음 turn
// 36. turn은 사용자 답변 뒤 봇의 새 질문에서 시작한다 — 대화를 끝내는 stop
// 응답과 typing은 같은 turn에 붙고(16), 저장 실패 안내는 새 turn(36)이다.
// "다시 시도"는 자기 컨테이너(60) 안에 가운데 놓여 추가 간격이 없다.
function spacingBefore(previous: ChatRow | undefined, next: ChatRowContent) {
  if (!previous || next.type === "retry") return 0;
  if (previous.type === "divider") return 20;
  if (next.type === "pending") return next.pending === "send-failed" ? 36 : 16;
  if (next.type === "message" && next.message.role === "assistant") {
    const afterUser =
      previous.type === "message" && previous.message.role === "user";
    return afterUser && next.message.stop !== true ? 36 : 16;
  }
  return 16;
}

// 메시지를 날짜(로컬 자정 기준)별로 묶어 구분선을 끼우고, 끝에 일시 상태 row를
// 붙인다. 과거 페이지가 앞에 붙어도 합쳐진 전체를 다시 계산하므로 페이지 경계가
// 같은 날이어도 구분선이 겹치지 않는다.
function toRows(
  messages: ChatMessage[],
  pending: ChatPendingState | null,
): ChatRow[] {
  const rows: ChatRow[] = [];
  let lastDayKey: string | null = null;

  function push(row: ChatRowContent) {
    const previous = rows[rows.length - 1];
    rows.push({ ...row, spacingTop: spacingBefore(previous, row) });
  }

  function pushDividerFor(date: Date) {
    const dayKey = date.toDateString();
    if (dayKey === lastDayKey) return;
    push({
      key: `divider-${dayKey}`,
      type: "divider",
      label: getDayLabel(date),
    });
    lastDayKey = dayKey;
  }

  for (const message of messages) {
    pushDividerFor(new Date(message.createdAt));
    push({ key: message.id, type: "message", message });
  }

  if (pending) {
    // 일시 상태는 "지금"의 일이라 마지막 메시지가 다른 날이면 오늘 구분선을 둔다.
    pushDividerFor(new Date());
    push({ key: `pending-${pending}`, type: "pending", pending });
    if (pending === "load-failed" || pending === "send-failed") {
      push({ key: "retry", type: "retry" });
    }
  }

  return rows;
}

export default function ChatScreen() {
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const isTyping = useChatStore((state) => state.isTyping);
  const canSend = useChatStore((state) => state.canSend);
  const failure = useChatStore((state) => state.failure);
  const isLoadingOlderHistory = useChatStore(
    (state) => state.isLoadingOlderHistory,
  );
  const entryState = useChatStore((state) => state.entryState);
  const consentDeclined = useChatStore((state) => state.consentDeclined);
  const isConsenting = useChatStore((state) => state.isConsenting);
  const externalAiTerm = useChatStore((state) => state.externalAiTerm);
  const externalAiTermError = useChatStore(
    (state) => state.externalAiTermError,
  );
  const loadExternalAiTerm = useChatStore((state) => state.loadExternalAiTerm);
  const loadConversation = useChatStore((state) => state.loadConversation);
  const loadOlderHistory = useChatStore((state) => state.loadOlderHistory);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const retryFailure = useChatStore((state) => state.retryFailure);
  const agreeToExternalAi = useChatStore((state) => state.agreeToExternalAi);
  const declineExternalAi = useChatStore((state) => state.declineExternalAi);
  const [showReportedToast, setShowReportedToast] = useState(false);
  const listRef = useRef<FlatList<ChatRow>>(null);
  const isNearBottomRef = useRef(true);
  const previousLastMessageIdRef = useRef<string | undefined>(undefined);
  const lastMessage = messages[messages.length - 1];

  // 렌더 우선순위: 동의 필요(모달) → 질문 준비중 → 로드 실패 → 저장 실패 →
  // typing → 완료 → 일반. 실패는 store가 한 종류만 들고, 로딩/typing 시작 시
  // 지우므로 동시에 보이지 않는다.
  const pending: ChatPendingState | null =
    failure?.kind === "load"
      ? "load-failed"
      : failure?.kind === "send"
        ? "send-failed"
        : isTyping
          ? "typing"
          : isLoading && messages.length === 0
            ? "preparing-question"
            : null;
  // 오늘 대화 종료: 마지막 봇 응답이 stop이고 서버(enter.available / 직전
  // 응답의 stop)도 더 보낼 수 없다고 한 경우 — 서버 isAvailableToday(마지막
  // 메시지가 stop && 오늘)와 같은 판단이다. 어제 끝난 대화는 available이라
  // 잠기지 않고 새 질문을 요청한다.
  const isCompletedToday =
    entryState === "ready" &&
    !isLoading &&
    !failure &&
    lastMessage?.role === "assistant" &&
    lastMessage.stop === true &&
    isToday(lastMessage.createdAt) &&
    !canSend;
  const showComposer = entryState === "ready" && !isLoading && !failure;

  // inverted 목록이라 데이터는 최신이 먼저(index 0 = 맨 아래).
  const rows = useMemo(
    () => toRows(messages, pending).reverse(),
    [messages, pending],
  );

  useFocusEffect(
    useCallback(() => {
      isNearBottomRef.current = true;
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      loadConversation();
    }, [loadConversation]),
  );

  // 자동 스크롤: 내가 보낸 답변은 항상, 봇 응답/typing/실패 안내는 최신을 보고
  // 있을 때만 맨 아래로. 과거 페이지 prepend는 마지막 메시지가 그대로라 여기
  // 걸리지 않는다(inverted 목록에서 끝에 붙는 데이터는 offset을 바꾸지 않는다).
  const lastMessageId = lastMessage?.id;
  const lastMessageIsMine = lastMessage?.role === "user";
  useEffect(() => {
    const lastMessageChanged =
      previousLastMessageIdRef.current !== lastMessageId;
    previousLastMessageIdRef.current = lastMessageId;
    if ((lastMessageChanged && lastMessageIsMine) || isNearBottomRef.current) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [lastMessageId, lastMessageIsMine, pending]);

  // 서버 동의가 끝나야만 store가 모달을 닫고 채팅을 시작한다. 실패하면 모달은
  // 그대로 남고(재시도 가능) 약관 화면과 같은 문구로 알린다.
  async function handleAgree() {
    const agreed = await agreeToExternalAi();
    if (!agreed) {
      Alert.alert("오류", "약관 동의 처리 중 문제가 발생했습니다.");
    }
  }

  // "거부하기"(Android 뒤로가기 포함) — 서버 동의 상태는 그대로 두고 미동의
  // 채팅 화면에 남지 않도록 홈으로 보낸다. replace라 뒤로가기로 이 화면에
  // 되돌아오지 않고, 다음에 채팅 탭에 들어오면 loadConversation이 서버
  // 상태를 다시 확인해 여전히 미동의면 모달을 다시 띄운다.
  function handleDecline() {
    declineExternalAi();
    router.replace("/home");
  }

  function renderRow(row: ChatRow) {
    switch (row.type) {
      case "divider":
        return <ChatDateDivider label={row.label} />;
      case "message":
        return (
          <ChatBubble
            message={row.message}
            onReported={() => setShowReportedToast(true)}
          />
        );
      case "pending":
        return row.pending === "typing" ? (
          <TypingIndicator />
        ) : (
          <BotMessageRow>
            <BotBubbleText>{PENDING_BUBBLE_TEXT[row.pending]}</BotBubbleText>
          </BotMessageRow>
        );
      case "retry":
        return (
          <ChatRetryAction
            disabled={isLoading || isTyping}
            onPress={retryFailure}
          />
        );
    }
  }

  return (
    <ThemedView style={styles.screen}>
      {/* bottom을 안드로이드에서만 빼는 이유: 이 화면은 항상 탭바 위에 떠
          있고, 탭바가 하단 시스템 네비게이션 바 여백을 이미 처리한다.
          edges에 "bottom"까지 넣으면 안드로이드 edge-to-edge에서
          insets.bottom이 탭바 유무와 무관하게 그대로 잡혀,
          ChatLockedBar/컴포저 아래에 눈에 잘 안 띄는(거의 같은 색) 여백이
          한 번 더 생긴다 — src/app/(tabs)/home.tsx와 같은 문제. iOS는
          반대로 그 insets.bottom(탭바 높이)이 없으면 컴포저가 탭바 아이콘
          밑에 깔려서 bottom을 유지한다. */}
      <SafeAreaView
        edges={Platform.OS === "android" ? ["top"] : ["top", "bottom"]}
        style={styles.flex}
      >
        <ChatHeader
          subtitle={
            lastMessage ? formatSubtitle(lastMessage.createdAt) : undefined
          }
        />
        <KeyboardAvoidingView
          // windowSoftInputMode="adjustResize"에 기대 Android는 undefined로 뒀었는데,
          // edge-to-edge(targetSdk 36)에서는 adjustResize가 창을 안 줄여줘서 키보드가
          // 뜨면 composer/옵션바가 가려진다. behavior="height"는 Android에서 키보드가
          // 닫혀 있을 때도 컨테이너 높이를 실측보다 작게 잡아 마지막 말풍선이 옵션바에
          // 붙어 보이는 부작용이 있어 두 플랫폼 다 padding으로 통일한다.
          behavior="padding"
          style={styles.flex}
        >
          <FlatList
            ref={listRef}
            // inverted라 flex-end가 시각적으로 위 — 대화가 짧을 때 Figma처럼
            // 구분선부터 위에서 아래로 쌓이고, 길어지면 최신이 맨 아래에 온다.
            contentContainerStyle={styles.listContent}
            data={rows}
            inverted
            keyboardDismissMode="interactive"
            keyExtractor={(row) => row.key}
            // inverted라 Header가 시각적으로 맨 아래 — 완료 상태에서 마지막
            // 말풍선과 잠금 바 상단 구분선 사이 숨 쉴 여백. 데이터 row가 아니라
            // pagination/구분선 계산과 무관하다.
            ListHeaderComponent={
              isCompletedToday ? <View style={styles.completedSpacer} /> : null
            }
            // inverted라 Footer가 시각적으로 맨 위 — 과거 페이지 로딩 표시.
            ListFooterComponent={
              isLoadingOlderHistory ? (
                <ActivityIndicator
                  color={semanticColors["label-normal"]}
                  style={styles.olderLoading}
                />
              ) : null
            }
            onEndReached={loadOlderHistory}
            onEndReachedThreshold={0.5}
            onScroll={(event) => {
              isNearBottomRef.current =
                event.nativeEvent.contentOffset.y < NEAR_BOTTOM_OFFSET;
            }}
            renderItem={({ item }) => (
              <View style={{ paddingTop: item.spacingTop }}>
                {renderRow(item)}
              </View>
            )}
            scrollEventThrottle={16}
            style={styles.flex}
          />
          {isCompletedToday ? (
            <ChatLockedBar />
          ) : (
            showComposer && (
              <View style={styles.bottomArea}>
                {!isTyping &&
                  lastMessage?.role === "assistant" &&
                  !!lastMessage.options?.length && (
                    <ChatOptionsBar
                      disabled={!canSend}
                      options={lastMessage.options}
                      onSelect={sendMessage}
                    />
                  )}
                <ChatInputBar
                  disabled={isTyping || !canSend}
                  onSend={sendMessage}
                />
              </View>
            )
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
      <ExternalAiConsentModal
        isSubmitting={isConsenting}
        onAgree={handleAgree}
        onDecline={handleDecline}
        onRetryTerm={loadExternalAiTerm}
        term={externalAiTerm}
        termError={externalAiTermError}
        visible={entryState === "consent-required" && !consentDeclined}
      />
      {showReportedToast && (
        <AiContentReportToast onHide={() => setShowReportedToast(false)} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: CHAT_SURFACE_BACKGROUND,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    // inverted라 pre-flip paddingTop이 화면상 맨 아래(최신 말풍선) 여백이 된다.
    // 그 여백이 0이면 말풍선 그림자(elevation, 살짝 밖으로 번짐)가 스크롤 콘텐츠
    // 경계에서 그대로 잘려서 가장 최근 말풍선만 그림자가 안 보였다.
    paddingTop: 8,
  },
  olderLoading: {
    paddingVertical: 12,
  },
  completedSpacer: {
    height: 20,
  },
  // Figma Bottom Area: 대화 영역과 12, 선택지와 composer 사이 12.
  bottomArea: {
    gap: 12,
    paddingTop: 12,
  },
});
