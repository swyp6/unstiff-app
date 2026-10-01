import type { ExerciseMeasuresDto } from "@/features/workout-plan/types";
import { toApiMeasureValue } from "@/features/workout-plan/measure-units";
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
  // 서버 최대는 36059초(600분 59초)지만 이 UI는 분 단위까지만 고르므로
  // 표현 가능한 최대 유효값인 600분(10시간 00분)에서 끊는다.
  time: { label: "시간", unit: "분", step: 1, minimum: 1, maximum: 600 },
  distance: {
    label: "거리",
    unit: "km",
    step: 0.1,
    // 서버 distance 범위(100~99900m)에 맞춘다.
    minimum: 0.1,
    // step(0.1)과 정확히 맞아떨어지지 않는 max(99.99)를 쓰면 스테퍼가
    // 99.9에서 한 번 더 눌렀을 때 99.99로 clamp된 뒤 toFixed(1)에서
    // "100.0"으로 반올림돼 max를 넘는 값이 만들어진다. step 배수로 맞춘다.
    maximum: 99.9,
  },
  reps: { label: "횟수", unit: "회", step: 1, minimum: 1, maximum: 50 },
  sets: { label: "세트", unit: "세트", step: 1, minimum: 1, maximum: 99 },
};

// 신규 기록(record-editor-screen·manual-record)과 기록 수정 시트가 같은
// 기준으로 항목을 켜고 값을 채우도록 한 군데에 둔다.
//
// 항목을 처음 켰을 때의 값(UI 단위: 분/km/회/세트). "입력 안 함"은 0이나 빈
// 값이 아니라 항목이 꺼져 있는 것으로만 표현한다.
export const DEFAULT_ACTUAL_MEASURE_VALUES: Record<GoalType, number> = {
  time: 1,
  distance: 0.1,
  reps: 1,
  sets: 1,
};

// "기록할 항목" 칩 토글 — 모두 끌 수 있고(저장 버튼이 막는다), 켠 항목은
// 항상 시간 → 거리 → 횟수 → 세트 순으로 둔다.
export function toggleActualMeasureType(
  selectedTypes: GoalType[],
  type: GoalType,
): GoalType[] {
  return selectedTypes.includes(type)
    ? selectedTypes.filter((item) => item !== type)
    : ACTUAL_MEASURE_TYPES.filter(
        (measureType) =>
          selectedTypes.includes(measureType) || measureType === type,
      );
}

export const GOAL_TYPE_TO_MEASURE_KEY: Record<
  GoalType,
  keyof ExerciseMeasuresDto
> = {
  time: "duration",
  distance: "distance",
  reps: "count",
  sets: "sets",
};

// 서버 ExerciseMeasures의 @Min/@Max와 같은 범위(API 단위: 초/m/회/세트).
// UI 설정(ACTUAL_MEASURE_CONFIG)은 이보다 넓게 입력될 수 있어, 저장 전에
// 변환된 DTO 값으로 다시 확인한다.
export const API_MEASURE_RANGE: Record<
  keyof ExerciseMeasuresDto,
  { minimum: number; maximum: number }
> = {
  duration: { minimum: 1, maximum: 36059 },
  distance: { minimum: 100, maximum: 99900 },
  count: { minimum: 1, maximum: 9999 },
  sets: { minimum: 1, maximum: 99 },
};

// 값이 있는 항목만 검사한다 — 측정하지 않는 항목(필드 없음)은 통과.
// 서버 필드는 모두 Integer라 소수(예: 횟수 2.5)도 막는다.
export function isActualMeasuresInRange(measures: ExerciseMeasuresDto) {
  return (
    Object.keys(API_MEASURE_RANGE) as (keyof ExerciseMeasuresDto)[]
  ).every((key) => {
    const value = measures[key];
    if (value == null) return true;
    const { minimum, maximum } = API_MEASURE_RANGE[key];
    return Number.isInteger(value) && value >= minimum && value <= maximum;
  });
}

export function formatActualMeasureValue(type: GoalType, value: number) {
  const displayValue = type === "distance" ? value.toFixed(1) : String(value);
  return `${displayValue}${ACTUAL_MEASURE_CONFIG[type].unit}`;
}

// 선택된 measure type + 입력값(UI 단위: 분/km/회/세트)을
// POST /api/v1/workouts의 measures(API 단위: 초/m/회/세트)로 변환한다.
// 선택되지 않은 항목은 아예 필드를 만들지 않는다.
export function toActualMeasuresDto(
  selectedTypes: GoalType[],
  values: Record<GoalType, number>,
): ExerciseMeasuresDto {
  const measures: ExerciseMeasuresDto = {};
  for (const type of selectedTypes) {
    measures[GOAL_TYPE_TO_MEASURE_KEY[type]] = toApiMeasureValue(
      type,
      values[type],
    );
  }
  return measures;
}
