// DTOs mirroring the push notification config API (see swagger: PushConfig*
// schemas under /api/v1/push/configs). `TEST` exists server-side but has no
// row in the settings UI and is excluded from every screen-facing list.
export type PushConfigType =
  "DAILY_DISCOVERY" | "DAILY_PLAN" | "DAILY_MISSION" | "REMIND_PLAN" | "TEST";

export type PushConfig = {
  type: PushConfigType;
  enabled: boolean;
};

// GET /api/v1/push/configs
export type PushConfigsResponse = {
  configs: PushConfig[];
};

// The 4 types shown as individual toggles on the notification settings
// screen, in display order. `TEST` is intentionally omitted.
export const SERVICE_PUSH_CONFIG_TYPES = [
  "DAILY_DISCOVERY",
  "DAILY_PLAN",
  "DAILY_MISSION",
  "REMIND_PLAN",
] as const;

export type ServicePushConfigType = (typeof SERVICE_PUSH_CONFIG_TYPES)[number];

export const SERVICE_PUSH_CONFIG_LABELS: Record<ServicePushConfigType, string> =
  {
    DAILY_DISCOVERY: "오늘의 질문",
    DAILY_PLAN: "운동 계획",
    DAILY_MISSION: "데일리 미션",
    REMIND_PLAN: "기록 리마인드",
  };

// ─── 알림함 (푸시 메시지 목록) ────────────────────────────────────────────
// DTOs mirroring the push message inbox API (see swagger: CursorRequest and
// CursorResponse<PushMessageResponse> under /api/v1/push/messages). 수신 동의한
// 유형만 쌓이므로 유형 집합은 PushConfigType과 같다.
export type PushMessageType = PushConfigType;

export type PushMessageResponse = {
  id: number;
  type: PushMessageType;
  title: string;
  body: string;
  // Swagger상 `additionalProperties: any` — 서버가 구조를 확정하지 않았으므로
  // missionId/planId 같은 필드가 있다고 가정하지 않는다.
  data: Record<string, unknown>;
  read: boolean;
  sentAt: string;
};

// GET /api/v1/push/messages — cursor는 첫 페이지에서 생략한다(0을 보내지 않는다).
export type PushMessageCursorRequest = {
  cursor?: number;
  size: number;
};

export type PushMessagePageResponse = {
  items: PushMessageResponse[];
  nextCursor: number;
  hasNext: boolean;
};

// GET /api/v1/push/messages/unread-count
export type UnreadPushCountResponse = {
  unreadCount: number;
};
