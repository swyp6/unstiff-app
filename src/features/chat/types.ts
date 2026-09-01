// UI-facing message model used by the chat screen/store.
export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  mission?: AiChatMissionPayload;
  options?: string[];
};

// DTOs mirroring POST /api/v1/chat/ai/send (see swagger: AiChat* schemas).
export type AiConversationType = "DAILY_MISSION" | "DAILY_DISCOVERY";
export type AiChatApiRole = "USER" | "ASSISTANT";

export type AiChatMessageItem = {
  role: AiChatApiRole;
  content: string;
};

export type AiChatSendRequest = {
  conversationType: AiConversationType;
  personalizationContext?: string;
  messages: AiChatMessageItem[];
};

export type AiChatMissionPayload = {
  title: string;
  description: string;
};

export type AiChatMessageResponse = {
  role: AiChatApiRole;
  content: string;
  mission?: AiChatMissionPayload;
  options?: string[];
  createdAt: string;
};
