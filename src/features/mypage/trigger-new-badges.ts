import { router } from "expo-router";

import { useBadgeEarnedStore } from "@/features/mypage/badge-earned-store";
import { badgeFromCode } from "@/features/mypage/badges-catalog";
import { useBadgesStore } from "@/features/mypage/badges-store";

// POST /api/v1/workouts, /api/v1/plan-presets, /api/v1/chat/ai/send(대화
// 종료 응답)의 newBadges를 받으면 이 하나만 부르면 된다 — 마이페이지
// 뱃지 목록에 낙관적으로 반영하고, 축하 화면 큐에 넣은 뒤 그 위로 띄운다.
// newBadges가 빈 배열이면 아무 일도 하지 않는다.
export function triggerNewBadges(newBadges: number[]) {
  if (newBadges.length === 0) return;
  const earnedAt = new Date().toISOString();
  useBadgesStore.getState().markEarned(newBadges, earnedAt);

  const badgeEarnedStore = useBadgeEarnedStore.getState();
  badgeEarnedStore.enqueue(
    newBadges.map((code) => badgeFromCode(code, earnedAt)),
  );
  // 화면이 이미 떠 있으면(두 응답이 겹친 경우) 큐에만 더하고 또 push하지
  // 않는다 — 안 그러면 /badge-earned가 중복으로 쌓인다.
  if (!badgeEarnedStore.isScreenActive) {
    badgeEarnedStore.setScreenActive(true);
    router.push("/badge-earned");
  }
}
