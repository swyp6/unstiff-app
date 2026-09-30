import { create } from "zustand";

import type { Badge } from "@/features/mypage/types";

// record-flow-store와 같은 패턴 — 새로 획득한 뱃지를 route param으로
// 보내는 대신 store에 담아 /badge-earned로 넘긴다. newBadges는 "한 번에
// 여러 개가 올 수 있다"고 스웨거에 명시돼 있어 queue로 둔다 — 화면은 항상
// queue[0]만 보여주고, 확인할 때마다 하나씩 dequeue한다.
type BadgeEarnedState = {
  queue: Badge[];
  enqueue: (badges: Badge[]) => void;
  dequeue: () => void;
  clear: () => void;
};

export const useBadgeEarnedStore = create<BadgeEarnedState>((set) => ({
  clear: () => set({ queue: [] }),
  dequeue: () => set((state) => ({ queue: state.queue.slice(1) })),
  enqueue: (badges) => set((state) => ({ queue: [...state.queue, ...badges] })),
  queue: [],
}));
