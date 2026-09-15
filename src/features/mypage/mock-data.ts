// No backend API exists yet for badges/activity summary (streak, monthly
// heatmap and recent activity now come from GET /api/v1/workouts/activity —
// see api.ts) — this file stands in for the rest until the real endpoints
// land.

export type Badge = {
  id: string;
  name: string;
  acquired: boolean;
};

export const MOCK_BADGES: Badge[] = [
  { id: "1", name: "뱃지명", acquired: true },
  { id: "2", name: "뱃지명", acquired: true },
  { id: "3", name: "뱃지명", acquired: false },
  { id: "4", name: "뱃지명", acquired: true },
  { id: "5", name: "뱃지명", acquired: false },
  { id: "6", name: "뱃지명", acquired: false },
];

// 활동 리포트 탭의 "최근 활동" 목록에서 아직 사용 중 — 마이페이지 활동 기록
// 탭의 최근 활동 카드는 GET /api/v1/workouts/activity의 recentActivities를
// 쓴다.
export type RecentActivityRow = {
  date: string;
  category: string;
  detail: string;
};

export const MOCK_RECENT_ACTIVITY: RecentActivityRow[] = [
  { date: "8.30", category: "운동 계획1", detail: "30분 걷기" },
  { date: "8.30", category: "운동 계획1", detail: "30분 걷기" },
  { date: "8.29", category: "데일리 미션", detail: "산책하기" },
  { date: "8.29", category: "데일리 미션", detail: "산책하기" },
  { date: "8.29", category: "데일리 미션", detail: "산책하기" },
];

export const MOCK_ACTIVITY_COMPOSITION = {
  workoutPlanCount: 3,
  dailyMissionCount: 2,
};

export type ActivityPeriod = "week" | "month" | "year";

export const MOCK_ACTIVITY_SERIES: Record<
  ActivityPeriod,
  { current: number[]; previous: number[] }
> = {
  week: {
    current: [10, 30, 20, 60, 40, 70, 50],
    previous: [20, 25, 35, 45, 55, 40, 30],
  },
  month: {
    current: [10, 45, 30, 90, 55, 20],
    previous: [25, 40, 50, 65, 45, 58],
  },
  year: { current: [80], previous: [30] },
};

export const MOCK_ACTIVITY_COMPARISON: Record<
  ActivityPeriod,
  { title: string; description: string; diffLabel: string }
> = {
  week: {
    title: "주간 활동 요약",
    description: "저번주와 이번주의 기록을 비교해봤어요!",
    diffLabel: "5번",
  },
  month: {
    title: "월간 활동 요약",
    description: "저번달과 이번달의 기록을 비교해봤어요!",
    diffLabel: "20번",
  },
  year: {
    title: "올해 활동 요약",
    description: "작년과 올해의 기록을 비교해봤어요!",
    diffLabel: "20번",
  },
};
