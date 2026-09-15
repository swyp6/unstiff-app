import type {
  ExerciseMeasuresDto,
  IntensityDto,
} from "@/features/workout-plan/types";

export type WorkoutHistoryRefType = "PLAN" | "MISSION";

// GET /api/v1/workouts?date= — 날짜별 운동 기록 조회. 미션으로 기록한
// 항목은 exerciseType이 null이다.
export type WorkoutHistoryResponse = {
  id: number;
  refType: WorkoutHistoryRefType;
  targetDate: string; // "YYYY-MM-DD"
  name: string;
  exerciseType: string | null;
  // 서버가 운동 종류(미션/운동/커스텀)에 맞춰 골라준 아이콘 URL — 전용
  // 아이콘이 없으면 기본 아이콘 URL을 내려주므로 항상 채워진다. 프론트에서
  // refType/exerciseType으로 아이콘을 다시 추론하지 않는다.
  iconUrl: string;
  measures: ExerciseMeasuresDto;
  intensity?: IntensityDto;
  imageUrl?: string;
  memo?: string;
};

export type WorkoutHistoryListResponse = {
  workouts: WorkoutHistoryResponse[];
};

// PUT /api/v1/workouts/{id} — 보내지 않은 선택 항목(intensity/imageUrl/memo)은
// null로 덮어써진다. 유지하려면 기존 값을 그대로 함께 보내야 한다.
export type WorkoutHistoryUpdateRequest = {
  measures: ExerciseMeasuresDto;
  intensity?: IntensityDto;
  imageUrl?: string;
  memo?: string;
};
