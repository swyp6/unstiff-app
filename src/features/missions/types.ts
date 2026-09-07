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
export type DailyMissionResponse = {
  missionId: number;
  status: DailyMissionStatus;
  missionDate: string; // "YYYY-MM-DD"
  offerTime: string; // "HH:mm:ss" 또는 "HH:mm"
  message?: string;
  title?: string;
  description?: string;
};
