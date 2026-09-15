import { isAxiosError } from "axios";
import { create } from "zustand";

import { agreeToTerms, getTerms } from "@/features/auth/api";
import type { Term } from "@/features/auth/types";
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
import { useAuthStore } from "@/store/auth-store";

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

// 채팅 진입 단계. enter 응답의 externalAiAgreed가 gate다 — false면 오늘 대화
// 가능 여부(available)와 무관하게 동의 UI를 먼저 보여주고 채팅 bootstrap을
// 하지 않는다. true일 때만 히스토리 조회/첫 인사로 이어진다.
export type ChatEntryState = "loading" | "consent-required" | "ready";

type ChatState = {
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  canSend: boolean;
  entryState: ChatEntryState;
  // "거부하기"로 동의 모달을 닫았는지. 이번 진입에만 유효하고 다음
  // loadConversation(포커스 재진입)에서 서버 상태를 다시 물어보며 리셋된다 —
  // 미동의 사실을 로컬에 영구 저장해 우회하지 않는다.
  consentDeclined: boolean;
  isConsenting: boolean;
  // 동의 모달이 보여줄 EXTERNAL_AI 약관(GET /terms). undefined: 아직 조회
  // 전/중, null: 서버 응답에 EXTERNAL_AI가 없음. 같은 객체를 CTA의 동의
  // POST에도 써서 한 화면 진입에 GET /terms가 한 번만 나간다.
  externalAiTerm: Term | null | undefined;
  externalAiTermError: boolean;
  loadExternalAiTerm: () => void;
  loadConversation: () => void;
  sendMessage: (text: string) => void;
  // 실제 EXTERNAL_AI 약관 동의(POST /terms/agreements) → enter 재확인까지
  // 서버에서 성공했을 때만 true. 성공 시 정상 채팅 bootstrap까지 마친다.
  agreeToExternalAi: () => Promise<boolean>;
  declineExternalAi: () => void;
  reset: () => void;
};

const INITIAL_STATE = {
  messages: [] as ChatMessage[],
  isLoading: false,
  isTyping: false,
  canSend: true,
  entryState: "loading" as ChatEntryState,
  consentDeclined: false,
  isConsenting: false,
  externalAiTerm: undefined as Term | null | undefined,
  externalAiTermError: false,
};

function findExternalAiTerm(terms: Term[]) {
  return terms.find((term) => term.type === "EXTERNAL_AI") ?? null;
}

// 목업이 아닌 실제 채팅 API(POST /api/v1/chat/ai/enter, /send, GET /messages)를
// 호출한다. 서버가 대화를 저장하므로 전송할 때는 새 메시지 하나만 보내면 되고,
// 화면에 보여줄 과거 대화는 진입 시 별도로 조회한다.
export const useChatStore = create<ChatState>()((set, get) => {
  // 동의가 확인된 뒤의 공통 bootstrap — 첫 진입과 동의 직후가 같은 코드를
  // 탄다. 히스토리가 있으면 그대로 보여주고, 없는데 오늘 대화가 가능하면
  // message 없이 보내 첫 인사를 요청하고, 불가능하면 오늘 대화 종료 상태.
  async function bootstrapConversation(available: boolean) {
    try {
      const history = await fetchAiChatHistory(CONVERSATION_TYPE, {
        size: HISTORY_PAGE_SIZE,
      });
      // 히스토리는 오래된 순(오름차순)으로 내려와 화면에 보여줄 순서와 같다.
      const historyMessages = history.items.map(fromHistoryItem);

      if (historyMessages.length > 0) {
        set({
          messages: historyMessages,
          canSend: available,
          entryState: "ready",
          isLoading: false,
        });
        return;
      }

      if (!available) {
        set({
          messages: [],
          canSend: false,
          entryState: "ready",
          isLoading: false,
        });
        return;
      }
    } catch (error) {
      logChatError("loadConversation", error);
      set({
        messages: [createMessage("assistant", LOAD_FAILED_MESSAGE)],
        canSend: false,
        entryState: "ready",
        isLoading: false,
      });
      return;
    }

    try {
      const response = await sendAiChatMessage({
        conversationType: CONVERSATION_TYPE,
      });
      set({
        messages: [
          createMessage("assistant", response.content, {
            options: response.options,
            stop: response.stop,
          }),
        ],
        canSend: !response.stop,
        entryState: "ready",
        isLoading: false,
      });
    } catch (error) {
      logChatError("loadConversation:start", error);
      set({
        messages: [createMessage("assistant", LOAD_FAILED_MESSAGE)],
        canSend: false,
        entryState: "ready",
        isLoading: false,
      });
    }
  }

  // 가장 최근 조회만 반영하기 위한 순번 — 모달이 닫힌 뒤 늦게 온 응답이나
  // 재시도 중 겹친 응답이 서로 덮지 않게 한다.
  let termRequestId = 0;

  return {
    ...INITIAL_STATE,
    loadExternalAiTerm: () => {
      const requestId = ++termRequestId;
      set({ externalAiTerm: undefined, externalAiTermError: false });
      getTerms()
        .then(({ terms }) => {
          if (requestId !== termRequestId) return;
          set({ externalAiTerm: findExternalAiTerm(terms) });
        })
        .catch((error) => {
          logChatError("loadExternalAiTerm", error);
          if (requestId !== termRequestId) return;
          set({ externalAiTermError: true });
        });
    },
    loadConversation: () => {
      if (get().isLoading) return;
      set({ isLoading: true, consentDeclined: false });

      enterAiChat(CONVERSATION_TYPE)
        .then((entry) => {
          if (!entry.externalAiAgreed) {
            set({
              messages: [],
              canSend: false,
              entryState: "consent-required",
              isLoading: false,
            });
            // 모달 본문(contentUrl)과 동의 POST(id)가 같이 쓸 약관을 한 번 조회.
            get().loadExternalAiTerm();
            return;
          }
          return bootstrapConversation(entry.available);
        })
        .catch((error) => {
          logChatError("loadConversation:enter", error);
          set({
            messages: [createMessage("assistant", LOAD_FAILED_MESSAGE)],
            canSend: false,
            entryState: "ready",
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
    agreeToExternalAi: async () => {
      // 두 번 눌러도 POST /terms/agreements가 한 번만 나가도록 잠근다. 성공
      // 경로에서는 bootstrap까지 끝난 뒤(finally) 풀리는데, 그때는 이미
      // entryState가 ready라 모달이 사라진 상태다.
      if (get().isConsenting) return false;
      set({ isConsenting: true });
      try {
        // 약관 ID는 GET /terms가 source of truth — 하드코딩하지 않는다. 모달이
        // 이미 받아둔 약관이 있으면 그대로 쓰고(중복 GET 방지), 없을 때만
        // 다시 조회한다.
        const externalAiTerm =
          get().externalAiTerm ?? findExternalAiTerm((await getTerms()).terms);
        if (!externalAiTerm) {
          throw new Error("EXTERNAL_AI term is missing from GET /api/v1/terms");
        }
        if (!externalAiTerm.agreed) {
          await agreeToTerms([externalAiTerm.id]);
        }
        // 동의 POST가 성공했어도 enter 응답이 최종 판단이다 — 서버가 아직
        // 미동의라고 하면 모달을 유지한다.
        const entry = await enterAiChat(CONVERSATION_TYPE);
        if (!entry.externalAiAgreed) {
          throw new Error("server still reports externalAiAgreed=false");
        }
        set({ entryState: "ready", isLoading: true });
        await bootstrapConversation(entry.available);
        return true;
      } catch (error) {
        logChatError("agreeToExternalAi", error);
        return false;
      } finally {
        set({ isConsenting: false });
      }
    },
    declineExternalAi: () => {
      set({ consentDeclined: true, canSend: false });
    },
    reset: () => set(INITIAL_STATE),
  };
});

// 로그아웃하면 이전 계정의 대화/동의 상태가 다음 로그인 화면에 잠깐 보이지
// 않도록 비운다. 토큰이 null이 될 때만 — 서버가 토큰을 재발급해 값이 바뀌는
// 경우는 같은 계정이라 유지한다.
useAuthStore.subscribe((state, previous) => {
  if (previous.accessToken && !state.accessToken) {
    useChatStore.getState().reset();
  }
});
