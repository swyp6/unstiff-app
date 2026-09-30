import { apiClient } from "@/lib/api-client";

import type {
  BadgeDetailResponse,
  BadgeListItem,
  WorkoutActivityResponse,
  WorkoutReportResponse,
} from "./types";

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

// GET /api/v1/badges — 뱃지 전체 목록. "서비스가 제공하는 뱃지를 화면에
// 그릴 순서대로 모두 반환한다"고 스웨거에 명시돼 있어, 응답 배열 순서를
// 그대로 그리드 순서로 쓴다(code로 다시 정렬하지 않는다). 이미지/문구는
// badges-catalog.ts의 BADGE_CATALOG에서 code로 찾는다.
export async function getBadges() {
  const { data } = await apiClient.get<{ badges: BadgeListItem[] }>(
    "/api/v1/badges",
  );
  return data.badges;
}

// GET /api/v1/badges/{code} — 미획득 뱃지의 진행 막대(current/goal)를 그릴
// 때만 부른다. 목록 API는 진행도를 안 준다.
export async function getBadgeDetail(code: number) {
  const { data } = await apiClient.get<BadgeDetailResponse>(
    `/api/v1/badges/${code}`,
  );
  return data;
}
