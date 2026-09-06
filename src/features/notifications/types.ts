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
