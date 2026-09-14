import { Pressable } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";

// 전체 폭의 알약(pill) 모양 CTA 버튼 — solid(진한 배경)와 soft(연한 배경) 두
// 스타일을 지원한다. 라벨만 바꿔서 여러 화면의 CTA에 재사용한다.
export function ActionButton({
  label,
  onPress,
  soft = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  soft?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={
        disabled
          ? "w-full items-center justify-center rounded-full py-4"
          : soft
            ? "w-full items-center justify-center rounded-full bg-orange-50 py-4"
            : "w-full items-center justify-center rounded-full bg-charcoal-10 py-4"
      }
      style={({ pressed }) => [
        {
          backgroundColor: disabled ? semanticColors["fill-subtle"] : undefined,
        },
        pressed && !disabled && { opacity: 0.7 },
      ]}
    >
      <ThemedText
        typography="heading-1-bold"
        style={{
          color: disabled
            ? semanticColors["label-disabled"]
            : soft
              ? primitiveColors.orange["700"]
              : semanticColors["label-inverse"],
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}
