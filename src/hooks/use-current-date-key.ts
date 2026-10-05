import { useEffect, useState } from "react";
import { AppState } from "react-native";

// 서버는 "오늘"을 Asia/Seoul Clock으로 판단한다(unstiff-api ClockConfig).
// 한국 표준시는 서머타임이 없는 고정 UTC+9라 외부 라이브러리 없이 오프셋만
// 더해 계산한다 — 기기 timezone이 한국이 아니거나 실행 중에 바뀌어도 서버와
// 같은 순간에 날짜가 넘어간다.
const SERVER_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 자정 timer가 서버 기준 00:00:00 정각에 바로 울리면, 기기와 서버의 미세한
// 시계 차이로 서버가 아직 전날로 판단할 수 있어 살짝 늦게 깨운다.
const MIDNIGHT_BUFFER_MS = 1000;

// 서버 기준 오늘의 "YYYY-MM-DD". 오프셋을 더한 시각을 UTC로 읽으면 곧
// 서울 시각이다.
function getServerDateKey(now: number): string {
  return new Date(now + SERVER_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

function getMsUntilNextServerMidnight(now: number): number {
  return DAY_MS - ((now + SERVER_UTC_OFFSET_MS) % DAY_MS);
}

// 서버 기준 현재 날짜를 "YYYY-MM-DD" key로 들고 있다가, 날짜가 실제로 바뀔
// 때만 새 값을 돌려준다 — 이 값을 effect dep으로 쓰면 "날짜 변경"이 곧 재실행
// 신호가 된다.
// - foreground: 다음 자정까지 timer를 걸어 넘어가는 순간 갱신한다.
// - background → active: iOS는 background 동안 JS timer를 신뢰할 수 없어서
//   복귀 시점에 실제 날짜와 다시 비교한다.
// 같은 문자열로 setState하면 React가 리렌더를 건너뛰므로, 같은 날 foreground
// 복귀를 반복해도 이 key를 dep으로 쓰는 쪽은 다시 실행되지 않는다.
export function useCurrentDateKey(): string {
  const [dateKey, setDateKey] = useState(() => getServerDateKey(Date.now()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function scheduleNextMidnight() {
      const delay =
        getMsUntilNextServerMidnight(Date.now()) + MIDNIGHT_BUFFER_MS;
      timer = setTimeout(() => {
        setDateKey(getServerDateKey(Date.now()));
        scheduleNextMidnight();
      }, delay);
    }
    scheduleNextMidnight();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") setDateKey(getServerDateKey(Date.now()));
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return dateKey;
}
