import { apiClient } from "@/lib/api-client";

import type { AiChatMessageResponse, AiChatSendRequest } from "./types";

export async function sendAiChatMessage(request: AiChatSendRequest) {
  const { data } = await apiClient.post<AiChatMessageResponse>(
    "/api/v1/chat/ai/send",
    request,
  );
  return data;
}
