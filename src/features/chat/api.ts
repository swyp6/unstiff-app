import { apiClient } from "@/lib/api-client";

import type {
  AiChatEnterResponse,
  AiChatHistoryItem,
  AiChatMessageResponse,
  AiChatSendRequest,
  AiConversationType,
  CursorRequest,
  CursorResponse,
} from "./types";

// 대화방에 처음 입장했을 때 호출한다 — 오늘 메시지를 더 보낼 수 있는지(available) 확인.
export async function enterAiChat(conversationType: AiConversationType) {
  const { data } = await apiClient.post<AiChatEnterResponse>(
    "/api/v1/chat/ai/enter",
    null,
    { params: { conversationType } },
  );
  return data;
}

export async function sendAiChatMessage(request: AiChatSendRequest) {
  const { data } = await apiClient.post<AiChatMessageResponse>(
    "/api/v1/chat/ai/send",
    request,
  );
  return data;
}

export async function fetchAiChatHistory(
  conversationType: AiConversationType,
  cursorRequest: CursorRequest,
) {
  const { data } = await apiClient.get<CursorResponse<AiChatHistoryItem>>(
    "/api/v1/chat/ai/messages",
    { params: { conversationType, ...cursorRequest } },
  );
  return data;
}
