// DTOs mirroring the 루틴(PlanPreset)/오늘의 운동(DailyPlan) 등록 API
// (see swagger: PlanPresetCreateRequest/Response, DailyPlanCreateRequest/Response).

export type ExerciseMeasuresDto = {
  duration?: number; // 초
  distance?: number; // m
  count?: number; // 회
  sets?: number; // 세트
};

export type IntensityDto = "LIGHT" | "MODERATE" | "HARD";

// POST /api/v1/plan-presets
export type PlanPresetCreateRequest = {
  name: string;
  exerciseType: string;
  targets: ExerciseMeasuresDto;
  // 서버 필수 필드 — 빠지면 400 "Failed to read request"로 거절된다.
  // 앱에는 아직 스톱워치 UI가 없어 항상 false를 보낸다(model.ts 참고).
  stopwatchEnabled: boolean;
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
  // plan-preset과 동일하게 서버 필수 필드다.
  stopwatchEnabled: boolean;
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
  stopwatchEnabled?: boolean;
  startTime?: string; // "HH:mm:ss"
  intensity?: IntensityDto;
  memo?: string;
};

export type DailyPlanListResponse = {
  dailyPlans: DailyPlanResponse[];
};

// PUT /api/v1/plan-presets/{id} — 필드 구성이 생성 요청과 동일하다.
export type PlanPresetUpdateRequest = PlanPresetCreateRequest;

// PUT /api/v1/daily-plans/{id} — planDate는 등록 시점 값이라 수정할 수 없다.
export type DailyPlanUpdateRequest = Omit<DailyPlanCreateRequest, "planDate">;

// GET /api/v1/plan-presets
export type PlanPresetResponse = {
  id: number;
  name: string;
  exerciseType: string;
  targets: ExerciseMeasuresDto;
  stopwatchEnabled?: boolean;
  startTime?: string; // "HH:mm:ss"
  intensity?: IntensityDto;
  memo?: string;
};

export type PlanPresetListResponse = {
  planPresets: PlanPresetResponse[];
};
