import type { ExerciseMeasuresDto } from "@/features/workout-plan/types";

import type { WorkoutHistoryResponse } from "./types";

export const MEASURE_ORDER: (keyof ExerciseMeasuresDto)[] = [
  "duration",
  "distance",
  "count",
  "sets",
];

export function formatMeasureValue(
  key: keyof ExerciseMeasuresDto,
  value: number,
): string {
  switch (key) {
    case "duration":
      return `${Math.round(value / 60)}분`;
    case "distance":
      return `${(value / 1000).toFixed(1)}km`;
    case "count":
      return `${value}회`;
    case "sets":
      return `${value}세트`;
  }
}

function summarizeMeasures(measures: ExerciseMeasuresDto): string {
  for (const key of MEASURE_ORDER) {
    const value = measures[key];
    if (value != null) return formatMeasureValue(key, value);
  }
  return "";
}

// "지난 운동" 카드 한 줄 요약 — 운동 기록이면 "운동 종류 + 대표 기록값",
// 미션 기록은 exerciseType이 없으므로(API 규칙) 기록값만, 그마저 없으면
// 한 줄 메모로 대체한다.
export function summarizeWorkoutHistoryEntry(
  entry: WorkoutHistoryResponse,
): string {
  const parts = [entry.exerciseType, summarizeMeasures(entry.measures)].filter(
    (part): part is string => Boolean(part),
  );
  if (parts.length > 0) return parts.join(" ");
  return entry.memo ?? "";
}
