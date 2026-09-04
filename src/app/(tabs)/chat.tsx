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
import { ChatHeader } from "@/features/chat/components/chat-header";
import { ChatInputBar } from "@/features/chat/components/chat-input-bar";
import { TypingIndicator } from "@/features/chat/components/typing-indicator";
import { useChatStore } from "@/features/chat/chat-store";

export default function ChatScreen() {
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const isTyping = useChatStore((state) => state.isTyping);
  const canSend = useChatStore((state) => state.canSend);
  const loadConversation = useChatStore((state) => state.loadConversation);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

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
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: true })
              }
              renderItem={({ item }) => (
                <ChatBubble
                  message={item}
                  onSelectOption={sendMessage}
                  optionsDisabled={isTyping || !canSend}
                />
              )}
              style={{ flex: 1 }}
            />
          )}
          <ChatInputBar disabled={isTyping || !canSend} onSend={sendMessage} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
