import type { WorkoutHistoryResponse } from "@/features/workout-history/types";

// DTOs mirroring the 마이페이지 활동 기록 API (see swagger:
// /api/v1/workouts/activity). `days` only includes dates that have at least
// one record — any other date in the requested month is absent from the array
// and should be treated as recordCount 0.
export type WorkoutActivityDay = {
  date: string; // "YYYY-MM-DD"
  recordCount: number;
};

// GET /api/v1/workouts/activity
export type WorkoutActivityResponse = {
  // 현재 연속 활동 일수. 조회하는 year/month와 무관하게 요청 시점 서버 날짜
  // 기준으로 서버가 계산한 값 — 프론트에서 days로 다시 계산하지 않는다.
  streakDays: number;
  // 지금까지의 최장 연속 활동 일수. streakDays와 마찬가지로 서버 계산값.
  maxStreakDays: number;
  days: WorkoutActivityDay[];
  // 요청 시점 기준 최근 운동 기록 최대 5건, 최신 순. 서버가 이미 정렬/제한한
  // 그대로 렌더링한다 — 프론트에서 다시 정렬하거나 slice하지 않는다. 항목
  // 구조는 GET /api/v1/workouts?date=의 WorkoutHistoryResponse와 같다.
  recentActivities: WorkoutHistoryResponse[];
};
