import { toDateKey } from "@/features/calendar/date";
import { platformKeyValueStorage } from "@/lib/persisted-storage";

import type { StopwatchState } from "./components/home-workout-cards";

// 서버는 스톱워치 경과 시간을 들고 있지 않아(GET/PUT /api/v1/daily-plans는
// stopwatchEnabled만 있다) 앱을 껐다 켜면 원래 00:00으로 리셋된다 — 그걸
// 막으려고 로컬에만 하루치를 저장해둔다. 날짜가 바뀌면 그냥 안 읽는(=버리는)
// 방식이라 자정 타이머 같은 게 따로 필요 없다.
const STORAGE_KEY = "today-stopwatch-progress";

type StoredProgress = {
  date: string; // YYYY-MM-DD
  byInstanceId: Record<string, StopwatchState>;
};

export async function loadTodayStopwatchProgress(): Promise<
  Record<string, StopwatchState>
> {
  try {
    const raw = await platformKeyValueStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: StoredProgress = JSON.parse(raw);
    if (parsed.date !== toDateKey(new Date())) return {};
    return parsed.byInstanceId;
  } catch {
    return {};
  }
}

export function saveTodayStopwatchProgress(
  byInstanceId: Record<string, StopwatchState>,
) {
  const payload: StoredProgress = {
    date: toDateKey(new Date()),
    byInstanceId,
  };
  platformKeyValueStorage
    .setItem(STORAGE_KEY, JSON.stringify(payload))
    .catch(() => {
      // 저장 실패는 다음 재시작 때 00:00으로 리셋되는 정도라 무시한다.
    });
}
