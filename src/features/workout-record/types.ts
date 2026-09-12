// DTOs for the workout record API (POST /api/v1/workouts) — saves the
// actual result of performing a 오늘의 운동(PLAN) or 오늘의 미션(MISSION).
//
// measures는 API 단위(duration=초, distance=m, count=회, sets=세트)다 —
// UI 단위(분/km)에서의 변환은 actual-measure.ts의 toActualMeasuresDto가
// measure-units.ts를 거쳐 처리한다.
//
// PLAN/MISSION(LINKED)은 record-editor-screen.tsx에서, 계획 없는 신규 기록
// (MANUAL)은 capture/manual-record.tsx에서 이 타입으로 저장한다 — MISSION은
// 저장 성공 후 별도로 missions/api.ts의 completeMission을 호출해 미션 자체를
// 완료 처리한다. 기존 오늘의 운동에 연결한 기록이라도 그 계획(daily-plan)을
// PUT하지 않는다 — 여기 intensity는 "계획한 강도"가 아니라 "실제로 그렇게
// 수행했다"는 기록값이다.

import type {
  ExerciseMeasuresDto,
  IntensityDto,
} from "@/features/workout-plan/types";

export type WorkoutRefType = "PLAN" | "MISSION";

type WorkoutRecordCreateRequestBase = {
  // 최소 1개 필드가 있어야 한다(서버 검증).
  measures: ExerciseMeasuresDto;
  intensity?: IntensityDto;
  imageUrl?: string;
  memo?: string;
};

// POST /api/v1/workouts — refId 유무로 두 갈래다.
// - refId 있음: 기존 오늘의 운동(PLAN)/오늘의 미션(MISSION)에 연결한 기록.
// - refId 없음(MANUAL 신규 기록): name/exerciseType/targetDate를 대신 보내면
//   서버가 오늘의 운동(PLAN)을 만들어 기록까지 저장한다. refId를 null/0으로
//   보내는 게 아니라 필드 자체가 JSON에 없어야 한다(refId?: never).
export type WorkoutRecordCreateRequest =
  | (WorkoutRecordCreateRequestBase & {
      refType: WorkoutRefType;
      refId: number;
    })
  | (WorkoutRecordCreateRequestBase & {
      refType: "PLAN";
      refId?: never;
      name: string;
      exerciseType: string;
      // "YYYY-MM-DD" 로컬 날짜 — 서버가 오늘을 계산하지 않고 이 값을 그대로
      // 저장한다(toPlanDateKey 참고).
      targetDate: string;
    });
