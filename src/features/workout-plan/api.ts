import { apiClient } from "@/lib/api-client";

import type {
  DailyPlanCreateRequest,
  DailyPlanCreateResponse,
  DailyPlanListResponse,
  DailyPlanUpdateRequest,
  PlanPresetCreateRequest,
  PlanPresetCreateResponse,
  PlanPresetListResponse,
  PlanPresetUpdateRequest,
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

// GET /api/v1/plan-presets — 루틴 목록 조회
export async function getPlanPresets() {
  const { data } = await apiClient.get<PlanPresetListResponse>(
    "/api/v1/plan-presets",
  );
  return data;
}

// PUT /api/v1/plan-presets/{id} — 루틴 수정
export async function updatePlanPreset(
  id: number,
  request: PlanPresetUpdateRequest,
) {
  await apiClient.put(`/api/v1/plan-presets/${id}`, request);
}

// PUT /api/v1/daily-plans/{id} — 오늘의 운동 수정
export async function updateDailyPlan(
  id: number,
  request: DailyPlanUpdateRequest,
) {
  await apiClient.put(`/api/v1/daily-plans/${id}`, request);
}

// DELETE /api/v1/plan-presets/{id} — 루틴 삭제
export async function deletePlanPreset(id: number) {
  await apiClient.delete(`/api/v1/plan-presets/${id}`);
}

// DELETE /api/v1/daily-plans/{id} — 오늘의 운동에서 제외
export async function deleteDailyPlan(id: number) {
  await apiClient.delete(`/api/v1/daily-plans/${id}`);
}
