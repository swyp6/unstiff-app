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
  useBadgeEarnedStore
    .getState()
    .enqueue(newBadges.map((code) => badgeFromCode(code, earnedAt)));
  router.push("/badge-earned");
}
