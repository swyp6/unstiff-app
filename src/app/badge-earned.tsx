import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect } from "react";
import LottieView from "lottie-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";
import { trackClick } from "@/features/analytics/analytics";
import { useBadgeEarnedStore } from "@/features/mypage/badge-earned-store";

// Figma "뱃지 획득 (전체 화면)" (6077:19217)의 컨페티 대신 Lottie
// (https://lottie.host/a1a9cbc9-ec44-4d55-ad32-7cfc4c374a28/vRNafYNNgt.lottie)
// — dotLottie(.lottie) 압축 파일 안의 animations/12345.json만 꺼내
// confetti.json으로 둔다. lottie-react-native가 순수 .json 소스를 더
// 폭넓게 지원해 dotLottie 컨테이너를 그대로 쓰지 않는다. 1회 재생, 자동
// 루프 없음(폭죽이 반복되면 어색하다).
const CONFETTI_SOURCE = require("@/assets/mypage/badges/confetti.json");

const ART_SIZE = 240;

export default function BadgeEarnedScreen() {
  const queue = useBadgeEarnedStore((state) => state.queue);
  const dequeue = useBadgeEarnedStore((state) => state.dequeue);
  const clear = useBadgeEarnedStore((state) => state.clear);
  const setScreenActive = useBadgeEarnedStore((state) => state.setScreenActive);
  const pendingBadge = queue[0] ?? null;

  // trigger-new-badges.ts가 이 화면이 이미 떠 있는 동안엔 push를 또 부르지
  // 않도록 마운트~언마운트 구간을 표시한다 — 이 화면이 완전히 사라져야
  // (확인/뱃지 모아보기 어느 경로로 나가든) 다음 newBadges가 새로 push할 수
  // 있다.
  //
  // 안드로이드 하드웨어 뒤로가기나 스와이프로 닫으면 handleConfirm을 거치지
  // 않아 지금 보여주던 뱃지가 dequeue되지 않는다 — 그대로 두면 다음에 새
  // 뱃지를 땄을 때 이미 본 이 뱃지가 큐 맨 앞에 남아 먼저 다시 뜬다. 화면이
  // 어떤 경로로 사라지든 unmount 시점에 getState()로 최신 큐를 읽어, 아직
  // 안 비워졌으면(confirm 경로는 이미 비워서 여기서 다시 지우지 않는다)
  // 지금 보여주던 한 개만 치운다.
  useEffect(() => {
    setScreenActive(true);
    return () => {
      const store = useBadgeEarnedStore.getState();
      store.setScreenActive(false);
      if (store.queue.length > 0) store.dequeue();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // record-complete.tsx와 같은 방어 — 큐가 비어 있는 채로 이 화면에
  // 들어오면(딥링크, 새로고침 등) 뱃지를 지어내지 않고 바로 나간다. 마운트
  // 시 1회만 확인한다 — deps를 queue.length로 두면 handleConfirm이 마지막
  // 뱃지를 dequeue()해 큐를 비우는 바로 그 순간에도 이 effect가 같이
  // 걸려서, 막 호출한 router.back()을 dismissTo("/mypage")가 덮어써버린다
  // (정상 종료 경로의 네비게이션은 버튼 핸들러가 전담한다).
  useEffect(() => {
    if (queue.length === 0) router.dismissTo("/mypage");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pendingBadge) return null;

  function handleConfirm() {
    trackClick("badge_earned", "confirm");
    const isLast = queue.length <= 1;
    dequeue();
    // 큐에 다음 뱃지가 남아 있으면 이 화면에 그대로 머물러 다음 걸 보여준다
    // (queue[0]이 바뀌면서 자동으로 다시 그려진다) — 마지막 하나였을 때만
    // 원래 있던 곳(운동 기록 완료 화면 등)으로 돌아간다.
    if (isLast) router.back();
  }

  function handleViewBadges() {
    trackClick("badge_earned", "view_badges");
    // 남은 큐가 있어도 다 접고 마이페이지로 — 축하 화면을 더 보기보다
    // 지금 바로 뱃지 목록을 보고 싶다는 선택이다.
    clear();
    router.dismissTo("/mypage?tab=badges");
  }

  return (
    <View className="flex-1">
      <LinearGradient
        colors={["#ffd6c9", "#ffffff"]}
        locations={[0, 0.5]}
        style={StyleSheet.absoluteFill}
      />
      <LottieView
        autoPlay
        loop={false}
        resizeMode="cover"
        source={CONFETTI_SOURCE}
        style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
      />
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center px-[32px]">
          <Image
            contentFit="contain"
            source={pendingBadge.image}
            style={{ height: ART_SIZE, width: ART_SIZE }}
          />
          <View className="items-center gap-[6px] pt-[20px]">
            <ThemedText
              style={{
                color: primitiveColors.charcoal["11"],
                textAlign: "center",
              }}
              typography="display-1-bold"
            >
              {pendingBadge.name}
            </ThemedText>
            {pendingBadge.description !== "" && (
              <ThemedText
                style={{
                  color: primitiveColors.charcoal["5"],
                  textAlign: "center",
                }}
                typography="body-1-medium"
              >
                {pendingBadge.description}
              </ThemedText>
            )}
          </View>
          <View
            className="mt-[26px] flex-row items-center gap-[8px] rounded-full px-[18px] py-[10px]"
            style={{ backgroundColor: "#fafafa" }}
          >
            <ThemedText
              style={{ color: primitiveColors.charcoal["4"] }}
              typography="caption-1-regular"
            >
              획득 조건
            </ThemedText>
            <ThemedText
              style={{ color: primitiveColors.charcoal["8"] }}
              typography="body-2-bold"
            >
              {pendingBadge.conditionLabel}
            </ThemedText>
          </View>
        </View>

        <View className="items-center gap-[16px] px-[24px] pb-[16px]">
          <Pressable
            accessibilityRole="button"
            className="h-[54px] w-full items-center justify-center rounded-[27px] bg-charcoal-11"
            onPress={handleConfirm}
          >
            <ThemedText style={{ color: "#ffffff" }} typography="body-1-bold">
              확인
            </ThemedText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={handleViewBadges}>
            <ThemedText
              style={{ color: primitiveColors.charcoal["5"] }}
              typography="body-2-medium"
            >
              뱃지 모아보기
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
