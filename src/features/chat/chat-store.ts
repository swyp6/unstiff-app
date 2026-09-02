import { isAxiosError } from "axios";
import { create } from "zustand";

import { sendAiChatMessage } from "@/features/chat/api";
import { INITIAL_GREETING } from "@/features/chat/constants";
import type { AiChatMessageItem, ChatMessage } from "@/features/chat/types";

const CONVERSATION_TYPE = "DAILY_DISCOVERY" as const;
const MAX_HISTORY_MESSAGES = 50;

const SEND_FAILED_MESSAGE =
  "메시지를 보내는 데 문제가 생겼어. 잠시 후 다시 시도해줄래?";

function createMessage(
  role: ChatMessage["role"],
  text: string,
  extra?: Pick<ChatMessage, "mission" | "options" | "excludeFromHistory">,
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

// SEND_FAILED_MESSAGE 같은 로컬 전용 안내 메시지는 excludeFromHistory로 표시해
// 다음 요청의 API history에서 제외한다 — 그렇지 않으면 AI가 이 문구를 자신의
// 이전 응답으로 착각할 수 있다.
function toApiMessages(messages: ChatMessage[]): AiChatMessageItem[] {
  return messages
    .filter((message) => !message.excludeFromHistory)
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role === "user" ? "USER" : "ASSISTANT",
      content: message.text,
    }));
}

type ChatState = {
  messages: ChatMessage[];
  isTyping: boolean;
  sendMessage: (text: string) => void;
};

// 목업이 아닌 실제 채팅 API(POST /api/v1/chat/ai/send)를 호출한다. 서버가 대화를
// 저장하지 않으므로(세션/대화 id 없음) 매 요청마다 지금까지의 메시지 전체를 함께 보낸다.
export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [createMessage("assistant", INITIAL_GREETING)],
  isTyping: false,
  sendMessage: (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().isTyping) return;

    const userMessage = createMessage("user", trimmed);
    const historyForRequest = [...get().messages, userMessage];

    set((state) => ({
      messages: [...state.messages, userMessage],
      isTyping: true,
    }));

    sendAiChatMessage({
      conversationType: CONVERSATION_TYPE,
      messages: toApiMessages(historyForRequest),
    })
      .then((response) => {
        set((state) => ({
          messages: [
            ...state.messages,
            createMessage("assistant", response.content, {
              mission: response.mission,
              options: response.options,
            }),
          ],
          isTyping: false,
        }));
      })
      .catch((error) => {
        if (isAxiosError(error)) {
          console.log("status:", error.response?.status);
          console.log("data:", error.response?.data);
          console.log("request:", error.config?.data);
        }
        console.error("[chat] sendAiChatMessage failed", error);
        set((state) => ({
          messages: [
            ...state.messages,
            createMessage("assistant", SEND_FAILED_MESSAGE, {
              excludeFromHistory: true,
            }),
          ],
          isTyping: false,
        }));
      });
  },
}));
