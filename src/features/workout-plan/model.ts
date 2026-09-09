import {
  fromApiMeasureValue,
  type GoalType,
  toApiMeasureValue,
} from "./measure-units";
import type {
  DailyPlanResponse,
  ExerciseMeasuresDto,
  PlanPresetResponse,
} from "./types";

// GoalType의 정의는 measure-units.ts에 있다(순환 import 방지) — 기존 호출부가
// 계속 이 모듈에서 가져다 쓸 수 있도록 여기서 다시 내보낸다.
export type { GoalType };

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

// 등록 API(루틴/오늘의 운동 생성)가 공통으로 쓰는 필드 변환 — targets는 켠
// 항목만 담아야 하므로 selectedGoalTypes만 순회한다. goalValues는 UI 단위
// (분/km)라 API 단위(초/m)로 바꿔 보낸다(measure-units.ts).
export function toExerciseMeasuresDto(plan: WorkoutPlanDraft) {
  const targets: Partial<
    Record<"duration" | "distance" | "count" | "sets", number>
  > = {};
  for (const type of plan.selectedGoalTypes) {
    targets[GOAL_TYPE_TO_MEASURE_KEY[type]] = toApiMeasureValue(
      type,
      plan.goalValues[type],
    );
  }
  return targets;
}

export function toApiStartTime(value: StartTime) {
  if (!value) return undefined;
  const hour24 = (value.hour % 12) + (value.period === "PM" ? 12 : 0);
  return `${String(hour24).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}:00`;
}

// planDate/캘린더 키로 쓰는 "YYYY-MM-DD" — 반드시 로컬 날짜 기준이다.
// toISOString()은 UTC로 바꿔버려서 한국 시간 오전 9시 이전이면 전날이 된다.
export function toPlanDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
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
    // 서버가 요구하는 필수 필드다(없으면 400 "Failed to read request").
    // 앱에는 스톱워치를 켜고 끄는 UI가 없어 항상 false로 보낸다 — 값이 생기면
    // WorkoutPlanDraft에 상태를 추가해 여기에 실으면 된다.
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
    // 응답은 API 단위(초/m)라 UI 단위(분/km)로 되돌린다 —
    // toExerciseMeasuresDto의 정확한 역연산이어야 한다.
    goalValues[goalType] = fromApiMeasureValue(goalType, value);
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
