import { Pressable, ScrollView, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";

type ChatOptionsBarProps = {
  options: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
};

// 최신 봇 질문에 대한 선택지(Figma Chat / Quick Replies) — 메시지에 딸린 요소가
// 아니라 입력창 위에 떠 있는 별도의 액션 바로, 다음 메시지가 오면 사라진다.
// Figma는 chip을 한 줄로 가운데 배치한다(gap 12). 질문당 2~4개라 보통 한 줄에
// 들어가고, 넘치면 줄바꿈 대신 가로 스크롤로 같은 한 줄을 유지한다.
export function ChatOptionsBar({
  options,
  onSelect,
  disabled,
}: ChatOptionsBarProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
    >
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onSelect(option)}
          style={[styles.chip, disabled && styles.chipDisabled]}
        >
          <ThemedText style={styles.chipLabel} typography="body-2-medium">
            {option}
          </ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexGrow: 1,
    gap: 12,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  chip: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-strong"],
    borderRadius: 12,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipLabel: {
    color: primitiveColors.charcoal["12"],
  },
});
