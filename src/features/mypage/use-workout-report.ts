import { useEffect, useState } from "react";

import { getWorkoutReport } from "@/features/mypage/api";
import type { WorkoutReportResponse } from "@/features/mypage/types";

// 활동 리포트 탭의 통계 조회. 기간이나 운동 종류 필터가 바뀔 때마다
// 다시 조회하고, 재조회 중에는 직전 성공 데이터를 그대로 보여준다 —
// use-workout-activity.ts와 같은 패턴.
export function useWorkoutReport(
  from: string,
  to: string,
  exerciseTypes: string[] | undefined,
) {
  const [report, setReport] = useState<WorkoutReportResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  // 배열 레퍼런스는 렌더마다 새로 만들어지기 쉬워 join한 문자열을 의존값으로
  // 쓴다 — 내용이 같으면 재조회하지 않는다.
  const exerciseTypesKey = exerciseTypes?.join(",") ?? "";

  useEffect(() => {
    let cancelled = false;
    getWorkoutReport(
      from,
      to,
      exerciseTypesKey ? exerciseTypesKey.split(",") : undefined,
    )
      .then((response) => {
        if (cancelled) return;
        setReport(response);
        setLoadError(false);
      })
      .catch((error) => {
        console.error("Failed to load workout report", error);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, exerciseTypesKey]);

  return { report, loadError };
}
