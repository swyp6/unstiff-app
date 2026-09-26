import { useEffect, useState } from "react";

import { getWorkoutReport } from "@/features/mypage/api";
import type { WorkoutReportResponse } from "@/features/mypage/types";

// 활동 리포트 탭의 통계 조회. 기간이나 운동 종류 필터가 바뀔 때마다
// 다시 조회하고, 재조회 중에는 직전 성공 데이터를 그대로 보여준다 —
// use-workout-activity.ts와 같은 패턴.
//
// report/error를 그 응답을 만든 요청의 키(requestKey)와 함께 저장해두고,
// 지금 파라미터로 만든 키와 일치할 때만 loadError를 노출한다 — 그냥
// report만 유지했다면, 기간을 옮긴 새 조회가 실패했을 때 report는 이전
// 기간 데이터로 남아있는데 새 기간 제목 아래 그 데이터가 계속 보이고,
// !report일 때만 뜨는 에러 문구는 가려서 뜨지 않는 문제가 있었다.
// isStale로 호출부가 "지금 보여주는 report가 최신 요청 결과인지"를
// 구분할 수 있게 한다.
export function useWorkoutReport(
  from: string,
  to: string,
  exerciseTypes: string[] | undefined,
) {
  const [state, setState] = useState<{
    key: string;
    report: WorkoutReportResponse | null;
    error: boolean;
  }>({ error: false, key: "", report: null });
  // 배열 레퍼런스는 렌더마다 새로 만들어지기 쉬워 join한 문자열을 의존값으로
  // 쓴다 — 내용이 같으면 재조회하지 않는다.
  const exerciseTypesKey = exerciseTypes?.join(",") ?? "";
  const requestKey = `${from}|${to}|${exerciseTypesKey}`;

  useEffect(() => {
    let cancelled = false;
    getWorkoutReport(
      from,
      to,
      exerciseTypesKey ? exerciseTypesKey.split(",") : undefined,
    )
      .then((response) => {
        if (cancelled) return;
        setState({ error: false, key: requestKey, report: response });
      })
      .catch((error) => {
        console.error("Failed to load workout report", error);
        if (!cancelled) {
          setState((prev) => ({ ...prev, error: true, key: requestKey }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, exerciseTypesKey, requestKey]);

  const isCurrent = state.key === requestKey;
  return {
    isStale: !isCurrent,
    loadError: isCurrent && state.error,
    report: state.report,
  };
}
