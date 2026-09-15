import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";

// Figma "Card / Badges" Empty 상태 (4269:17300) — 335×234 white card:
// p 20 + 제목 19 + gap 16 + 빈 상태(pt 24 + 원 64 + gap 8 + 문구(pt 8 + 19 +
// gap 4 + 16) + pb 16) + p 20 = 234. 뱃지 기능이 아직 없어서 제출용으로 빈
// 상태 정적 UI만 그린다. Full/Partial 상태, API, 획득 로직은 후속 작업.
// 간격은 px 값으로 — NativeWind rem=14라 rem 클래스는 Figma px와 어긋난다.
export function BadgesTab() {
  return (
    <View className="gap-[16px] rounded-[24px] bg-background-normal p-[20px] shadow-[0px_4px_12px_0px_rgba(0,23,54,0.04)]">
      <ThemedText
        style={{ color: primitiveColors.charcoal["11"] }}
        typography="body-2-bold"
      >
        획득한 뱃지
      </ThemedText>
      <View className="items-center gap-[8px] pb-[16px] pt-[24px]">
        <View className="size-[64px] items-center justify-center rounded-full bg-charcoal-1">
          <ThemedText
            style={{ color: primitiveColors.charcoal["3"] }}
            typography="title-2-bold"
          >
            ?
          </ThemedText>
        </View>
        <View className="items-center gap-[4px] pt-[8px]">
          <ThemedText
            style={{ color: primitiveColors.charcoal["11"] }}
            typography="body-2-bold"
          >
            아직 획득한 뱃지가 없어요
          </ThemedText>
          <ThemedText
            style={{ color: primitiveColors.charcoal["5"] }}
            typography="caption-1-regular"
          >
            운동을 기록하면 하나씩 모을 수 있어요
          </ThemedText>
        </View>
      </View>
    </View>
  );
}
