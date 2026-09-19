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
  // AI 콘텐츠 신고(AiContentComplaintRequest.refId)로 쓰는 실제 메시지 식별자.
  id: number;
  role: AiChatApiRole;
  content: string;
  options?: string[];
  stop: boolean;
  createdAt: string;
};

// POST /api/v1/chat/ai/enter — available(오늘 더 보낼 수 있는지)과
// externalAiAgreed(외부 AI 개인정보 처리 약관 동의 여부)는 별개의 상태다.
// 미동의면 available과 무관하게 채팅을 시작할 수 없고 동의 UI를 먼저 거친다.
export type AiChatEnterResponse = {
  available: boolean;
  externalAiAgreed: boolean;
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
