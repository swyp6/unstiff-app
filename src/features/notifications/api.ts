import { apiClient } from "@/lib/api-client";

import type { PushConfigsResponse, PushConfigType } from "./types";

export async function registerPushDevice(deviceToken: string) {
  await apiClient.post("/api/v1/push", { deviceToken });
}

// GET /api/v1/push/configs — 알림 유형별 수신 동의 현황 조회
export async function getPushConfigs() {
  const { data } = await apiClient.get<PushConfigsResponse>(
    "/api/v1/push/configs",
  );
  return data;
}

// PUT /api/v1/push/configs/{type} — 알림 유형 수신 동의
export async function enablePushConfig(type: PushConfigType) {
  await apiClient.put(`/api/v1/push/configs/${type}`);
}

// DELETE /api/v1/push/configs/{type} — 알림 유형 수신 해제
export async function disablePushConfig(type: PushConfigType) {
  await apiClient.delete(`/api/v1/push/configs/${type}`);
}
