import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";

export type MyPageTab = "streak" | "badges" | "summary";

const TABS: { key: MyPageTab; label: string }[] = [
  { key: "streak", label: "활동 기록" },
  { key: "badges", label: "획득한 뱃지" },
  { key: "summary", label: "활동 리포트" },
];

type MyPageTabsProps = {
  value: MyPageTab;
  onChange: (tab: MyPageTab) => void;
};

// Figma "Segmented Control" (4573:35562) — 화면 좌우 20 안쪽 335×44, 안쪽
// padding 4 / gap 4, 탭은 flex 1에 py 8. 선택된 탭에만 charcoal/12 2px 밑줄이
// 있고 나머지 탭에는 어떤 선도 없다. 텍스트는 13/18, 선택 Bold charcoal/11 ·
// 비선택 Medium charcoal/5. 간격은 rem 단위 클래스 대신 px 값을 쓴다 —
// 이 프로젝트의 NativeWind는 rem=14라 p-1/h-11 같은 클래스가 Figma px의
// 0.875배로 렌더된다.
const SELECTED_UNDERLINE_WIDTH = 2;

export function MyPageTabs({ value, onChange }: MyPageTabsProps) {
  return (
    <View className="mx-[20px] h-[44px] flex-row items-start gap-[4px] p-[4px]">
      {TABS.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className="flex-1 items-center justify-center py-[8px]"
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={
              selected && {
                borderBottomColor: primitiveColors.charcoal["12"],
                borderBottomWidth: SELECTED_UNDERLINE_WIDTH,
              }
            }
          >
            <ThemedText
              style={{
                color: selected
                  ? primitiveColors.charcoal["11"]
                  : primitiveColors.charcoal["5"],
              }}
              typography={selected ? "body-3-bold" : "body-3-medium"}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
