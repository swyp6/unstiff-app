import { Pressable } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import { cn } from "@/lib/utils";

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
      // 배경색은 disabled 여부 하나로만 결정한다. NativeWind가 className을
      // 붙인 Pressable의 `style` 함수(`({ pressed }) => ...`)를 버리기 때문에
      // 비활성 배경을 style 쪽에 두면 적용되지 않는다 — 활성/비활성 색을 모두
      // className에서 고른다.
      className={cn(
        "w-full items-center justify-center rounded-full py-4",
        disabled ? "bg-fill-subtle" : soft ? "bg-orange-50" : "bg-charcoal-10",
      )}
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
