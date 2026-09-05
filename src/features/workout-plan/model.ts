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
