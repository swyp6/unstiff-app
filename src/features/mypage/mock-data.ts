// No backend API exists yet for nickname/streak/badges/activity summary
// (UserProfile only has id/authType/createdAt/updatedAt) — this file stands
// in for that data until the real endpoints land.

// Must satisfy NICKNAME_FORMAT_PATTERN (features/auth/nickname-validation.ts)
// — English/digits/`. _ -` only, no space — since this doubles as a valid
// starting value on the edit screen.
export const MOCK_NICKNAME = "user_nickname";

// true/false = recorded/unrecorded day; null = outside the selected month
// (a leading/trailing calendar cell), rendered blank rather than as a dot.
export type DayCell = boolean | null;
export type WeekDots = DayCell[]; // 7 entries, Sun–Sat

export type StreakMonthData = {
  currentStreakDays: number;
  thisMonthPercent: number;
  lastMonthPercent: number;
  weeks: WeekDots[];
};

// ponytail: deterministic pseudo-random from the month index so every month
// the user navigates to shows *some* data, without a real backend to ask.
function seededPercent(seed: number) {
  return (Math.abs(Math.sin(seed) * 10000) % 100) | 0;
}

export function getStreakDataForMonth(
  year: number,
  month: number, // 1-12
): StreakMonthData {
  const seed = year * 12 + month;
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const rowCount = Math.ceil((firstWeekday + daysInMonth) / 7);

  const weeks: WeekDots[] = Array.from({ length: rowCount }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const dayOfMonth = weekIndex * 7 + dayIndex - firstWeekday + 1;
      if (dayOfMonth < 1 || dayOfMonth > daysInMonth) return null;
      return seededPercent(seed + dayOfMonth) > 40;
    }),
  );
  const thisMonthPercent = seededPercent(seed);
  const lastMonthPercent = seededPercent(seed - 1);

  return {
    currentStreakDays: 1,
    thisMonthPercent,
    lastMonthPercent,
    weeks,
  };
}

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
