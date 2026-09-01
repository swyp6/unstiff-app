import { useEffect, useRef } from "react";
import { FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";
import { ChatBubble } from "@/features/chat/components/chat-bubble";
import { ChatHeader } from "@/features/chat/components/chat-header";
import { ChatInputBar } from "@/features/chat/components/chat-input-bar";
import { TypingIndicator } from "@/features/chat/components/typing-indicator";
import { useChatStore } from "@/features/chat/chat-store";

export default function ChatScreen() {
  const messages = useChatStore((state) => state.messages);
  const isTyping = useChatStore((state) => state.isTyping);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, isTyping]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        <ChatHeader />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <FlatList
            ref={listRef}
            contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
            data={messages}
            keyExtractor={(item) => item.id}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
            renderItem={({ item }) => <ChatBubble message={item} />}
            style={{ flex: 1 }}
          />
          <ChatInputBar onSend={sendMessage} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
