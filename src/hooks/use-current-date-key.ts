import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { addDays, toDateKey } from "@/features/calendar/date";

// 서버는 "오늘"을 Asia/Seoul Clock으로 판단한다(unstiff-api ClockConfig).
// 한국 표준시는 서머타임이 없는 고정 UTC+9라 외부 라이브러리 없이 오프셋만
// 더해 계산한다 — 기기 timezone이 한국이 아니거나 실행 중에 바뀌어도 서버와
// 같은 순간에 날짜가 넘어간다.
const SERVER_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 서버 기준 지금의 "YYYY-MM-DD". 오프셋을 더한 시각을 UTC로 읽으면 곧
// 서울 시각이다.
export function getServerDateKey(): string {
  return new Date(Date.now() + SERVER_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

function getMsUntilNextServerMidnight(): number {
  return DAY_MS - ((Date.now() + SERVER_UTC_OFFSET_MS) % DAY_MS);
}

// 기기 로컬 기준 — 캘린더(toDateKey/addDays)와 같은 날짜.
function getLocalDateKey(): string {
  return toDateKey(new Date());
}

function getMsUntilNextLocalMidnight(): number {
  const now = new Date();
  return addDays(now, 1).getTime() - now.getTime();
}

// 날짜를 "YYYY-MM-DD" key로 들고 있다가 실제로 바뀔 때만 새 값을 돌려준다 —
// 이 값을 effect dep으로 쓰면 "날짜 변경"이 곧 재실행 신호가 된다.
// - foreground: 다음 자정까지 timer를 걸어 넘어가는 순간 갱신한다.
// - background → active: iOS는 background 동안 JS timer를 신뢰할 수 없어서
//   복귀 시점에 실제 날짜와 다시 비교한다.
// 같은 문자열로 setState하면 React가 리렌더를 건너뛰므로, 같은 날 foreground
// 복귀를 반복해도 이 key를 dep으로 쓰는 쪽은 다시 실행되지 않는다.
function useDateKey(
  getDateKey: () => string,
  getMsUntilNextMidnight: () => number,
): string {
  const [dateKey, setDateKey] = useState(getDateKey);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function scheduleNextMidnight() {
      timer = setTimeout(() => {
        setDateKey(getDateKey());
        scheduleNextMidnight();
      }, getMsUntilNextMidnight());
    }
    scheduleNextMidnight();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") setDateKey(getDateKey());
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [getDateKey, getMsUntilNextMidnight]);

  return dateKey;
}

// 서버(Asia/Seoul) 기준 오늘 — 오늘의 미션처럼 서버가 날짜를 정하는 데이터용.
export function useServerDateKey(): string {
  return useDateKey(getServerDateKey, getMsUntilNextServerMidnight);
}

// 기기 로컬 기준 오늘 — 캘린더 선택 날짜처럼 화면이 로컬 날짜로 그리는 것용.
export function useLocalDateKey(): string {
  return useDateKey(getLocalDateKey, getMsUntilNextLocalMidnight);
}
