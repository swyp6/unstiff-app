import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { getWorkoutActivity } from "@/features/mypage/api";
import type { WorkoutActivityResponse } from "@/features/mypage/types";

export type WorkoutActivityState = {
  // 마지막으로 성공한 응답과 그 응답을 요청했을 때의 year/month. days는 그
  // 달에만 유효하므로 달력을 그릴 때 response와 함께 묶어서 쓴다. 첫 성공
  // 전에는 null — mock 값으로 대체하지 않는다.
  activity: {
    year: number;
    month: number;
    response: WorkoutActivityResponse;
  } | null;
  // 가장 최근 요청이 실패했는지. 이미 받아둔 activity는 그대로 유지된다.
  loadError: boolean;
};

// 마이페이지 활동 기록(이번 달). 탭 바가 마이페이지를 계속 mounted 상태로
// 두므로 mount 시 한 번이 아니라 화면이 포커스를 받을 때마다 다시 조회한다 —
// 기록 화면에서 새 기록을 저장하고 돌아오면 streak/월 기록/달력이 서버 값으로
// 맞춰진다. 재조회 중에는 직전 성공 데이터를 그대로 보여주고, blur/unmount
// 뒤에 늦게 도착한 응답은 cancelled 플래그로 버린다.
export function useWorkoutActivity(): WorkoutActivityState {
  const [activity, setActivity] =
    useState<WorkoutActivityState["activity"]>(null);
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // 이 화면은 "이번 달"만 보여주므로 포커스 시점의 기기 날짜로 요청한다.
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      let cancelled = false;
      getWorkoutActivity(year, month)
        .then((response) => {
          if (cancelled) return;
          setActivity({ year, month, response });
          setLoadError(false);
        })
        .catch((error) => {
          console.error("Failed to load workout activity", error);
          if (!cancelled) setLoadError(true);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return { activity, loadError };
}
