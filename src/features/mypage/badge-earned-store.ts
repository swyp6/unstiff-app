import { create } from "zustand";

import type { Badge } from "@/features/mypage/types";

// record-flow-store와 같은 패턴 — 새로 획득한 뱃지를 route param으로
// 보내는 대신 store에 담아 /badge-earned로 넘긴다. #220 시점엔 어떤 API
// 응답이 신규 획득을 알려주는지 아직 정해지지 않아, 실제 호출부(운동 기록
// 저장 성공 직후 등)는 연결하지 않은 상태다 — 백엔드 계약이 나오면 그
// 자리에서 show(newlyEarnedBadge) + router.push("/badge-earned")만 붙이면
// 된다.
type BadgeEarnedState = {
  pendingBadge: Badge | null;
  show: (badge: Badge) => void;
  clear: () => void;
};

export const useBadgeEarnedStore = create<BadgeEarnedState>((set) => ({
  clear: () => set({ pendingBadge: null }),
  pendingBadge: null,
  show: (badge) => set({ pendingBadge: badge }),
}));
