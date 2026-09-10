// DTOs mirroring the mission setting API (see swagger: MissionSettingResponse /
// MissionSettingUpdateRequest under /api/v1/missions/setting). `offerTime` is
// a "HH:mm:ss" time string (e.g. "09:00:00") — the server is the source of
// truth, so no default value is assumed client-side.

// GET /api/v1/missions/setting
export type MissionSettingResponse = {
  offerTime: string;
};

// PUT /api/v1/missions/setting
export type MissionSettingUpdateRequest = {
  offerTime: string;
};

export type DailyMissionStatus =
  "NOT_OFFERED" | "OFFERED" | "ACCEPTED" | "COMPLETED" | "DISMISSED";

// GET /api/v1/missions/daily, POST .../prefetch, .../accept, .../dismiss,
// .../complete가 전부 이 형태를 반환한다. 제공 시간 전(NOT_OFFERED)이면
// title/description/message는 비어 있고 offerTime만 의미가 있다.
//
// requireUserFeedback: complete/dismiss 응답에서만 의미 있는 필드 —
// "10번마다" 같은 주기 판단은 서버가 이미 끝내둔 결과라, true일 때만
// 피드백 UI를 띄우면 된다(프론트에서 횟수를 세지 않는다). GET/accept 응답엔
// 없을 수 있어 optional로 둔다.
export type DailyMissionResponse = {
  missionId: number;
  status: DailyMissionStatus;
  missionDate: string; // "YYYY-MM-DD"
  offerTime: string; // "HH:mm:ss" 또는 "HH:mm"
  message?: string;
  title?: string;
  description?: string;
  requireUserFeedback?: boolean;
};

// POST /api/v1/missions/{missionId}/feedback — 미션당 1건만 저장되고, 같은
// missionId로 다시 보내면 서버가 마지막 값으로 overwrite한다. 서버가 schema를
// 강제하지 않아(임의 JSON을 그대로 저장) 프론트에서 하나의 계약으로 고정한다.
export type MissionFeedbackReason =
  "GOOD" | "TOO_HARD" | "NOT_INTERESTED" | "OTHER";

export type MissionFeedbackRequest =
  | { reason: "GOOD" }
  | { reason: "TOO_HARD" }
  | { reason: "NOT_INTERESTED" }
  | { reason: "OTHER"; comment: string };
