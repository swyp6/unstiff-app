import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

export type MyPageTabKey = "streak" | "badge" | "activity";

const TABS: { key: MyPageTabKey; label: string }[] = [
  { key: "streak", label: "연속 기록" },
  { key: "badge", label: "획득한 뱃지" },
  { key: "activity", label: "활동 요약" },
];

type MyPageTabsProps = {
  active: MyPageTabKey;
  onChange: (key: MyPageTabKey) => void;
};

export function MyPageTabs({ active, onChange }: MyPageTabsProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <ThemedText
              themeColor="text"
              typography={isActive ? "body-3-bold" : "body-3-medium"}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: 44,
  },
  tab: {
    alignItems: "center",
    borderBottomColor: semanticColors["line-normal"],
    borderBottomWidth: 1,
    flex: 1,
    justifyContent: "center",
  },
  tabActive: {
    borderBottomColor: semanticColors["primary-strong"],
    borderBottomWidth: 1.5,
  },
});
