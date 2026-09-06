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
