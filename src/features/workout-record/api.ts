import { logEvent } from "@/features/analytics/analytics";
import type { WorkoutHistoryResponse } from "@/features/workout-history/types";
import { apiClient } from "@/lib/api-client";

import type { WorkoutRecordCreateRequest } from "./types";

// POST /api/v1/workouts — 운동/미션을 실제 수행한 결과를 기록한다. 응답은
// 방금 만든 기록(id 포함) 전체다 — record-complete.tsx가 "점세개" 메뉴에서
// 이 기록을 수정/삭제하려면 이 id가 필요하다.
export async function saveWorkoutRecord(request: WorkoutRecordCreateRequest) {
  const { data } = await apiClient.post<WorkoutHistoryResponse>(
    "/api/v1/workouts",
    request,
  );
  logEvent("record_complete", {
    ref_type: request.refType,
    intensity: request.intensity ?? "unknown",
  });
  return data;
}
