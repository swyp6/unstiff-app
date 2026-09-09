import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import type { ChatMessage } from "@/features/chat/types";

import { ChatAvatar } from "./chat-avatar";

const BOT_AVATAR_SIZE = 36;

type ChatBubbleProps = {
  message: ChatMessage;
};

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowBot]}>
      {!isUser && <ChatAvatar size={BOT_AVATAR_SIZE} />}
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
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowBot: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "68%",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  bubbleAssistant: {
    backgroundColor: semanticColors["background-normal"],
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleUser: {
    backgroundColor: primitiveColors.orange["500"],
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 2,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  textUser: {
    color: semanticColors["label-inverse"],
  },
});
