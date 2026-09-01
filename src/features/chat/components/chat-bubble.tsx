import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import type { ChatMessage } from "@/features/chat/types";

// 버튼/카드에 쓰이는 radius.default(10)보다 크게 잡은, 말풍선 전용 로컬 값.
const BUBBLE_RADIUS = 20;

type ChatBubbleProps = {
  message: ChatMessage;
  onSelectOption?: (text: string) => void;
};

export function ChatBubble({ message, onSelectOption }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <View style={[styles.column, isUser && styles.columnUser]}>
      <View style={[styles.row, isUser && styles.rowUser]}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          <ThemedText
            style={isUser && styles.textUser}
            typography="body-1-regular"
          >
            {message.text}
          </ThemedText>
        </View>
      </View>

      {message.mission && (
        <View style={styles.missionCard}>
          <ThemedText typography="body-2-bold" themeColor="text">
            {message.mission.title}
          </ThemedText>
          <ThemedText
            style={styles.missionDescription}
            typography="body-3-regular"
          >
            {message.mission.description}
          </ThemedText>
        </View>
      )}

      {!!message.options?.length && (
        <View style={styles.optionsRow}>
          {message.options.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              onPress={() => onSelectOption?.(option)}
              style={styles.optionChip}
            >
              <ThemedText typography="body-3-medium" themeColor="text">
                {option}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: 8,
    paddingHorizontal: 16,
  },
  columnUser: {
    alignItems: "flex-end",
  },
  row: {
    flexDirection: "row",
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  bubble: {
    borderRadius: BUBBLE_RADIUS,
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleAssistant: {
    backgroundColor: semanticColors["fill-normal"],
  },
  bubbleUser: {
    backgroundColor: semanticColors["accent-normal"],
  },
  textUser: {
    color: semanticColors["label-inverse"],
  },
  missionCard: {
    backgroundColor: semanticColors["accent-subtle"],
    borderRadius: 16,
    gap: 4,
    maxWidth: "78%",
    padding: 14,
  },
  missionDescription: {
    color: semanticColors["label-subtle"],
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: "90%",
  },
  optionChip: {
    backgroundColor: semanticColors["fill-subtle"],
    borderColor: semanticColors["line-normal"],
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
