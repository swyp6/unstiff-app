// DTOs mirroring the home calendar API (see swagger: CalendarResponse under
// /api/v1/calendar). `days` only includes dates that have a record or a
// pending planned workout — any other date in the month is absent from the
// array and should be treated as recordCount 0 / imageUrl null / hasPlan false.
export type CalendarDay = {
  date: string; // "YYYY-MM-DD"
  imageUrl: string | null;
  recordCount: number;
  hasPlan: boolean;
};

// GET /api/v1/calendar
export type CalendarResponse = {
  // 연속 활동 일수. 조회하는 year/month와 무관하게 요청 시점 서버 날짜
  // 기준으로 서버가 계산한 값 — 프론트에서 다시 계산하지 않는다.
  streakDays: number;
  days: CalendarDay[];
};
