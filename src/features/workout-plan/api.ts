import { apiClient } from "@/lib/api-client";

import type {
  DailyPlanCreateRequest,
  DailyPlanCreateResponse,
  DailyPlanListResponse,
  PlanPresetCreateRequest,
  PlanPresetCreateResponse,
} from "./types";

// POST /api/v1/plan-presets — 루틴 등록
export async function createPlanPreset(request: PlanPresetCreateRequest) {
  const { data } = await apiClient.post<PlanPresetCreateResponse>(
    "/api/v1/plan-presets",
    request,
  );
  return data;
}

// POST /api/v1/daily-plans — 오늘의 운동 등록
export async function createDailyPlan(request: DailyPlanCreateRequest) {
  const { data } = await apiClient.post<DailyPlanCreateResponse>(
    "/api/v1/daily-plans",
    request,
  );
  return data;
}

// GET /api/v1/daily-plans?date= — 날짜별 오늘의 운동 조회
export async function getDailyPlans(date: string) {
  const { data } = await apiClient.get<DailyPlanListResponse>(
    "/api/v1/daily-plans",
    { params: { date } },
  );
  return data;
}
