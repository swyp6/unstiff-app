import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { AI_NAME } from "@/features/chat/constants";
import type { ChatMessage } from "@/features/chat/types";

import { ChatAvatar } from "./chat-avatar";

const BOT_AVATAR_SIZE = 28;
// 봇 말풍선을 아바타+이름 아래 이름 텍스트에 맞춰 들여쓰기(아바타 너비 + gap).
const BOT_BUBBLE_INDENT = BOT_AVATAR_SIZE + 8;

type ChatBubbleProps = {
  message: ChatMessage;
};

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <View style={[styles.column, isUser && styles.columnUser]}>
      {!isUser && (
        <View style={styles.botHeader}>
          <ChatAvatar size={BOT_AVATAR_SIZE} />
          <ThemedText style={styles.botName} typography="caption-1-medium">
            {AI_NAME}
          </ThemedText>
        </View>
      )}

      <View style={[styles.row, isUser ? styles.rowUser : styles.rowBot]}>
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
  botHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  botName: {
    color: semanticColors["label-subtle"],
  },
  row: {
    flexDirection: "row",
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowBot: {
    paddingLeft: BOT_BUBBLE_INDENT,
  },
  bubble: {
    maxWidth: "68%",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  bubbleAssistant: {
    backgroundColor: semanticColors["fill-normal"],
    borderColor: semanticColors["line-normal"],
    borderWidth: 1,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
  },
  bubbleUser: {
    backgroundColor: semanticColors["label-normal"],
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  textUser: {
    color: semanticColors["label-inverse"],
  },
});
