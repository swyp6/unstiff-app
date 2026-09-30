import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import { trackClick } from "@/features/analytics/analytics";
import { formatBadgeEarnedDate } from "@/features/mypage/badges-catalog";
import { useBadgesStore } from "@/features/mypage/badges-store";
import { BadgeDetailModal } from "@/features/mypage/components/badge-detail-modal";
import type { Badge } from "@/features/mypage/types";

// Figma "Card / 뱃지 목록" (6041:18056 등) — 335 카드, p 20 + gap 16 + 헤더
// 19 + 3열 그리드(gap 12). 0/9(6045:18058)와 2/9(6041:17997)가 레이아웃은
// 완전히 같아 별도 빈 상태 분기를 두지 않는다. GET /api/v1/badges가 화면에
// 그릴 순서대로 다 준다고 스웨거에 명시돼 있어 그 순서 그대로 3열씩 자른다.
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
      {badge.earned ? (
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
            ? formatBadgeEarnedDate(badge.earnedAt)
            : badge.conditionSummary}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function BadgesTab() {
  const badges = useBadgesStore((state) => state.badges);
  const hasLoaded = useBadgesStore((state) => state.hasLoaded);
  const loadError = useBadgesStore((state) => state.loadError);
  const load = useBadgesStore((state) => state.load);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const earnedCount = badges.filter((badge) => badge.earned).length;

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {badges.length > 0 && (
            <ThemedText
              style={{ color: primitiveColors.charcoal["5"] }}
              typography="caption-1-regular"
            >
              {`${earnedCount} / ${badges.length}`}
            </ThemedText>
          )}
        </View>
        {badges.length === 0 ? (
          <View className="h-[200px] items-center justify-center">
            {hasLoaded && loadError ? (
              <ThemedText
                style={{ color: primitiveColors.charcoal["5"] }}
                typography="caption-1-medium"
              >
                뱃지를 불러오지 못했어요
              </ThemedText>
            ) : (
              <ActivityIndicator color={semanticColors["label-normal"]} />
            )}
          </View>
        ) : (
          <View className="gap-[12px]">
            {[0, 3, 6].map((rowStart) => (
              <View className="flex-row gap-[12px]" key={rowStart}>
                {badges.slice(rowStart, rowStart + 3).map((badge) => (
                  <BadgeCard
                    badge={badge}
                    key={badge.code}
                    onPress={() => {
                      trackClick("mypage", "badge_select");
                      setSelectedBadge(badge);
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </View>
      <BadgeDetailModal
        badge={selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
    </>
  );
}
