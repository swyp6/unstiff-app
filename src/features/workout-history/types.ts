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
  measures: ExerciseMeasuresDto;
  intensity?: IntensityDto;
  imageUrl?: string;
  memo?: string;
};

export type WorkoutHistoryListResponse = {
  workouts: WorkoutHistoryResponse[];
};
