import { apiClient } from "@/lib/api-client";

import type { DailyMissionResponse, MissionSettingResponse } from "./types";

// GET /api/v1/missions/setting — 미션 제공 시간 조회
export async function getMissionSetting() {
  const { data } = await apiClient.get<MissionSettingResponse>(
    "/api/v1/missions/setting",
  );
  return data;
}

// PUT /api/v1/missions/setting — 미션 제공 시간 변경
export async function updateMissionSetting(offerTime: string) {
  const { data } = await apiClient.put<MissionSettingResponse>(
    "/api/v1/missions/setting",
    { offerTime },
  );
  return data;
}

// GET /api/v1/missions/daily — 오늘의 미션 조회
export async function getDailyMission() {
  const { data } = await apiClient.get<DailyMissionResponse>(
    "/api/v1/missions/daily",
  );
  return data;
}

// POST /api/v1/missions/daily/prefetch — 오늘의 미션 미리받기
export async function prefetchDailyMission() {
  const { data } = await apiClient.post<DailyMissionResponse>(
    "/api/v1/missions/daily/prefetch",
  );
  return data;
}

// POST /api/v1/missions/{missionId}/accept — 오늘의 미션 수락
export async function acceptMission(missionId: number) {
  const { data } = await apiClient.post<DailyMissionResponse>(
    `/api/v1/missions/${missionId}/accept`,
  );
  return data;
}

// POST /api/v1/missions/{missionId}/dismiss — 오늘의 미션 무시
export async function dismissMission(missionId: number) {
  const { data } = await apiClient.post<DailyMissionResponse>(
    `/api/v1/missions/${missionId}/dismiss`,
  );
  return data;
}
