import { apiClient } from "@/lib/api-client";

import type { WorkoutRecordCreateRequest } from "./types";

// POST /api/v1/workouts — 운동/미션을 실제 수행한 결과를 기록한다.
export async function saveWorkoutRecord(request: WorkoutRecordCreateRequest) {
  await apiClient.post("/api/v1/workouts", request);
}
