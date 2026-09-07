// DTOs mirroring the 루틴(PlanPreset)/오늘의 운동(DailyPlan) 등록 API
// (see swagger: PlanPresetCreateRequest/Response, DailyPlanCreateRequest/Response).

export type ExerciseMeasuresDto = {
  duration?: number; // 분
  distance?: number; // km
  count?: number; // 회
  sets?: number; // 세트
};

export type IntensityDto = "LIGHT" | "MODERATE" | "HARD";

// POST /api/v1/plan-presets
export type PlanPresetCreateRequest = {
  name: string;
  exerciseType: string;
  targets: ExerciseMeasuresDto;
  startTime?: string; // "HH:mm:ss"
  intensity?: IntensityDto;
  memo?: string;
};

export type PlanPresetCreateResponse = {
  id: number;
};

// POST /api/v1/daily-plans
export type DailyPlanCreateRequest = {
  name: string;
  exerciseType: string;
  planDate: string; // "YYYY-MM-DD"
  targets: ExerciseMeasuresDto;
  startTime?: string; // "HH:mm:ss"
  intensity?: IntensityDto;
  memo?: string;
};

export type DailyPlanCreateResponse = {
  id: number;
};

export type DailyPlanStatus = "PLANNED" | "COMPLETED";

// GET /api/v1/daily-plans?date=
export type DailyPlanResponse = {
  id: number;
  name: string;
  exerciseType: string;
  planDate: string; // "YYYY-MM-DD"
  status: DailyPlanStatus;
  targets: ExerciseMeasuresDto;
  startTime?: string; // "HH:mm:ss"
  intensity?: IntensityDto;
  memo?: string;
};

export type DailyPlanListResponse = {
  dailyPlans: DailyPlanResponse[];
};
