// DTOs for the workout record API (POST /api/v1/workouts) — saves the
// actual result of performing a 오늘의 운동(PLAN) or 오늘의 미션(MISSION).
// Swagger 문서는 접근 권한이 없어 직접 확인하지 못했고, 이 계약은 제품팀이
// 확정해 전달한 스펙을 그대로 반영한다. MISSION은 오늘의 미션 API 연동 후
// 후속 작업에서 연결하고, 지금은 PLAN만 이 타입을 사용한다.

import type { ExerciseMeasuresDto } from "@/features/workout-plan/types";

export type WorkoutRefType = "PLAN" | "MISSION";

// POST /api/v1/workouts — measures는 최소 1개 필드가 있어야 한다(서버 검증).
export type WorkoutRecordCreateRequest = {
  refType: WorkoutRefType;
  refId: number;
  measures: ExerciseMeasuresDto;
  imageUrl?: string;
  memo?: string;
};
