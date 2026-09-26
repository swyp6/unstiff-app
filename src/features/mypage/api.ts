import { apiClient } from "@/lib/api-client";

import type { WorkoutActivityResponse, WorkoutReportResponse } from "./types";

// GET /api/v1/workouts/activity — 마이페이지 활동 기록 조회 (연속 기록 +
// 해당 월에 기록이 있는 날짜별 기록 수). 홈 캘린더의 /api/v1/calendar와는
// 다른 엔드포인트다.
export async function getWorkoutActivity(year: number, month: number) {
  const { data } = await apiClient.get<WorkoutActivityResponse>(
    "/api/v1/workouts/activity",
    { params: { year, month } },
  );
  return data;
}

// GET /api/v1/workouts/report — 마이페이지 활동 리포트 조회. exerciseTypes를
// 생략하면 전체 종류로 집계한다(스웨거 규칙: 전체를 골랐을 때/처음 열 때는
// 이 값을 빼고 보낸다).
//
// axios 기본 직렬화는 배열을 exerciseTypes[]=a&exerciseTypes[]=b 처럼
// 대괄호를 붙여 보낸다 — 스웨거가 요구하는 exerciseTypes=a&exerciseTypes=b
// (대괄호 없이 반복되는 키)와 달라서, 종류를 하나라도 제외하면 서버가
// exerciseTypes를 하나도 못 읽고 "그 종류들만" 필터링한 게 되어 항상 빈
// 결과가 돌아왔다. paramsSerializer.indexes: null로 대괄호를 끈다.
export async function getWorkoutReport(
  from: string,
  to: string,
  exerciseTypes?: string[],
) {
  const { data } = await apiClient.get<WorkoutReportResponse>(
    "/api/v1/workouts/report",
    {
      params: { from, to, exerciseTypes },
      paramsSerializer: { indexes: null },
    },
  );
  return data;
}
