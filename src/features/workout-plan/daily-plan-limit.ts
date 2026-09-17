import { isAxiosError } from "axios";

// 하루에 담을 수 있는 오늘의 운동 상한. 서버(DailyPlanService.DAILY_PLAN_LIMIT,
// WorkoutHistoryService.DAILY_INSTANT_PLAN_LIMIT)와 같은 값이다.
//
// 서버는 "직접 등록한 계획"(POST /daily-plans)과 "기록으로 만들어진 즉흥 계획"
// (POST /workouts, refId 없음)을 따로 5개씩 세지만, GET /daily-plans 응답은 둘을
// 구분하지 않고 한 목록으로 내려준다. 앱은 홈의 "N / N"처럼 그 목록 길이를
// 오늘 운동 개수로 쓰므로, 제한 판정도 같은 기준(전체 개수)으로 한다.
export const DAILY_PLAN_LIMIT = 5;

// `>=`로 본다 — 비정상적으로 6개 이상 들어가 있어도 추가 진입은 막아야 한다.
export function isWorkoutLimitReached(todayWorkoutCount: number) {
  return todayWorkoutCount >= DAILY_PLAN_LIMIT;
}

// 서버가 하루 상한을 넘겼을 때 내려주는 ProblemDetail의 `code`
// (PlanErrorCode). 둘 다 사용자 입장에서는 "오늘 운동 5개 완료"와 같은
// 상황이라 하나로 묶어 제한 모달로 보낸다. message 문자열은 보지 않는다.
const DAILY_PLAN_LIMIT_ERROR_CODES = new Set([
  "DAILY_PLAN_LIMIT_EXCEEDED", // POST /api/v1/daily-plans
  "INSTANT_PLAN_LIMIT_EXCEEDED", // POST /api/v1/workouts (신규 기록)
]);

export function isDailyPlanLimitError(error: unknown) {
  if (!isAxiosError(error)) return false;
  const code = (error.response?.data as { code?: unknown } | undefined)?.code;
  return typeof code === "string" && DAILY_PLAN_LIMIT_ERROR_CODES.has(code);
}
