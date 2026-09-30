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
import {
  todayCalendarDate,
  toDateKey,
} from "@/features/mypage/activity-report-period";
import { useBadgeEarnedStore } from "@/features/mypage/badge-earned-store";
import { useBadgesStore } from "@/features/mypage/badges-store";

// Figma "뱃지 획득 (전체 화면)" (6077:19217)의 컨페티 대신 Lottie
// (https://lottie.host/a1a9cbc9-ec44-4d55-ad32-7cfc4c374a28/vRNafYNNgt.lottie)
// — dotLottie(.lottie) 압축 파일 안의 animations/12345.json만 꺼내
// confetti.json으로 둔다. lottie-react-native가 순수 .json 소스를 더
// 폭넓게 지원해 dotLottie 컨테이너를 그대로 쓰지 않는다. 1회 재생, 자동
// 루프 없음(폭죽이 반복되면 어색하다).
const CONFETTI_SOURCE = require("@/assets/mypage/badges/confetti.json");

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
