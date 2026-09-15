import { summarizeMeasures } from "@/features/workout-history/model";
import type { WorkoutHistoryResponse } from "@/features/workout-history/types";

// 최근 활동 row의 두 줄. PLAN은 "계획 이름 / 대표 기록값 + 운동 종류"
// ("30분 걷기" — 지난 운동 카드와 달리 측정값이 앞), MISSION은
// "데일리 미션 / 미션 이름". 미션은 exerciseType이 null인 게 정상이라
// 측정값 요약을 붙이지 않는다.
export function describeRecentActivity(activity: WorkoutHistoryResponse): {
  title: string;
  detail: string;
} {
  if (activity.refType === "MISSION") {
    return { title: "데일리 미션", detail: activity.name };
  }
  const parts = [
    summarizeMeasures(activity.measures),
    activity.exerciseType,
  ].filter((part): part is string => Boolean(part));
  return {
    title: activity.name,
    detail: parts.length > 0 ? parts.join(" ") : (activity.memo ?? ""),
  };
}

// "2026-08-30" → "8.30". 서버 targetDate는 로컬 날짜 문자열이라 Date로
// 파싱하면 UTC 해석으로 하루가 밀릴 수 있어 문자열을 직접 나눈다.
export function formatRecentActivityDate(targetDate: string): string {
  const [, month, day] = targetDate.split("-");
  return `${Number(month)}.${Number(day)}`;
}
