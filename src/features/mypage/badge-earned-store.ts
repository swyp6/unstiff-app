import { create } from "zustand";

import type { Badge } from "@/features/mypage/types";

// record-flow-store와 같은 패턴 — 새로 획득한 뱃지를 route param으로
// 보내는 대신 store에 담아 /badge-earned로 넘긴다. newBadges는 "한 번에
// 여러 개가 올 수 있다"고 스웨거에 명시돼 있어 queue로 둔다 — 화면은 항상
// queue[0]만 보여주고, 확인할 때마다 하나씩 dequeue한다.
//
// isScreenActive는 화면이 이미 떠 있는지 표시한다 — 두 요청(예: 채팅 전송과
// 운동 기록 저장)이 거의 동시에 끝나 각자 newBadges를 들고 오면, trigger-
// new-badges.ts가 이 값을 보고 이미 떠 있을 땐 큐에만 추가하고
// router.push를 또 부르지 않는다. 안 그러면 /badge-earned가 중복으로
// 쌓여서, 큐가 다 빌 때 아래에 빈 화면이 하나 더 남는다. badge-earned.tsx가
// mount/unmount 시점에 true/false로 갱신한다.
type BadgeEarnedState = {
  queue: Badge[];
  isScreenActive: boolean;
  enqueue: (badges: Badge[]) => void;
  dequeue: () => void;
  clear: () => void;
  setScreenActive: (active: boolean) => void;
};

export const useBadgeEarnedStore = create<BadgeEarnedState>((set) => ({
  clear: () => set({ queue: [] }),
  dequeue: () => set((state) => ({ queue: state.queue.slice(1) })),
  enqueue: (badges) => set((state) => ({ queue: [...state.queue, ...badges] })),
  isScreenActive: false,
  queue: [],
  setScreenActive: (active) => set({ isScreenActive: active }),
}));
