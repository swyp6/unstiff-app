import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { ExternalAiConsentModal } from "@/features/chat/components/external-ai-consent-modal";
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
  const entryState = useChatStore((state) => state.entryState);
  const consentDeclined = useChatStore((state) => state.consentDeclined);
  const isConsenting = useChatStore((state) => state.isConsenting);
  const loadConversation = useChatStore((state) => state.loadConversation);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const agreeToExternalAi = useChatStore((state) => state.agreeToExternalAi);
  const declineExternalAi = useChatStore((state) => state.declineExternalAi);
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

  // 서버 동의가 끝나야만 store가 모달을 닫고 채팅을 시작한다. 실패하면 모달은
  // 그대로 남고(재시도 가능) 약관 화면과 같은 문구로 알린다.
  async function handleAgree() {
    const agreed = await agreeToExternalAi();
    if (!agreed) {
      Alert.alert("오류", "약관 동의 처리 중 문제가 발생했습니다.");
    }
  }

  // "거부하기"(Android 뒤로가기 포함) — 서버 동의 상태는 그대로 두고 미동의
  // 채팅 화면에 남지 않도록 홈으로 보낸다. replace라 뒤로가기로 이 화면에
  // 되돌아오지 않고, 다음에 채팅 탭에 들어오면 loadConversation이 서버
  // 상태를 다시 확인해 여전히 미동의면 모달을 다시 띄운다.
  function handleDecline() {
    declineExternalAi();
    router.replace("/home");
  }

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
      <ExternalAiConsentModal
        isSubmitting={isConsenting}
        onAgree={handleAgree}
        onDecline={handleDecline}
        visible={entryState === "consent-required" && !consentDeclined}
      />
    </ThemedView>
  );
}
