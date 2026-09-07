// DTOs for the workout record API (POST /api/v1/workouts) — saves the
// actual result of performing a 오늘의 운동(PLAN) or 오늘의 미션(MISSION).
// Swagger 문서는 접근 권한이 없어 직접 확인하지 못했고, 이 계약은 제품팀이
// 확정해 전달한 스펙을 그대로 반영한다. PLAN/MISSION 둘 다 record-editor.tsx
// 에서 이 타입으로 저장한다 — MISSION은 저장 성공 후 별도로
// missions/api.ts의 completeMission을 호출해 미션 자체를 완료 처리한다.

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
