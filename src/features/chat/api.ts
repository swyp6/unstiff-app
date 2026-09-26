import { logEvent } from "@/features/analytics/analytics";
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
  // stop: true는 오늘 대화가 이 응답으로 끝났다는 서버 신호 — 오늘의
  // 디스커버리(DAILY_DISCOVERY 대화)를 완료한 시점이다.
  if (data.stop) {
    logEvent("app_daily_discovery_complete", {
      conversation_type: request.conversationType,
    });
  }
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
