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
// stopwatchEnabled는 스웨거 문서상 선택이지만, 실제로는 빠지면 요청 자체가
// 파싱 실패(400 "Failed to read request")한다 — 항상 보내야 한다.
export type PlanPresetCreateRequest = {
  name: string;
  exerciseType: string;
  targets: ExerciseMeasuresDto;
  stopwatchEnabled: boolean;
  startTime?: string; // "HH:mm:ss"
  intensity?: IntensityDto;
  memo?: string;
};

export type PlanPresetCreateResponse = {
  id: number;
};

// POST /api/v1/daily-plans — stopwatchEnabled 필수인 이유는 위 PlanPresetCreateRequest 참고.
export type DailyPlanCreateRequest = {
  name: string;
  exerciseType: string;
  planDate: string; // "YYYY-MM-DD"
  targets: ExerciseMeasuresDto;
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
  startTime?: string; // "HH:mm:ss"
  intensity?: IntensityDto;
  memo?: string;
};

export type PlanPresetListResponse = {
  planPresets: PlanPresetResponse[];
};
