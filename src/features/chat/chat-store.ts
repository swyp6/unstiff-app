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
  AiChatMessageResponse,
  AiConversationType,
  ChatMessage,
} from "@/features/chat/types";
import { useAuthStore } from "@/store/auth-store";

const CONVERSATION_TYPE: AiConversationType = "DAILY_DISCOVERY";
const HISTORY_PAGE_SIZE = 50;

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

// 과거 페이지를 앞에 붙인다. 서버 페이지는 오래된 순이고 cursor 페이지의 id는
// 모두 현재 것보다 작으므로 정렬은 그대로 두고, 이미 있는 id만 걸러낸다.
function prependHistory(older: ChatMessage[], current: ChatMessage[]) {
  const known = new Set(current.map((message) => message.id));
  const uniqueOlder = older.filter((message) => {
    if (known.has(message.id)) return false;
    known.add(message.id);
    return true;
  });
  return [...uniqueOlder, ...current];
}

function toAssistantMessage(response: AiChatMessageResponse) {
  return {
    ...createMessage("assistant", response.content, {
      options: response.options,
      stop: response.stop,
    }),
    createdAt: response.createdAt,
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

// 다시 시도할 수 있는 실패. 서버 history에 없는 일시 상태라 messages에 가짜
// assistant 메시지로 넣지 않고 따로 든다 — load는 질문/선택지(enter·history·첫
// 인사) 실패, send는 답변 저장 실패로 재전송할 원문을 함께 기억한다.
export type ChatFailure = { kind: "load" } | { kind: "send"; text: string };

type ChatState = {
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  canSend: boolean;
  failure: ChatFailure | null;
  // 과거 대화 cursor pagination. nextCursor는 서버가 준 마지막(가장 오래된)
  // 메시지 id, hasOlderHistory=false면 더 요청하지 않는다.
  nextCursor: number | null;
  hasOlderHistory: boolean;
  isLoadingOlderHistory: boolean;
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
  // 위로 스크롤해 목록 끝에 닿았을 때 — 이전 페이지를 messages 앞에 붙인다.
  loadOlderHistory: () => void;
  sendMessage: (text: string) => void;
  // failure 종류에 맞게 같은 요청을 실제로 다시 보낸다.
  retryFailure: () => void;
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
  failure: null as ChatFailure | null,
  nextCursor: null as number | null,
  hasOlderHistory: false,
  isLoadingOlderHistory: false,
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
  // 대화 조회 세대. 새 bootstrap과 reset(로그아웃)마다 올라가고, 진행 중이던
  // 비동기 흐름은 시작 시점의 세대를 들고 있다가 응답이 와도 세대가 바뀌었으면
  // store를 건드리지 않는다 — 이전 조회/계정의 늦은 응답이 현재 상태를 덮어쓰지
  // 못하게 한다. 요청 자체를 취소하는 대신 결과만 버린다.
  let sessionGeneration = 0;
  const isCurrent = (generation: number) => generation === sessionGeneration;

  // 동의가 확인된 뒤의 공통 bootstrap — 첫 진입과 동의 직후가 같은 코드를
  // 탄다. 히스토리 첫 페이지(최신)를 받고, 오늘 대화를 새로 시작해야 하면
  // (히스토리가 없거나 마지막 대화가 stop으로 끝났는데 available — 서버
  // resolveConversationId와 같은 기준) message 없이 보내 첫 인사를 요청한다.
  // 첫 인사까지 받은 뒤에야 messages를 채우므로 그동안은 "질문 준비중" 상태다.
  async function bootstrapConversation(available: boolean, generation: number) {
    let historyMessages: ChatMessage[];
    let page: { nextCursor: number | null; hasOlderHistory: boolean };
    try {
      const history = await fetchAiChatHistory(CONVERSATION_TYPE, {
        size: HISTORY_PAGE_SIZE,
      });
      if (!isCurrent(generation)) return;
      // 히스토리는 오래된 순(오름차순)으로 내려와 화면에 보여줄 순서와 같다.
      historyMessages = history.items.map(fromHistoryItem);
      page = {
        nextCursor: history.nextCursor ?? null,
        hasOlderHistory:
          history.hasNext &&
          history.nextCursor !== null &&
          history.nextCursor !== undefined,
      };
    } catch (error) {
      logChatError("loadConversation", error);
      if (!isCurrent(generation)) return;
      set({
        messages: [],
        failure: { kind: "load" },
        canSend: false,
        entryState: "ready",
        isLoading: false,
      });
      return;
    }

    const latest = historyMessages[historyMessages.length - 1];
    const needsGreeting = available && (!latest || latest.stop === true);
    if (!needsGreeting) {
      set({
        messages: historyMessages,
        ...page,
        canSend: available,
        entryState: "ready",
        isLoading: false,
      });
      return;
    }

    try {
      const response = await sendAiChatMessage({
        conversationType: CONVERSATION_TYPE,
      });
      if (!isCurrent(generation)) return;
      set({
        messages: [...historyMessages, toAssistantMessage(response)],
        ...page,
        canSend: !response.stop,
        entryState: "ready",
        isLoading: false,
      });
    } catch (error) {
      logChatError("loadConversation:start", error);
      if (!isCurrent(generation)) return;
      set({
        messages: [],
        failure: { kind: "load" },
        canSend: false,
        entryState: "ready",
        isLoading: false,
      });
    }
  }

  // 답변 전송과 재시도가 같이 쓰는 실제 POST /send. user bubble은 여기서 붙이지
  // 않는다 — 처음 보낼 때 한 번만 붙이고, 재시도는 같은 원문만 다시 보낸다
  // (서버도 실패한 user 메시지를 지우므로 재시도가 중복 저장되지 않는다).
  function submitMessage(text: string, generation: number) {
    set({ isTyping: true, failure: null });
    sendAiChatMessage({
      conversationType: CONVERSATION_TYPE,
      message: text,
    })
      .then((response) => {
        if (!isCurrent(generation)) return;
        set((state) => ({
          messages: [...state.messages, toAssistantMessage(response)],
          isTyping: false,
          canSend: !response.stop,
        }));
      })
      .catch((error) => {
        logChatError("sendMessage", error);
        if (!isCurrent(generation)) return;
        set({ isTyping: false, failure: { kind: "send", text } });
      });
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
      const { isLoading, isTyping, isConsenting } = get();
      if (isLoading || isTyping || isConsenting) return;
      // 새 첫 페이지 조회는 이전 bootstrap/pagination 결과를 모두 무효화한다.
      const generation = ++sessionGeneration;
      set({
        isLoading: true,
        consentDeclined: false,
        failure: null,
        nextCursor: null,
        hasOlderHistory: false,
        isLoadingOlderHistory: false,
      });

      enterAiChat(CONVERSATION_TYPE)
        .then((entry) => {
          if (!isCurrent(generation)) return;
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
          return bootstrapConversation(entry.available, generation);
        })
        .catch((error) => {
          logChatError("loadConversation:enter", error);
          if (!isCurrent(generation)) return;
          set({
            messages: [],
            failure: { kind: "load" },
            canSend: false,
            entryState: "ready",
            isLoading: false,
          });
        });
    },
    loadOlderHistory: () => {
      const { nextCursor, hasOlderHistory, isLoadingOlderHistory, isLoading } =
        get();
      if (!hasOlderHistory || nextCursor === null) return;
      // 같은 cursor로 겹쳐 요청하지 않고, 첫 페이지를 다시 받는 중에도 쉰다.
      if (isLoadingOlderHistory || isLoading) return;
      const generation = sessionGeneration;
      set({ isLoadingOlderHistory: true });

      fetchAiChatHistory(CONVERSATION_TYPE, {
        cursor: nextCursor,
        size: HISTORY_PAGE_SIZE,
      })
        .then((history) => {
          if (!isCurrent(generation)) return;
          const updatedCursor = history.nextCursor ?? null;
          set((state) => ({
            messages: prependHistory(
              history.items.map(fromHistoryItem),
              state.messages,
            ),
            nextCursor: updatedCursor,
            // 서버가 같은 cursor를 다시 주면 동일 페이지를 순차 반복 호출하지 않는다.
            hasOlderHistory:
              history.hasNext &&
              updatedCursor !== null &&
              updatedCursor !== nextCursor,
            isLoadingOlderHistory: false,
          }));
        })
        .catch((error) => {
          // 현재 보고 있는 대화는 그대로 두고, 다음에 다시 끝에 닿으면 재요청한다.
          logChatError("loadOlderHistory", error);
          if (!isCurrent(generation)) return;
          set({ isLoadingOlderHistory: false });
        });
    },
    sendMessage: (text) => {
      const trimmed = text.trim();
      if (!trimmed || get().isTyping || !get().canSend || get().failure) return;

      set((state) => ({
        messages: [...state.messages, createMessage("user", trimmed)],
      }));
      submitMessage(trimmed, sessionGeneration);
    },
    retryFailure: () => {
      const { failure, isLoading, isTyping } = get();
      if (!failure || isLoading || isTyping) return;
      if (failure.kind === "load") {
        get().loadConversation();
        return;
      }
      submitMessage(failure.text, sessionGeneration);
    },
    agreeToExternalAi: async () => {
      // 두 번 눌러도 POST /terms/agreements가 한 번만 나가도록 잠근다. 성공
      // 경로에서는 bootstrap까지 끝난 뒤(finally) 풀리는데, 그때는 이미
      // entryState가 ready라 모달이 사라진 상태다.
      if (get().isConsenting) return false;
      const generation = sessionGeneration;
      set({ isConsenting: true });
      try {
        // 약관 ID는 GET /terms가 source of truth — 하드코딩하지 않는다. 모달이
        // 이미 받아둔 약관이 있으면 그대로 쓰고(중복 GET 방지), 없을 때만
        // 다시 조회한다.
        const externalAiTerm =
          get().externalAiTerm ?? findExternalAiTerm((await getTerms()).terms);
        if (!isCurrent(generation)) return false;
        if (!externalAiTerm) {
          throw new Error("EXTERNAL_AI term is missing from GET /api/v1/terms");
        }
        // 서버 계약(TermsResponse.from)상 agreed는 "현재 버전에 동의"이고
        // reagreementRequired는 항상 !agreed와 같이 움직이므로, 재동의가 필요한
        // 개정 약관도 이 분기에서 다시 POST된다.
        if (!externalAiTerm.agreed) {
          await agreeToTerms([externalAiTerm.id]);
          if (!isCurrent(generation)) return false;
        }
        // 동의 POST가 성공했어도 enter 응답이 최종 판단이다 — 서버가 아직
        // 미동의라고 하면 모달을 유지한다.
        const entry = await enterAiChat(CONVERSATION_TYPE);
        if (!isCurrent(generation)) return false;
        if (!entry.externalAiAgreed) {
          throw new Error("server still reports externalAiAgreed=false");
        }
        set({ entryState: "ready", isLoading: true });
        await bootstrapConversation(entry.available, generation);
        return true;
      } catch (error) {
        logChatError("agreeToExternalAi", error);
        return false;
      } finally {
        // 로그아웃으로 세대가 바뀐 뒤 늦게 끝난 요청이 다음 계정의 잠금을
        // 풀어버리지 않게 한다 — reset()이 이미 false로 돌려놓았다.
        if (isCurrent(generation)) set({ isConsenting: false });
      }
    },
    declineExternalAi: () => {
      set({ consentDeclined: true, canSend: false });
    },
    reset: () => {
      sessionGeneration += 1;
      termRequestId += 1;
      set(INITIAL_STATE);
    },
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
