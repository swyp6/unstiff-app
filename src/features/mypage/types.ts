import type { ImageSourcePropType } from "react-native";

import type { ExerciseMeasuresDto } from "@/features/workout-plan/types";
import type { WorkoutHistoryResponse } from "@/features/workout-history/types";

// DTOs mirroring the 마이페이지 활동 기록 API (see swagger:
// /api/v1/workouts/activity). `days` only includes dates that have at least
// one record — any other date in the requested month is absent from the array
// and should be treated as recordCount 0.
export type WorkoutActivityDay = {
  date: string; // "YYYY-MM-DD"
  recordCount: number;
};

// GET /api/v1/workouts/activity
export type WorkoutActivityResponse = {
  // 현재 연속 활동 일수. 조회하는 year/month와 무관하게 요청 시점 서버 날짜
  // 기준으로 서버가 계산한 값 — 프론트에서 days로 다시 계산하지 않는다.
  streakDays: number;
  // 지금까지의 최장 연속 활동 일수. streakDays와 마찬가지로 서버 계산값.
  maxStreakDays: number;
  days: WorkoutActivityDay[];
  // 요청 시점 기준 최근 운동 기록 최대 5건, 최신 순. 서버가 이미 정렬/제한한
  // 그대로 렌더링한다 — 프론트에서 다시 정렬하거나 slice하지 않는다. 항목
  // 구조는 GET /api/v1/workouts?date=의 WorkoutHistoryResponse와 같다.
  recentActivities: WorkoutHistoryResponse[];
};

// GET /api/v1/workouts/report의 구간 하나. period는 주간/월간은 "YYYY-MM-DD",
// 연간은 "YYYY-MM". exercises는 그 구간에 실제 기록된 운동 종류만 키로 갖고
// 값 없는 측정 항목은 키 자체가 없다.
export type WorkoutReportBucket = {
  period: string;
  exercises: Record<string, ExerciseMeasuresDto>;
};

export type WorkoutReportSummary = {
  activeDays: number;
  recordCount: number;
  measureCount: number;
};

// GET /api/v1/workouts/report
export type WorkoutReportResponse = {
  // 그 기간에 기록된 운동 종류. 고른 것과 무관하게 항상 전체가 오고
  // 가나다순이다 — 칩 목록을 그릴 때 이 값을 쓴다.
  exerciseTypes: string[];
  summary: WorkoutReportSummary;
  // 기록이 없는 구간은 담기지 않는다 — 빈 날짜를 채워 그리려면 호출부에서
  // 조회 범위를 직접 순회해야 한다.
  buckets: WorkoutReportBucket[];
};

// 마이페이지 "획득한 뱃지" (#220). 서버는 code(번호)와 획득 여부/진행도만
// 주고, 이미지·이름·문구는 앱이 code로 BADGE_CATALOG(badges-catalog.ts)에서
// 찾는다 — GET /api/v1/badges 설명의 대응표 그대로.
export type BadgeCatalogEntry = {
  code: number;
  name: string;
  description: string;
  // 그리드 카드용 짧은 요약, 예: "3일 연속"
  conditionSummary: string;
  // 상세 모달/축하 화면용 전체 문장, 예: "3일 연속 운동이나 미션 완료"
  conditionLabel: string;
  image: ImageSourcePropType;
};

// GET /api/v1/badges 응답의 항목 하나. earnedAt이 null이면 미획득.
export type BadgeListItem = {
  code: number;
  earnedAt: string | null; // ISO date-time
};

// GET /api/v1/badges/{code} — 미획득 뱃지 진행 막대용 상세.
export type BadgeDetailResponse = {
  code: number;
  earnedAt: string | null; // ISO date-time
  current: number;
  goal: number;
};

// 화면에서 실제로 쓰는 뱃지 = 카탈로그(이미지/문구) + 서버 상태(획득 여부·
// 진행도)를 합친 것. progress는 상세 API를 따로 불러야 채워지므로, 목록
// 화면에서는 항상 null이다가 상세 모달을 열 때 채워진다.
export type Badge = BadgeCatalogEntry & {
  earned: boolean;
  earnedAt: string | null; // ISO date-time
  progress: { current: number; goal: number } | null;
};
