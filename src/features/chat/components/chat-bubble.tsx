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
      <View style={[styles.bubble, styles.bubbleAssistant]}>{children}</View>
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
  // boxShadow(CSS Box Shadow, RN 0.80+)는 iOS shadow*/Android elevation과 달리
  // 두 플랫폼에서 대칭으로 그려지고 mixed corner radii(2/18/18/18, Figma
  // "tail")도 그대로 따라간다 — elevation 전용 uniform-radius wrapper가
  // 더 필요 없다.
  bubbleAssistant: {
    backgroundColor: semanticColors["background-normal"],
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.04)",
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
