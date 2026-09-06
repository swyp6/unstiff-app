import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";

export type MyPageTab = "streak" | "badges" | "summary";

const TABS: { key: MyPageTab; label: string }[] = [
  { key: "streak", label: "연속 기록" },
  { key: "badges", label: "획득한 뱃지" },
  { key: "summary", label: "활동 요약" },
];

type MyPageTabsProps = {
  value: MyPageTab;
  onChange: (tab: MyPageTab) => void;
};

export function MyPageTabs({ value, onChange }: MyPageTabsProps) {
  return (
    <View className="flex-row" style={{ height: 44 }}>
      {TABS.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`flex-1 items-center justify-center border-b ${
              selected
                ? "border-b-[1.5px] border-primary-strong"
                : "border-line-normal"
            }`}
            key={tab.key}
            onPress={() => onChange(tab.key)}
          >
            <ThemedText typography={selected ? "body-3-bold" : "body-3-medium"}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
