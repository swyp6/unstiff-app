import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

type ChatOptionsBarProps = {
  options: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
};

// 최신 봇 질문에 대한 선택지 — 메시지에 딸린 요소가 아니라 입력창 위에 떠 있는
// 별도의 액션 바로, 다음 메시지가 오면 사라진다.
export function ChatOptionsBar({
  options,
  onSelect,
  disabled,
}: ChatOptionsBarProps) {
  return (
    <View style={styles.row}>
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onSelect(option)}
          style={[styles.chip, disabled && styles.chipDisabled]}
        >
          <ThemedText typography="body-2-medium">{option}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  chip: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-strong"],
    borderRadius: 80,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  chipDisabled: {
    opacity: 0.4,
  },
});
