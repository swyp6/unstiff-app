import { Image } from "expo-image";
import { Modal, Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";
import type { Badge } from "@/features/mypage/types";

// Figma "모달 / 뱃지 상세" — 획득(6046:18119) / 미획득(6065:18729) 두
// variant. confirm-modal.tsx와 같은 RN Modal + dim 패턴을 쓴다. 진행도
// 막대는 별도 컴포넌트가 없어 View 두 개(트랙 + 채움)로 직접 그린다.
const ART_SIZE = 160;
const PROGRESS_BAR_HEIGHT = 10;

function ProgressBar({ current, target }: { current: number; target: number }) {
  const percent = Math.min(100, (current / target) * 100);
  return (
    <View className="w-full gap-[8px]">
      <View className="flex-row items-center justify-between">
        <ThemedText
          style={{ color: primitiveColors.charcoal["5"] }}
          typography="caption-1-regular"
        >
          진행 중
        </ThemedText>
        <View className="flex-row items-center">
          <ThemedText
            style={{ color: primitiveColors.orange["500"] }}
            typography="caption-1-bold"
          >
            {current}
          </ThemedText>
          <ThemedText
            style={{ color: primitiveColors.charcoal["4"] }}
            typography="caption-1-regular"
          >
            {` / ${target}`}
          </ThemedText>
        </View>
      </View>
      <View
        className="w-full overflow-hidden rounded-[5px] bg-charcoal-1"
        style={{ height: PROGRESS_BAR_HEIGHT }}
      >
        <View
          className="h-full rounded-[5px] bg-orange-500"
          style={{ width: `${percent}%` }}
        />
      </View>
    </View>
  );
}

export function BadgeDetailModal({
  badge,
  onClose,
}: {
  badge: Badge | null;
  onClose: () => void;
}) {
  if (!badge) return null;

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible
    >
      <View
        className="flex-1 items-center justify-center px-[32px]"
        style={{ backgroundColor: "rgba(23, 23, 25, 0.45)" }}
      >
        <Pressable
          accessibilityLabel="닫기"
          accessibilityRole="button"
          className="absolute inset-0"
          onPress={onClose}
        />
        <View className="w-full max-w-[360px] items-center gap-0 rounded-[28px] bg-white px-[24px] pb-[24px] pt-[32px] shadow-[0px_20px_44px_0px_rgba(23,23,26,0.18)]">
          {badge.earned && badge.image ? (
            <Image
              contentFit="contain"
              source={badge.image}
              style={{ height: ART_SIZE, width: ART_SIZE }}
            />
          ) : (
            <Image
              contentFit="contain"
              source={require("@/assets/mypage/badges/badge-locked.svg")}
              style={{ height: ART_SIZE, width: ART_SIZE }}
            />
          )}

          <View className="items-center gap-[4px] pt-[20px]">
            <ThemedText
              style={{
                color: primitiveColors.charcoal[badge.earned ? "11" : "8"],
                textAlign: "center",
              }}
              typography="title-2-bold"
            >
              {badge.name}
            </ThemedText>
            {badge.description !== "" && (
              <ThemedText
                style={{
                  color: primitiveColors.charcoal["5"],
                  textAlign: "center",
                }}
                typography="body-2-medium"
              >
                {badge.description}
              </ThemedText>
            )}
          </View>

          <View className="w-full items-center gap-[14px] pt-[22px]">
            <View className="w-full items-center gap-[4px]">
              <ThemedText
                style={{
                  color: primitiveColors.charcoal["4"],
                  textAlign: "center",
                }}
                typography="caption-2-medium"
              >
                획득 조건
              </ThemedText>
              <ThemedText
                style={{
                  color: primitiveColors.charcoal["11"],
                  textAlign: "center",
                }}
                typography="body-2-bold"
              >
                {badge.conditionLabel}
              </ThemedText>
            </View>

            {badge.earned && badge.earnedAt && (
              <ThemedText
                style={{ color: primitiveColors.charcoal["4"] }}
                typography="caption-1-regular"
              >
                {`${badge.earnedAt.replaceAll("-", ". ")} 획득`}
              </ThemedText>
            )}
            {!badge.earned && badge.progress && (
              <ProgressBar
                current={badge.progress.current}
                target={badge.progress.target}
              />
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            className="mt-[24px] h-[52px] w-full items-center justify-center rounded-[26px]"
            onPress={onClose}
            style={{
              backgroundColor: badge.earned
                ? primitiveColors.charcoal["11"]
                : primitiveColors.charcoal["1"],
            }}
          >
            <ThemedText
              style={{
                color: badge.earned ? "#ffffff" : primitiveColors.charcoal["8"],
              }}
              typography="body-1-bold"
            >
              {badge.earned ? "확인" : "닫기"}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
