import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import type { ChatMessage } from "@/features/chat/types";

// 버튼/카드에 쓰이는 radius.default(10)보다 크게 잡은, 말풍선 전용 로컬 값.
const BUBBLE_RADIUS = 20;

type ChatBubbleProps = {
  message: ChatMessage;
};

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
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
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
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
});
