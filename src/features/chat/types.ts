// UI-facing message model used by the chat screen/store.
export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  options?: string[];
  // 이 메시지로 오늘 대화가 종료되었는지 — true면 이후 메시지를 보낼 수 없다.
  stop?: boolean;
};

// DTOs mirroring the AI 캐릭터 대화 API (see swagger: AiChat* schemas).
export type AiConversationType = "DAILY_DISCOVERY";
export type AiChatApiRole = "USER" | "ASSISTANT";

// POST /api/v1/chat/ai/send — message를 생략하면 오늘의 대화 시작을 요청하는 것으로
// 서버가 처리한다. 서버가 대화를 저장하므로 히스토리를 함께 보낼 필요는 없다.
export type AiChatSendRequest = {
  conversationType: AiConversationType;
  message?: string;
};

export type AiChatMessageResponse = {
  role: AiChatApiRole;
  content: string;
  options?: string[];
  stop: boolean;
  createdAt: string;
};

// POST /api/v1/chat/ai/enter
export type AiChatEnterResponse = {
  available: boolean;
};

// GET /api/v1/chat/ai/messages
export type CursorRequest = {
  cursor?: number;
  size?: number;
};

export type AiChatHistoryItem = {
  id: number;
  type: AiConversationType;
  role: AiChatApiRole;
  message: string;
  options?: string[];
  stop: boolean;
  createdAt: string;
};

export type CursorResponse<T> = {
  items: T[];
  nextCursor?: number;
  hasNext: boolean;
};
