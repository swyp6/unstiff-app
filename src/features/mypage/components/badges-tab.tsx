import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";
import { trackClick } from "@/features/analytics/analytics";
import { useBadgeEarnedStore } from "@/features/mypage/badge-earned-store";
import { useBadgesStore } from "@/features/mypage/badges-store";
import { BadgeDetailModal } from "@/features/mypage/components/badge-detail-modal";
import type { Badge } from "@/features/mypage/types";

// 조건을 다 채웠지만 아직 획득 처리 전인 뱃지 — 카드를 탭하면 상세 모달
// 대신 축하 화면(badge-earned.tsx)으로 보낸다. 실제로는 서버가 "이번 응답
// 으로 막 획득함"을 알려줘야 하지만 그 계약이 아직 없어(#220), 지금은
// progress가 꽉 찬 것을 그 신호로 대신 쓴다.
function isReadyToClaim(badge: Badge) {
  return (
    !badge.earned &&
    badge.progress !== null &&
    badge.progress.current >= badge.progress.target
  );
}

// Figma "Card / 뱃지 목록" (6041:18056 등) — 335 카드, p 20 + gap 16 + 헤더
// 19 + 3열 그리드(gap 12). 0/9(6045:18058)와 2/9(6041:17997)가 레이아웃은
// 완전히 같아 별도 빈 상태 분기를 두지 않는다. #220: 뱃지 API가 아직 없어
// MOCK_BADGES로 그린다 — 연동 시 이 목록을 GET 응답으로 교체.
const GRID_ART_SIZE_EARNED = 72;
const GRID_ART_SIZE_LOCKED = 60;

function BadgeCard({ badge, onPress }: { badge: Badge; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className="flex-1 items-center justify-center gap-[10px] rounded-[16px] px-[8px] pb-[14px] pt-[16px]"
      onPress={onPress}
      style={{
        backgroundColor: badge.earned ? "#ffffff" : "#fafafa",
        opacity: badge.earned ? 1 : 0.8,
      }}
    >
      {badge.earned && badge.image ? (
        <Image
          contentFit="contain"
          source={badge.image}
          style={{ height: GRID_ART_SIZE_EARNED, width: GRID_ART_SIZE_EARNED }}
        />
      ) : (
        <Image
          contentFit="contain"
          source={require("@/assets/mypage/badges/badge-locked.svg")}
          style={{ height: GRID_ART_SIZE_LOCKED, width: GRID_ART_SIZE_LOCKED }}
        />
      )}
      <View className="items-center gap-[2px]">
        <ThemedText
          style={{
            color: primitiveColors.charcoal[badge.earned ? "11" : "4"],
            textAlign: "center",
          }}
          typography="caption-1-bold"
        >
          {badge.name}
        </ThemedText>
        <ThemedText
          style={{ color: primitiveColors.charcoal["4"], textAlign: "center" }}
          typography="caption-2-regular"
        >
          {badge.earned && badge.earnedAt
            ? badge.earnedAt.replaceAll("-", ". ")
            : badge.conditionSummary}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function BadgesTab() {
  const badges = useBadgesStore((state) => state.badges);
  const showBadgeEarned = useBadgeEarnedStore((state) => state.show);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const earnedCount = badges.filter((badge) => badge.earned).length;

  return (
    <>
      <View className="gap-[16px] rounded-[24px] bg-background-normal p-[20px] shadow-[0px_4px_12px_0px_rgba(0,23,54,0.04)]">
        <View className="flex-row items-center justify-between">
          <ThemedText
            style={{ color: primitiveColors.charcoal["11"] }}
            typography="body-2-bold"
          >
            획득한 뱃지
          </ThemedText>
          <ThemedText
            style={{ color: primitiveColors.charcoal["5"] }}
            typography="caption-1-regular"
          >
            {`${earnedCount} / ${badges.length}`}
          </ThemedText>
        </View>
        <View className="gap-[12px]">
          {[0, 3, 6].map((rowStart) => (
            <View className="flex-row gap-[12px]" key={rowStart}>
              {badges.slice(rowStart, rowStart + 3).map((badge) => (
                <BadgeCard
                  badge={badge}
                  key={badge.id}
                  onPress={() => {
                    trackClick("mypage", "badge_select");
                    if (isReadyToClaim(badge)) {
                      showBadgeEarned(badge);
                      router.push("/badge-earned");
                      return;
                    }
                    setSelectedBadge(badge);
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <BadgeDetailModal
        badge={selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
    </>
  );
}
