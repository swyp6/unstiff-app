import type { ExerciseMeasuresDto } from "@/features/workout-plan/types";
import type { GoalType } from "@/features/workout-plan/model";

// 실제 수행값(measures) 입력 전용 설정 — 계획/루틴 목표값 편집에 쓰이는
// workout-plan/model의 GOAL_CONFIG와는 최소/최대 범위가 다르다(목표는
// "얼마나 할지" 계획값, 이건 "실제로 한" 값). 절대 GOAL_CONFIG를 그대로
// 재사용하지 않는다 — 계획값을 실제값으로 속여 보내는 문제와 같은 종류의
// 실수를 막기 위함.
export const ACTUAL_MEASURE_TYPES: GoalType[] = [
  "time",
  "distance",
  "reps",
  "sets",
];

export const ACTUAL_MEASURE_CONFIG: Record<
  GoalType,
  {
    label: string;
    unit: string;
    step: number;
    minimum: number;
    maximum: number;
  }
> = {
  time: { label: "시간", unit: "분", step: 1, minimum: 1, maximum: 1440 },
  distance: {
    label: "거리",
    unit: "km",
    step: 0.1,
    minimum: 0,
    maximum: 999.99,
  },
  reps: { label: "횟수", unit: "회", step: 1, minimum: 1, maximum: 9999 },
  sets: { label: "세트", unit: "세트", step: 1, minimum: 1, maximum: 999 },
};

const GOAL_TYPE_TO_MEASURE_KEY: Record<GoalType, keyof ExerciseMeasuresDto> = {
  time: "duration",
  distance: "distance",
  reps: "count",
  sets: "sets",
};

export function formatActualMeasureValue(type: GoalType, value: number) {
  const displayValue = type === "distance" ? value.toFixed(1) : String(value);
  return `${displayValue}${ACTUAL_MEASURE_CONFIG[type].unit}`;
}

// 선택된 measure type + 입력값을 POST /api/v1/workouts의 measures 형태로
// 변환한다. 선택되지 않은 항목은 아예 필드를 만들지 않는다.
export function toActualMeasuresDto(
  selectedTypes: GoalType[],
  values: Record<GoalType, number>,
): ExerciseMeasuresDto {
  const measures: ExerciseMeasuresDto = {};
  for (const type of selectedTypes) {
    measures[GOAL_TYPE_TO_MEASURE_KEY[type]] = values[type];
  }
  return measures;
}
