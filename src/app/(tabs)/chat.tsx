import { useEffect, useRef } from "react";
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

// 오늘 오후 3:27 형태의 AppBar 부제목 — 대화는 항상 오늘 하루 단위이므로 날짜는
// 별도로 비교하지 않고 시각만 포맷한다.
function formatSubtitle(iso: string) {
  const time = new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
  return `오늘 ${time}`;
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

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

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
              data={messages}
              keyExtractor={(item) => item.id}
              ListFooterComponent={isTyping ? <TypingIndicator /> : null}
              ListHeaderComponent={
                messages.length > 0 ? <ChatDateDivider label="오늘" /> : null
              }
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: true })
              }
              renderItem={({ item }) => <ChatBubble message={item} />}
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
