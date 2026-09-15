import { apiClient } from "@/lib/api-client";

import type {
  WorkoutHistoryListResponse,
  WorkoutHistoryResponse,
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

// GET /api/v1/workouts/{id} — 운동 기록 단건 조회. 날짜별 조회 응답의
// 항목과 같은 형태다(record-complete.tsx가 방금 저장한 기록을 exerciseType/
// iconUrl까지 채워서 다시 읽어올 때 쓴다).
export async function getWorkoutHistoryById(id: number) {
  const { data } = await apiClient.get<WorkoutHistoryResponse>(
    `/api/v1/workouts/${id}`,
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
