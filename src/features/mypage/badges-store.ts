import { create } from "zustand";

import { getBadges } from "@/features/mypage/api";
import { BADGE_CATALOG } from "@/features/mypage/badges-catalog";
import type { Badge } from "@/features/mypage/types";

// 마이페이지 뱃지 탭이 로드되면 load()로 GET /api/v1/badges를 부르고,
// 응답의 code+earnedAt을 카탈로그(이미지/문구)와 합쳐 들고 있는다.
// markEarned는 POST /workouts, /plan-presets, /chat/ai/send 응답의
// newBadges를 받았을 때 다시 목록을 불러오지 않고도 그리드에 바로
// 반영하기 위한 낙관적 갱신이다 — 실제 획득 시각은 서버가 알지만 이
// 요청에서 주지 않으므로 지금 시각을 쓴다.
type BadgesState = {
  badges: Badge[];
  isLoading: boolean;
  load: () => Promise<void>;
  markEarned: (codes: number[], earnedAt: string) => void;
};

export const useBadgesStore = create<BadgesState>((set) => ({
  badges: [],
  isLoading: false,
  load: async () => {
    set({ isLoading: true });
    try {
      const items = await getBadges();
      const badges = items.map((item) => ({
        ...BADGE_CATALOG[item.code],
        earned: item.earnedAt !== null,
        earnedAt: item.earnedAt,
        progress: null,
      }));
      set({ badges, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  markEarned: (codes, earnedAt) =>
    set((state) => ({
      badges: state.badges.map((badge) =>
        codes.includes(badge.code)
          ? { ...badge, earned: true, earnedAt, progress: null }
          : badge,
      ),
    })),
}));
