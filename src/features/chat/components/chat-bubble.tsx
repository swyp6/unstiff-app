import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import type { ChatMessage } from "@/features/chat/types";

import { ChatAvatar } from "./chat-avatar";

const BOT_AVATAR_SIZE = 36;
// Figma Bubble / User: max-w 252. 화면이 좁아도 row(화면 − 48) 안에서 줄어든다.
const USER_BUBBLE_MAX_WIDTH = 252;

// 봇 아바타 + 봇 말풍선 shell. 실제 답변뿐 아니라 질문 준비중/실패 안내/typing
// 점 애니메이션도 같은 껍데기 안에 그린다 — 말풍선 외형은 여기 한 벌뿐이다.
export function BotMessageRow({ children }: { children: ReactNode }) {
  return (
    <View style={[styles.row, styles.rowBot]}>
      <ChatAvatar size={BOT_AVATAR_SIZE} />
      {/* Android elevation shadows only draw for a rect/oval/uniform round-rect
          outline — bubbleAssistant's mixed corner radii (2/18/18/18, the Figma
          "tail") make Android skip the shadow entirely. Cast it from this
          uniform-radius wrapper instead; same background so the sliver where
          its corner is rounder than the bubble's stays invisible. */}
      <View style={styles.bubbleAssistantShadow}>
        <View style={[styles.bubble, styles.bubbleAssistant]}>{children}</View>
      </View>
    </View>
  );
}

export function BotBubbleText({ children }: { children: string }) {
  return (
    <ThemedText style={styles.textAssistant} typography="body-1-regular">
      {children}
    </ThemedText>
  );
}

type ChatBubbleProps = {
  message: ChatMessage;
};

export function ChatBubble({ message }: ChatBubbleProps) {
  if (message.role === "assistant") {
    return (
      <BotMessageRow>
        <BotBubbleText>{message.text}</BotBubbleText>
      </BotMessageRow>
    );
  }

  return (
    <View style={[styles.row, styles.rowUser]}>
      <View style={[styles.bubble, styles.bubbleUser]}>
        <ThemedText style={styles.textUser} typography="body-1-medium">
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
    paddingHorizontal: 24,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowBot: {
    justifyContent: "flex-start",
  },
  bubble: {
    flexShrink: 1,
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
  },
  bubbleAssistantShadow: {
    flexShrink: 1,
    backgroundColor: semanticColors["background-normal"],
    borderRadius: 18,
    elevation: 2,
  },
  bubbleUser: {
    backgroundColor: primitiveColors.orange["500"],
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 2,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxWidth: USER_BUBBLE_MAX_WIDTH,
  },
  textAssistant: {
    color: primitiveColors.charcoal["12"],
  },
  textUser: {
    color: semanticColors["label-inverse"],
  },
});
