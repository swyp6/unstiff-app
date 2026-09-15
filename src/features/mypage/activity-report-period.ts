// 활동 리포트의 기간(주간/월간/연간) 계산. 날짜는 전부 "달력 날짜"(year /
// month 1-12 / day)로만 다루고 Date 객체는 요일·월 일수 계산에만 로컬로
// 만든다 — 서버 createdAt("2026-09-10T13:24:30", timezone 없음)을
// new Date()로 파싱하면 UTC 해석으로 하루가 밀릴 수 있어서다.
//
// 주차 규칙(서비스 확정): 월 단위로 주차를 나누며, 매월 1일부터 첫 번째
// 일요일까지가 1주차, 그 뒤는 월~일 단위, 마지막 주차는 그 달 마지막 날까지.
// 다른 달의 날짜는 절대 섞이지 않는다 (ISO week 아님).

export type CalendarDate = { year: number; month: number; day: number };

export type ActivityPeriodMode = "week" | "month" | "year";

export type ActivityPeriod =
  | { mode: "week"; year: number; month: number; week: number }
  | { mode: "month"; year: number; month: number }
  | { mode: "year"; year: number };

export type CalendarDateRange = { start: CalendarDate; end: CalendarDate };

// "YYYY-MM-DD" 또는 "YYYY-MM-DDTHH:mm:ss" 앞부분만 잘라 숫자로 읽는다.
export function parseCalendarDate(value: string): CalendarDate | null {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

export function todayCalendarDate(now = new Date()): CalendarDate {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

export function toDateKey({ year, month, day }: CalendarDate): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function compareCalendarDate(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// 그 달 첫 번째 일요일의 일자. 1일이 일요일이면 1 — 그 하루만 1주차다.
function firstSundayOfMonth(year: number, month: number): number {
  const weekdayOfFirst = new Date(year, month - 1, 1).getDay(); // 0=Sun
  return weekdayOfFirst === 0 ? 1 : 8 - weekdayOfFirst;
}

export function getWeekOfMonth({ year, month, day }: CalendarDate): number {
  const firstSunday = firstSundayOfMonth(year, month);
  if (day <= firstSunday) return 1;
  return 2 + Math.floor((day - firstSunday - 1) / 7);
}

export function getWeekCount(year: number, month: number): number {
  return getWeekOfMonth({ year, month, day: daysInMonth(year, month) });
}

export function getWeekRange(
  year: number,
  month: number,
  week: number,
): CalendarDateRange {
  const firstSunday = firstSundayOfMonth(year, month);
  const lastDay = daysInMonth(year, month);
  if (week <= 1) {
    return {
      start: { year, month, day: 1 },
      end: { year, month, day: firstSunday },
    };
  }
  const startDay = firstSunday + 1 + (week - 2) * 7;
  return {
    start: { year, month, day: startDay },
    end: { year, month, day: Math.min(startDay + 6, lastDay) },
  };
}

function previousMonth(year: number, month: number) {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 };
}

function nextMonth(year: number, month: number) {
  return month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 };
}

// 어떤 날짜가 속한 기간.
export function periodOf(
  mode: ActivityPeriodMode,
  date: CalendarDate,
): ActivityPeriod {
  switch (mode) {
    case "week":
      return {
        mode,
        year: date.year,
        month: date.month,
        week: getWeekOfMonth(date),
      };
    case "month":
      return { mode, year: date.year, month: date.month };
    case "year":
      return { mode, year: date.year };
  }
}

// 주간은 월 경계를 넘어 이전 달의 마지막 주차 / 다음 달의 1주차로 이어진다.
export function previousPeriod(period: ActivityPeriod): ActivityPeriod {
  switch (period.mode) {
    case "week": {
      if (period.week > 1) return { ...period, week: period.week - 1 };
      const { year, month } = previousMonth(period.year, period.month);
      return { mode: "week", year, month, week: getWeekCount(year, month) };
    }
    case "month":
      return { mode: "month", ...previousMonth(period.year, period.month) };
    case "year":
      return { mode: "year", year: period.year - 1 };
  }
}

export function nextPeriod(period: ActivityPeriod): ActivityPeriod {
  switch (period.mode) {
    case "week": {
      if (period.week < getWeekCount(period.year, period.month)) {
        return { ...period, week: period.week + 1 };
      }
      const { year, month } = nextMonth(period.year, period.month);
      return { mode: "week", year, month, week: 1 };
    }
    case "month":
      return { mode: "month", ...nextMonth(period.year, period.month) };
    case "year":
      return { mode: "year", year: period.year + 1 };
  }
}

// 같은 mode끼리만 비교한다(음수: a가 과거).
export function comparePeriod(a: ActivityPeriod, b: ActivityPeriod): number {
  if (a.mode !== b.mode) {
    throw new Error(`Cannot compare ${a.mode} period with ${b.mode} period`);
  }
  if (a.mode === "week" && b.mode === "week") {
    return a.year - b.year || a.month - b.month || a.week - b.week;
  }
  if (a.mode === "month" && b.mode === "month") {
    return a.year - b.year || a.month - b.month;
  }
  return a.year - b.year;
}

export function periodRange(period: ActivityPeriod): CalendarDateRange {
  switch (period.mode) {
    case "week":
      return getWeekRange(period.year, period.month, period.week);
    case "month":
      return {
        start: { year: period.year, month: period.month, day: 1 },
        end: {
          year: period.year,
          month: period.month,
          day: daysInMonth(period.year, period.month),
        },
      };
    case "year":
      return {
        start: { year: period.year, month: 1, day: 1 },
        end: { year: period.year, month: 12, day: 31 },
      };
  }
}

export function periodLabel(period: ActivityPeriod): string {
  switch (period.mode) {
    case "week":
      return `${period.year}년 ${period.month}월 ${period.week}주차`;
    case "month":
      return `${period.year}년 ${period.month}월`;
    case "year":
      return `${period.year}년`;
  }
}

// 실제 조회 범위 — 기간 시작보다 가입일이 늦으면 가입일부터, 기간 끝이
// 미래면 오늘까지. GET /api/v1/workouts/stats?from=&to= 에 그대로 넣을 수
// 있는 "YYYY-MM-DD" 쌍.
export function effectivePeriodRange(
  period: ActivityPeriod,
  signupDate: CalendarDate,
  today: CalendarDate,
): { from: string; to: string } {
  const { start, end } = periodRange(period);
  const from = compareCalendarDate(signupDate, start) > 0 ? signupDate : start;
  const to = compareCalendarDate(end, today) > 0 ? today : end;
  return { from: toDateKey(from), to: toDateKey(to) };
}
