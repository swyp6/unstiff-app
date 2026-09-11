import { apiClient } from "@/lib/api-client";

import type {
  WorkoutHistoryListResponse,
  WorkoutHistoryUpdateRequest,
} from "./types";

// GET /api/v1/workouts?date= — 날짜별 운동 기록 조회 (오늘의 운동/미션 완료 기록)
export async function getWorkoutHistory(date: string) {
  const { data } = await apiClient.get<WorkoutHistoryListResponse>(
    "/api/v1/workouts",
    { params: { date } },
  );
  return data;
}

// PUT /api/v1/workouts/{id} — 기록한 값, 강도, 사진, 한 줄 기록을 수정한다.
export async function updateWorkoutHistory(
  id: number,
  request: WorkoutHistoryUpdateRequest,
) {
  await apiClient.put(`/api/v1/workouts/${id}`, request);
}
