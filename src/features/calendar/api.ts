import { apiClient } from "@/lib/api-client";

import type { CalendarResponse } from "./types";

// GET /api/v1/calendar — 월별 달력 조회 (스트릭 + 기록/예정 운동이 있는 날짜)
export async function getCalendarMonth(year: number, month: number) {
  const { data } = await apiClient.get<CalendarResponse>("/api/v1/calendar", {
    params: { year, month },
  });
  return data;
}
