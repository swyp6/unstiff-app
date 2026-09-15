import { apiClient } from "@/lib/api-client";

import type { WorkoutActivityResponse } from "./types";

// GET /api/v1/workouts/activity — 마이페이지 활동 기록 조회 (연속 기록 +
// 해당 월에 기록이 있는 날짜별 기록 수). 홈 캘린더의 /api/v1/calendar와는
// 다른 엔드포인트다.
export async function getWorkoutActivity(year: number, month: number) {
  const { data } = await apiClient.get<WorkoutActivityResponse>(
    "/api/v1/workouts/activity",
    { params: { year, month } },
  );
  return data;
}
