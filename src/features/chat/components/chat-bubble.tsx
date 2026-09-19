import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import type { ChatMessage } from "@/features/chat/types";

import { AiContentReportMenu } from "./ai-content-report-menu";
import { AiContentReportSheet } from "./ai-content-report-sheet";
import { ChatAvatar } from "./chat-avatar";

const BOT_AVATAR_SIZE = 36;
// Figma Bubble / User: max-w 252. 화면이 좁아도 row(화면 − 48) 안에서 줄어든다.
const USER_BUBBLE_MAX_WIDTH = 252;

// 봇 아바타 + 봇 말풍선 shell. 실제 답변뿐 아니라 질문 준비중/실패 안내/typing
// 점 애니메이션도 같은 껍데기 안에 그린다 — 말풍선 외형은 여기 한 벌뿐이다.
// trailing(신고 더보기 버튼)은 실제 답변(ChatBubble)에서만 넘기고, 나머지
// 상태는 기존처럼 안 넘겨 그대로 둔다.
export function BotMessageRow({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <View style={[styles.row, styles.rowBot]}>
      <ChatAvatar size={BOT_AVATAR_SIZE} />
      <View style={[styles.bubble, styles.bubbleAssistant]}>{children}</View>
      {trailing}
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
  // 신고 접수 성공 시 화면 레벨(chat.tsx)에 토스트를 띄우라고 알린다 — 이
  // 행은 FlatList 안에서 스크롤에 따라 사라질 수 있어 토스트 자체를 여기서
  // 그리지 않는다.
  onReported?: () => void;
};

export function ChatBubble({ message, onReported }: ChatBubbleProps) {
  const [menuTop, setMenuTop] = useState<number | null>(null);
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);

  if (message.role === "assistant") {
    const messageId = Number(message.id);
    const canReport = Number.isFinite(messageId);
    return (
      <>
        <BotMessageRow
          trailing={
            canReport ? (
              <Pressable
                accessibilityLabel="더보기"
                accessibilityRole="button"
                hitSlop={8}
                onPress={(event) => setMenuTop(event.nativeEvent.pageY - 16)}
                style={styles.moreButton}
              >
                <Ionicons
                  color={semanticColors["label-disabled"]}
                  name="ellipsis-vertical"
                  size={16}
                />
              </Pressable>
            ) : undefined
          }
        >
          <BotBubbleText>{message.text}</BotBubbleText>
        </BotMessageRow>
        {canReport && (
          <>
            <AiContentReportMenu
              onClose={() => setMenuTop(null)}
              onSelectReport={() => setIsReportSheetOpen(true)}
              top={menuTop ?? 0}
              visible={menuTop !== null}
            />
            <AiContentReportSheet
              messageId={messageId}
              onClose={() => setIsReportSheetOpen(false)}
              onReported={() => {
                setIsReportSheetOpen(false);
                onReported?.();
              }}
              visible={isReportSheetOpen}
            />
          </>
        )}
      </>
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
  moreButton: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24,
  },
});
