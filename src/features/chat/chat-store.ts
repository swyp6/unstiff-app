import { isAxiosError } from "axios";
import { create } from "zustand";

import {
  enterAiChat,
  fetchAiChatHistory,
  sendAiChatMessage,
} from "@/features/chat/api";
import type {
  AiChatHistoryItem,
  AiConversationType,
  ChatMessage,
} from "@/features/chat/types";

const CONVERSATION_TYPE: AiConversationType = "DAILY_DISCOVERY";
const HISTORY_PAGE_SIZE = 50;

const SEND_FAILED_MESSAGE =
  "메시지를 보내는 데 문제가 생겼어. 잠시 후 다시 시도해줄래?";
const LOAD_FAILED_MESSAGE =
  "대화를 불러오는 데 문제가 생겼어. 잠시 후 다시 시도해줄래?";

function createMessage(
  role: ChatMessage["role"],
  text: string,
  extra?: Pick<ChatMessage, "options" | "stop">,
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

function fromHistoryItem(item: AiChatHistoryItem): ChatMessage {
  return {
    id: String(item.id),
    role: item.role === "USER" ? "user" : "assistant",
    text: item.message,
    createdAt: item.createdAt,
    options: item.options,
    stop: item.stop,
  };
}

function logChatError(context: string, error: unknown) {
  if (isAxiosError(error)) {
    console.log(`[chat:${context}] status:`, error.response?.status);
    console.log(`[chat:${context}] data:`, error.response?.data);
  }
  console.error(`[chat:${context}] failed`, error);
}

type ChatState = {
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  canSend: boolean;
  loadConversation: () => void;
  sendMessage: (text: string) => void;
};

// 목업이 아닌 실제 채팅 API(POST /api/v1/chat/ai/enter, /send, GET /messages)를
// 호출한다. 서버가 대화를 저장하므로 전송할 때는 새 메시지 하나만 보내면 되고,
// 화면에 보여줄 과거 대화는 진입 시 별도로 조회한다.
export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  isLoading: false,
  isTyping: false,
  canSend: true,
  loadConversation: () => {
    if (get().isLoading) return;
    set({ isLoading: true });

    Promise.all([
      enterAiChat(CONVERSATION_TYPE),
      fetchAiChatHistory(CONVERSATION_TYPE, { size: HISTORY_PAGE_SIZE }),
    ])
      .then(([{ available }, history]) => {
        // 히스토리는 최신순으로 내려오므로 화면에 보여줄 때는 뒤집는다.
        const historyMessages = [...history.items]
          .reverse()
          .map(fromHistoryItem);

        if (historyMessages.length > 0) {
          const lastMessage = historyMessages[historyMessages.length - 1];
          set({
            messages: historyMessages,
            canSend: available && !lastMessage.stop,
            isLoading: false,
          });
          return;
        }

        if (!available) {
          set({ messages: [], canSend: false, isLoading: false });
          return;
        }

        // 오늘 대화 기록이 없으면 message 없이 보내 대화 시작(첫 인사)을 요청한다.
        sendAiChatMessage({ conversationType: CONVERSATION_TYPE })
          .then((response) => {
            set({
              messages: [
                createMessage("assistant", response.content, {
                  options: response.options,
                  stop: response.stop,
                }),
              ],
              canSend: !response.stop,
              isLoading: false,
            });
          })
          .catch((error) => {
            logChatError("loadConversation:start", error);
            set({
              messages: [createMessage("assistant", LOAD_FAILED_MESSAGE)],
              canSend: false,
              isLoading: false,
            });
          });
      })
      .catch((error) => {
        logChatError("loadConversation", error);
        set({
          messages: [createMessage("assistant", LOAD_FAILED_MESSAGE)],
          canSend: false,
          isLoading: false,
        });
      });
  },
  sendMessage: (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().isTyping || !get().canSend) return;

    const userMessage = createMessage("user", trimmed);

    set((state) => ({
      messages: [...state.messages, userMessage],
      isTyping: true,
    }));

    sendAiChatMessage({
      conversationType: CONVERSATION_TYPE,
      message: trimmed,
    })
      .then((response) => {
        set((state) => ({
          messages: [
            ...state.messages,
            createMessage("assistant", response.content, {
              options: response.options,
              stop: response.stop,
            }),
          ],
          isTyping: false,
          canSend: !response.stop,
        }));
      })
      .catch((error) => {
        logChatError("sendMessage", error);
        set((state) => ({
          messages: [
            ...state.messages,
            createMessage("assistant", SEND_FAILED_MESSAGE),
          ],
          isTyping: false,
        }));
      });
  },
}));
