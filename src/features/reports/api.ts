import { apiClient } from "@/lib/api-client";

import type { AiContentComplaintRequest } from "./types";

export async function reportAiContent(request: AiContentComplaintRequest) {
  const { data } = await apiClient.post<{ id: number }>(
    "/api/v1/complaints/ai-content",
    request,
  );
  return data;
}
