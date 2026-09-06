import { apiClient } from "@/lib/api-client";

import type { MissionSettingResponse } from "./types";

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
