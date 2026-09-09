import { apiClient } from "@/lib/api-client";

import type {
  PushConfigsResponse,
  PushConfigType,
  PushMessageCursorRequest,
  PushMessagePageResponse,
  UnreadPushCountResponse,
} from "./types";

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

// GET /api/v1/push/messages — 보낸 알림을 최신순으로 조회한다. cursor를 생략하면
// 최신 페이지부터, 이전 응답의 nextCursor를 그대로 넘기면 다음 페이지를 준다
// (axios는 undefined param을 보내지 않으므로 첫 요청에는 size만 나간다).
export async function getPushMessages(request: PushMessageCursorRequest) {
  const { data } = await apiClient.get<PushMessagePageResponse>(
    "/api/v1/push/messages",
    { params: request },
  );
  return data;
}

// GET /api/v1/push/messages/unread-count — 홈 알림 배지 상태용.
export async function getUnreadPushCount() {
  const { data } = await apiClient.get<UnreadPushCountResponse>(
    "/api/v1/push/messages/unread-count",
  );
  return data;
}

// PUT /api/v1/push/messages/{id}/read — idempotent. 이미 읽었거나 보관 기간이
// 지나 사라진 id여도 성공하고, 최초 read 시각은 서버가 유지한다.
export async function markPushMessageRead(id: number) {
  await apiClient.put(`/api/v1/push/messages/${id}/read`);
}

// PUT /api/v1/push/messages/read-all — 안 읽은 알림을 모두 읽음 처리.
export async function markAllPushMessagesRead() {
  await apiClient.put("/api/v1/push/messages/read-all");
}
