import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";
import { trackClick } from "@/features/analytics/analytics";
import {
  todayCalendarDate,
  toDateKey,
} from "@/features/mypage/activity-report-period";
import { useBadgeEarnedStore } from "@/features/mypage/badge-earned-store";
import { useBadgesStore } from "@/features/mypage/badges-store";

// Figma "뱃지 획득 (전체 화면)" (6077:19217). 컨페티는 44개 조각을 낱개로
// 배치해 뒀지만 순수 장식이라 그대로 옮기지 않고, 같은 색/모양 팔레트로
// 절반 수만 고정 시드로 흩뿌린다 — 픽셀 단위로 같을 필요가 없다.
// ponytail: 정적 흩뿌림, 떨어지는 낙하 애니메이션은 없음 — 필요해지면
// reanimated로 추가.
const CONFETTI_COLORS = ["#ff6326", "#ffa36e", "#7c5cff", "#0f9d8e"];
const CONFETTI_COUNT = 22;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CONFETTI_PIECES = (() => {
  const random = mulberry32(42);
  return Array.from({ length: CONFETTI_COUNT }, (_, index) => ({
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    left: `${Math.round(random() * 100)}%`,
    rotate: `${Math.round(random() * 360)}deg`,
    round: index % 3 === 0,
    size: 7 + Math.round(random() * 6),
    top: `${Math.round(random() * 55)}%`,
  }));
})();

function Confetti() {
  return (
    <View className="absolute inset-0" pointerEvents="none">
      {CONFETTI_PIECES.map((piece, index) => (
        <View
          className="absolute"
          key={index}
          style={{
            backgroundColor: piece.color,
            borderRadius: piece.round ? piece.size / 2 : 2,
            height: piece.size,
            left: piece.left as never,
            top: piece.top as never,
            transform: [{ rotate: piece.rotate }],
            width: piece.size,
          }}
        />
      ))}
    </View>
  );
}

const ART_SIZE = 240;

export default function BadgeEarnedScreen() {
  const pendingBadge = useBadgeEarnedStore((state) => state.pendingBadge);
  const clear = useBadgeEarnedStore((state) => state.clear);
  const earnBadge = useBadgesStore((state) => state.earnBadge);

  // record-complete.tsx와 같은 방어 — store가 비어 있는데 이 화면으로
  // 들어오면(딥링크, 새로고침 등) 뱃지를 지어내지 않고 바로 나간다.
  useEffect(() => {
    if (!pendingBadge) router.dismissTo("/mypage");
  }, [pendingBadge]);

  if (!pendingBadge) return null;
  const badgeId = pendingBadge.id;

  // 실제로는 이 화면에 들어올 때 이미 서버가 획득 처리를 끝낸 뒤라 여기선
  // 화면만 보여주면 된다. 지금은 그 API가 없어(#220) "확인/뱃지
  // 모아보기"로 나가는 시점에 badges-store를 직접 갱신해 목데이터로도
  // 획득 후 상태를 볼 수 있게 한다.
  function markEarnedAndLeave() {
    earnBadge(badgeId, toDateKey(todayCalendarDate()));
    clear();
  }

  function handleConfirm() {
    trackClick("badge_earned", "confirm");
    markEarnedAndLeave();
    router.back();
  }

  function handleViewBadges() {
    trackClick("badge_earned", "view_badges");
    markEarnedAndLeave();
    // TODO: 마이페이지가 초기 탭을 파라미터로 받지 않아 "획득한 뱃지" 탭을
    // 바로 열어주지 못한다 — mypage/index.tsx에 탭 딥링크가 생기면 여기서
    // 같이 넘긴다.
    router.dismissTo("/mypage");
  }

  return (
    <View className="flex-1">
      <LinearGradient
        className="absolute inset-0"
        colors={["#ffd6c9", "#ffffff"]}
        locations={[0, 0.5]}
      />
      <Confetti />
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center px-[32px]">
          {pendingBadge.image && (
            <Image
              contentFit="contain"
              source={pendingBadge.image}
              style={{ height: ART_SIZE, width: ART_SIZE }}
            />
          )}
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
