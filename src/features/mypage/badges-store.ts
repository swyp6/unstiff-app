import { create } from "zustand";

import { MOCK_BADGES } from "@/features/mypage/badges-mock";
import type { Badge } from "@/features/mypage/types";

// #220 — 목데이터를 API처럼 mutable하게 쓰기 위한 껍데기. 실제 연동 시
// badges: MOCK_BADGES 초기값과 이 store 자체를 GET/PUT 훅으로 바꾸고,
// earnBadge는 지운다(신규 획득은 서버 응답을 다시 불러와 반영).
type BadgesState = {
  badges: Badge[];
  earnBadge: (id: string, earnedAt: string) => void;
};

export const useBadgesStore = create<BadgesState>((set) => ({
  badges: MOCK_BADGES,
  earnBadge: (id, earnedAt) =>
    set((state) => ({
      badges: state.badges.map((badge) =>
        badge.id === id
          ? { ...badge, earned: true, earnedAt, progress: null }
          : badge,
      ),
    })),
}));
