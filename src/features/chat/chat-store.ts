import { create } from "zustand";

import {
  INITIAL_GREETING,
  MOCK_REPLIES,
  TYPING_DELAY_MAX_MS,
  TYPING_DELAY_MIN_MS,
} from "@/features/chat/constants";
import type { ChatMessage } from "@/features/chat/types";

function createMessage(role: ChatMessage["role"], text: string): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    createdAt: new Date().toISOString(),
  };
}

function randomTypingDelay() {
  return (
    TYPING_DELAY_MIN_MS +
    Math.random() * (TYPING_DELAY_MAX_MS - TYPING_DELAY_MIN_MS)
  );
}

type ChatState = {
  messages: ChatMessage[];
  isTyping: boolean;
  sendMessage: (text: string) => void;
};

// 목업 상태라 영속화하지 않는다 — 실제 채팅 API가 붙으면 이 store는
// 서버 히스토리를 불러오는 방식으로 통째로 교체될 예정.
export const useChatStore = create<ChatState>()((set) => ({
  messages: [createMessage("assistant", INITIAL_GREETING)],
  isTyping: false,
  sendMessage: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    set((state) => ({
      messages: [...state.messages, createMessage("user", trimmed)],
      isTyping: true,
    }));

    setTimeout(() => {
      const reply =
        MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
      set((state) => ({
        messages: [...state.messages, createMessage("assistant", reply)],
        isTyping: false,
      }));
    }, randomTypingDelay());
  },
}));
