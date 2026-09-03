export const MOCK_NICKNAME = "사용자 닉네임";

export const MOCK_STREAK = {
  currentStreakDays: 1,
  monthLabel: "2026년 8월",
  thisMonthRate: 58,
  lastMonthRate: 45,
  weeks: [
    {
      label: "1주차",
      // 일 월 화 수 목 금 토
      recorded: [true, false, true, true, false, false, true],
    },
    {
      label: "2주차",
      recorded: [true, true, true, false, true, true, false],
    },
    {
      label: "3주차",
      recorded: [false, false, false, true, false, false, false],
    },
    {
      label: "4주차",
      recorded: [false, false, false, false, false, false, false],
    },
  ],
} as const;

export const WEEKDAY_LABELS = [
  "일",
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
] as const;

export type BadgeStatus = "acquired" | "locked";

export type Badge = {
  id: string;
  name: string;
  status: BadgeStatus;
};

export const MOCK_BADGES: Badge[] = [
  { id: "badge-1", name: "첫 걸음", status: "acquired" },
  { id: "badge-2", name: "3일 연속", status: "acquired" },
  { id: "badge-3", name: "7일 연속", status: "acquired" },
  { id: "badge-4", name: "루틴 메이커", status: "locked" },
  { id: "badge-5", name: "한 달 완주", status: "locked" },
  { id: "badge-6", name: "만보 걷기", status: "locked" },
];

export type ActivityPeriod = "주" | "달" | "년";

export const MOCK_ACTIVITY = {
  totalDays: 4,
  deltaLabel: "이전 기간보다 +1일",
  weekly: [1, 4, 2, 5, 1, 2, 0],
  workoutPlanCount: 3,
  dailyMissionCount: 2,
  recent: [
    { date: "8.30", type: "운동 계획", detail: "30분 걷기" },
    { date: "8.29", type: "데일리 미션", detail: "산책하기" },
  ],
} as const;
