import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";
import { semanticColors } from "@/constants/tokens";
import { ChatBubble } from "@/features/chat/components/chat-bubble";
import { ChatDateDivider } from "@/features/chat/components/chat-date-divider";
import { ChatHeader } from "@/features/chat/components/chat-header";
import { ChatInputBar } from "@/features/chat/components/chat-input-bar";
import { ChatOptionsBar } from "@/features/chat/components/chat-options-bar";
import { TypingIndicator } from "@/features/chat/components/typing-indicator";
import { useChatStore } from "@/features/chat/chat-store";
import type { ChatMessage } from "@/features/chat/types";

// 날짜 구분선/부제목에 쓰는 라벨 — 오늘/어제는 고정 문구, 그 전은 실제 날짜.
function getDayLabel(date: Date) {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / 86_400_000,
  );
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  return new Intl.DateTimeFormat("ko-KR", {
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatSubtitle(iso: string) {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${getDayLabel(date)} ${time}`;
}

type ChatRow =
  | { key: string; type: "divider"; label: string }
  | { key: string; type: "message"; message: ChatMessage };

// 메시지를 날짜(로컬 자정 기준)별로 묶어, 날짜가 바뀔 때마다 구분선을 끼워 넣는다.
function toRows(messages: ChatMessage[]): ChatRow[] {
  const rows: ChatRow[] = [];
  let lastDayKey: string | null = null;

  for (const message of messages) {
    const date = new Date(message.createdAt);
    const dayKey = date.toDateString();
    if (dayKey !== lastDayKey) {
      rows.push({
        key: `divider-${dayKey}`,
        type: "divider",
        label: getDayLabel(date),
      });
      lastDayKey = dayKey;
    }
    rows.push({ key: message.id, type: "message", message });
  }

  return rows;
}

export default function ChatScreen() {
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const isTyping = useChatStore((state) => state.isTyping);
  const canSend = useChatStore((state) => state.canSend);
  const loadConversation = useChatStore((state) => state.loadConversation);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const listRef = useRef<FlatList>(null);
  const lastMessage = messages[messages.length - 1];
  const rows = useMemo(() => toRows(messages), [messages]);

  useFocusEffect(
    useCallback(() => {
      loadConversation();
    }, [loadConversation]),
  );

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, isTyping]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        <ChatHeader
          subtitle={
            lastMessage ? formatSubtitle(lastMessage.createdAt) : undefined
          }
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          {isLoading && messages.length === 0 ? (
            <ThemedView
              style={{
                alignItems: "center",
                flex: 1,
                justifyContent: "center",
              }}
            >
              <ActivityIndicator color={semanticColors["label-normal"]} />
            </ThemedView>
          ) : (
            <FlatList
              ref={listRef}
              contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
              data={rows}
              keyExtractor={(row) => row.key}
              ListFooterComponent={isTyping ? <TypingIndicator /> : null}
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: true })
              }
              renderItem={({ item }) =>
                item.type === "divider" ? (
                  <ChatDateDivider label={item.label} />
                ) : (
                  <ChatBubble message={item.message} />
                )
              }
              style={{ flex: 1 }}
            />
          )}
          {!isTyping &&
            lastMessage?.role === "assistant" &&
            !!lastMessage.options?.length && (
              <ChatOptionsBar
                disabled={!canSend}
                options={lastMessage.options}
                onSelect={sendMessage}
              />
            )}
          <ChatInputBar disabled={isTyping || !canSend} onSend={sendMessage} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
