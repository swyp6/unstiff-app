import type {
  DailyPlanResponse,
  ExerciseMeasuresDto,
  PlanPresetResponse,
} from "./types";

export type GoalType = "time" | "distance" | "reps" | "sets";

export type Intensity = "light" | "moderate" | "hard" | null;

export type StartTime = {
  period: "AM" | "PM";
  hour: number;
  minute: number;
} | null;

export type WorkoutPlanDraft = {
  id: string;
  title: string;
  exerciseType: string;
  selectedGoalTypes: GoalType[];
  goalValues: Record<GoalType, number>;
  startTime: StartTime;
  intensity: Intensity;
  memo: string;
};

export const GOAL_TYPES: GoalType[] = ["time", "distance", "reps", "sets"];

// 칩을 누른 순서가 아니라 항상 GOAL_TYPES 순서(시간/거리/횟수/세트)로 보이도록
// 정렬해서 반환한다 — 세 군데(계획 편집/상세/새 루틴 추가)에서 토글 로직이
// 똑같이 중복돼 있어서 여기 하나로 모았다.
export function toggleGoalTypeSelection(
  selectedGoalTypes: GoalType[],
  goalType: GoalType,
): GoalType[] {
  const isSelected = selectedGoalTypes.includes(goalType);
  if (isSelected && selectedGoalTypes.length === 1) return selectedGoalTypes;

  const next = isSelected
    ? selectedGoalTypes.filter((type) => type !== goalType)
    : [...selectedGoalTypes, goalType];

  return GOAL_TYPES.filter((type) => next.includes(type));
}

export const GOAL_CONFIG: Record<
  GoalType,
  { label: string; step: number; minimum: number; unit: string }
> = {
  time: { label: "시간", step: 5, minimum: 5, unit: "분" },
  distance: { label: "거리", step: 0.1, minimum: 0.1, unit: "km" },
  reps: { label: "횟수", step: 1, minimum: 1, unit: "회" },
  sets: { label: "세트", step: 1, minimum: 1, unit: "세트" },
};

export const INTENSITY_OPTIONS: {
  value: Intensity;
  label: string;
  description: string;
}[] = [
  { value: "light", label: "가볍게", description: "숨이 차지 않을 정도" },
  { value: "moderate", label: "보통", description: "땀이 조금 나는 정도" },
  { value: "hard", label: "빡세게", description: "숨이 많이 차는 정도" },
];

export const EXERCISE_TYPES = [
  "걷기",
  "러닝",
  "등산",
  "자전거",
  "수영",
  "근력",
  "요가",
] as const;

export function createMockWorkoutPlan(
  id: string,
  title = "15분 가볍게 뛰기",
): WorkoutPlanDraft {
  return {
    id,
    title,
    exerciseType: "러닝",
    selectedGoalTypes: ["time"],
    goalValues: {
      time: 15,
      distance: 1.4,
      reps: 10,
      sets: 3,
    },
    startTime: { period: "PM", hour: 7, minute: 0 },
    intensity: "light",
    memo: "오늘은 천천히",
  };
}

// "신규 운동 계획 추가" 시트가 시작할 빈 상태(Figma node 2929-5701) —
// 운동명·운동 종류·기록할 항목·예상 시작 시간·강도 전부 미선택으로 시작한다.
export function createBlankWorkoutPlanDraft(id: string): WorkoutPlanDraft {
  return {
    id,
    title: "",
    exerciseType: "",
    selectedGoalTypes: [],
    goalValues: {
      time: GOAL_CONFIG.time.minimum,
      distance: GOAL_CONFIG.distance.minimum,
      reps: GOAL_CONFIG.reps.minimum,
      sets: GOAL_CONFIG.sets.minimum,
    },
    startTime: null,
    intensity: null,
    memo: "",
  };
}

export function formatGoalValue(type: GoalType, value: number) {
  const displayValue = type === "distance" ? value.toFixed(1) : String(value);
  return `${displayValue}${GOAL_CONFIG[type].unit}`;
}

// null이면 빈 문자열을 돌려줘서 SelectionRow의 placeholder("선택해주세요",
// 호출하는 쪽에서 지정)가 뜨게 한다.
export function formatStartTime(value: StartTime) {
  if (!value) return "";

  const period = value.period === "AM" ? "오전" : "오후";
  return `${period} ${value.hour}시 ${String(value.minute).padStart(2, "0")}분`;
}

// null이면 빈 문자열을 돌려줘서 SelectionRow의 기본 placeholder("선택하세요")가
// 뜨게 한다.
export function getIntensityLabel(value: Intensity) {
  return (
    INTENSITY_OPTIONS.find((option) => option.value === value)?.label ?? ""
  );
}

export function getWorkoutPlanSummary(plan: WorkoutPlanDraft) {
  const firstGoalType = plan.selectedGoalTypes[0];
  if (!firstGoalType) return plan.exerciseType;

  return `${plan.exerciseType} ${formatGoalValue(
    firstGoalType,
    plan.goalValues[firstGoalType],
  )}`;
}

const GOAL_TYPE_TO_MEASURE_KEY: Record<
  GoalType,
  "duration" | "distance" | "count" | "sets"
> = {
  time: "duration",
  distance: "distance",
  reps: "count",
  sets: "sets",
};

// UI는 시간을 분, 거리를 km 단위로 다루지만 API(ExerciseMeasuresDto)는 각각
// 초/m 단위다 — 여기서만 변환해서 API 호출부는 단위를 신경 쓰지 않게 한다.
function toApiMeasureValue(
  measureKey: "duration" | "distance" | "count" | "sets",
  value: number,
): number {
  if (measureKey === "duration") return Math.round(value * 60);
  if (measureKey === "distance") return Math.round(value * 1000);
  return value;
}

function fromApiMeasureValue(
  measureKey: "duration" | "distance" | "count" | "sets",
  value: number,
): number {
  if (measureKey === "duration") return value / 60;
  if (measureKey === "distance") return value / 1000;
  return value;
}

// 등록 API(루틴/오늘의 운동 생성)가 공통으로 쓰는 필드 변환 — targets는 켠
// 항목만 담아야 하므로 selectedGoalTypes만 순회한다.
export function toExerciseMeasuresDto(plan: WorkoutPlanDraft) {
  const targets: Partial<
    Record<"duration" | "distance" | "count" | "sets", number>
  > = {};
  for (const type of plan.selectedGoalTypes) {
    const measureKey = GOAL_TYPE_TO_MEASURE_KEY[type];
    targets[measureKey] = toApiMeasureValue(measureKey, plan.goalValues[type]);
  }
  return targets;
}

export function toApiStartTime(value: StartTime) {
  if (!value) return undefined;
  const hour24 = (value.hour % 12) + (value.period === "PM" ? 12 : 0);
  return `${String(hour24).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}:00`;
}

export function toApiIntensity(value: Intensity) {
  return value
    ? (value.toUpperCase() as "LIGHT" | "MODERATE" | "HARD")
    : undefined;
}

// 루틴/오늘의 운동 등록·수정 요청이 공통으로 쓰는 필드(날짜 등 요청별로
// 다른 값은 호출부에서 따로 채운다).
export function toPlanRequestFields(plan: WorkoutPlanDraft) {
  return {
    name: plan.title,
    exerciseType: plan.exerciseType,
    targets: toExerciseMeasuresDto(plan),
    // 스펙엔 선택 필드로 나와 있지만 실제로는 생략(undefined)이나 null을
    // 보내면 요청 자체가 파싱 실패(400)한다 — UI에 스톱워치 토글이 아직
    // 없어 항상 꺼진 값으로 보낸다.
    stopwatchEnabled: false,
    startTime: toApiStartTime(plan.startTime),
    intensity: toApiIntensity(plan.intensity),
    memo: plan.memo || undefined,
  };
}

const MEASURE_KEY_TO_GOAL_TYPE = {
  duration: "time",
  distance: "distance",
  count: "reps",
  sets: "sets",
} as const;

function fromApiStartTime(value?: string): StartTime {
  if (!value) return null;
  const [hourStr, minuteStr] = value.split(":");
  const hour24 = Number(hourStr);
  const period: "AM" | "PM" = hour24 < 12 ? "AM" : "PM";
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { period, hour, minute: Number(minuteStr) };
}

function fromApiIntensity(value?: "LIGHT" | "MODERATE" | "HARD"): Intensity {
  return value ? (value.toLowerCase() as Exclude<Intensity, null>) : null;
}

// 루틴/오늘의 운동 조회 API 응답 둘 다 이 필드 구성(및 그 역변환 규칙)을
// 공유한다 — toPlanRequestFields/toExerciseMeasuresDto/toApiStartTime/
// toApiIntensity의 역변환.
type PlanResponseFields = {
  id: number;
  name: string;
  exerciseType: string;
  targets: ExerciseMeasuresDto;
  startTime?: string;
  intensity?: "LIGHT" | "MODERATE" | "HARD";
  memo?: string;
};

function fromPlanResponseFields(
  response: PlanResponseFields,
): WorkoutPlanDraft {
  const blank = createBlankWorkoutPlanDraft(String(response.id));
  const goalValues = { ...blank.goalValues };
  const selectedGoalTypes: GoalType[] = [];
  for (const [measureKey, goalType] of Object.entries(
    MEASURE_KEY_TO_GOAL_TYPE,
  ) as [keyof typeof MEASURE_KEY_TO_GOAL_TYPE, GoalType][]) {
    const value = response.targets[measureKey];
    if (value == null) continue;
    goalValues[goalType] = fromApiMeasureValue(measureKey, value);
    selectedGoalTypes.push(goalType);
  }

  return {
    ...blank,
    title: response.name,
    exerciseType: response.exerciseType,
    selectedGoalTypes: GOAL_TYPES.filter((type) =>
      selectedGoalTypes.includes(type),
    ),
    goalValues,
    startTime: fromApiStartTime(response.startTime),
    intensity: fromApiIntensity(response.intensity),
    memo: response.memo ?? "",
  };
}

// 오늘의 운동 조회 API 응답(서버 기준값)을 화면이 쓰는 WorkoutPlanDraft로
// 되돌린다.
export function fromDailyPlanResponse(
  response: DailyPlanResponse,
): WorkoutPlanDraft {
  return fromPlanResponseFields(response);
}

// 루틴 조회 API 응답을 화면이 쓰는 WorkoutPlanDraft로 되돌린다.
export function fromPlanPresetResponse(
  response: PlanPresetResponse,
): WorkoutPlanDraft {
  return fromPlanResponseFields(response);
}

export function serializeWorkoutPlan(plan: WorkoutPlanDraft) {
  return JSON.stringify(plan);
}

export function parseWorkoutPlan(
  value: string | string[] | undefined,
  id: string,
  fallbackTitle?: string,
) {
  const fallback = createMockWorkoutPlan(id, fallbackTitle);
  const serialized = Array.isArray(value) ? value[0] : value;
  if (!serialized) return fallback;

  try {
    const parsed = JSON.parse(serialized) as Partial<WorkoutPlanDraft> & {
      goalType?: GoalType;
    };
    const goalValues = { ...fallback.goalValues, ...parsed.goalValues };
    const selectedGoalTypes = GOAL_TYPES.filter((type) =>
      parsed.selectedGoalTypes?.includes(type),
    );

    return {
      ...fallback,
      ...parsed,
      id,
      goalValues,
      selectedGoalTypes:
        selectedGoalTypes.length > 0
          ? selectedGoalTypes
          : parsed.goalType
            ? [parsed.goalType]
            : fallback.selectedGoalTypes,
    } as WorkoutPlanDraft;
  } catch {
    return fallback;
  }
}
