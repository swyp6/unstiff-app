import type { WorkoutActivityDay } from "./types";

// 0 = unrecorded day, 1-5 = recorded-day intensity (matches the Figma
// heatmap's 5 Orange shades); null = outside the selected month (a
// leading/trailing calendar cell), rendered blank rather than as a dot.
export type HeatmapLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type DayCell = HeatmapLevel | null;
export type WeekDots = DayCell[]; // 7 entries, Sun–Sat

const MAX_HEATMAP_LEVEL: HeatmapLevel = 5;

// 하루 기록 수를 그대로 명도 단계로 쓰되, UI가 가진 5단계를 넘는 값(6개,
// 10개 …)은 최대 단계에서 포화시킨다.
export function toHeatmapLevel(recordCount: number): HeatmapLevel {
  if (recordCount <= 0) return 0;
  if (recordCount >= MAX_HEATMAP_LEVEL) return MAX_HEATMAP_LEVEL;
  return recordCount as HeatmapLevel;
}

// 서버 date("YYYY-MM-DD")와 같은 포맷의 키를 로컬 필드로 직접 만든다 —
// new Date("YYYY-MM-DD")는 UTC로 해석돼 timezone에 따라 하루가 밀릴 수 있어
// 문자열끼리 비교한다.
function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// 요청한 월의 모든 날짜를 달력 행(일~토) 단위로 펼치고, 서버가 내려준
// 기록 있는 날짜만 recordCount 기반 명도로 채운다. 나머지 날은 0(회색 점),
// 월 밖의 leading/trailing 셀은 null(빈 칸).
export function buildHeatmapWeeks(
  year: number,
  month: number, // 1-12
  days: WorkoutActivityDay[],
): WeekDots[] {
  const recordCountByDate = new Map<string, number>();
  for (const day of days) {
    recordCountByDate.set(day.date, day.recordCount);
  }

  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const rowCount = Math.ceil((firstWeekday + daysInMonth) / 7);

  return Array.from({ length: rowCount }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const dayOfMonth = weekIndex * 7 + dayIndex - firstWeekday + 1;
      if (dayOfMonth < 1 || dayOfMonth > daysInMonth) return null;
      return toHeatmapLevel(
        recordCountByDate.get(toDateKey(year, month, dayOfMonth)) ?? 0,
      );
    }),
  );
}
