// DTOs for the workout record API (POST /api/v1/workouts) — saves the
// actual result of performing a 오늘의 운동(PLAN) or 오늘의 미션(MISSION).
//
// measures는 API 단위(duration=초, distance=m, count=회, sets=세트)다 —
// UI 단위(분/km)에서의 변환은 actual-measure.ts의 toActualMeasuresDto가
// measure-units.ts를 거쳐 처리한다.
//
// PLAN/MISSION 둘 다 record-editor-screen.tsx에서 이 타입으로 저장한다 —
// MISSION은 저장 성공 후 별도로 missions/api.ts의 completeMission을 호출해
// 미션 자체를 완료 처리한다. 기존 오늘의 운동에 연결한 기록이라도 그 계획
// (daily-plan)을 PUT하지 않는다 — 여기 intensity는 "계획한 강도"가 아니라
// "실제로 그렇게 수행했다"는 기록값이다.

import type {
  ExerciseMeasuresDto,
  IntensityDto,
} from "@/features/workout-plan/types";

export type WorkoutRefType = "PLAN" | "MISSION";

// POST /api/v1/workouts — measures는 최소 1개 필드가 있어야 한다(서버 검증).
export type WorkoutRecordCreateRequest = {
  refType: WorkoutRefType;
  refId: number;
  measures: ExerciseMeasuresDto;
  intensity?: IntensityDto;
  imageUrl?: string;
  memo?: string;
};
