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
//
// load()와 markEarned()는 서로 겹칠 수 있다 — 예: 뱃지 탭을 막 연 순간의
// load()가 아직 응답을 안 받았는데, 그사이 다른 화면에서 끝난 POST가
// markEarned()로 방금 딴 뱃지를 낙관적으로 반영한 경우. 그 load()가 늦게
// 돌아오면(아직 획득 전 스냅샷이라) badges를 통째로 덮어써 방금 반영한
// 낙관적 획득 상태를 지울 수 있다. optimisticEarnedAt에 code별로 보류 중인
// 획득 시각을 따로 들고 있다가, load() 결과에 항상 병합한다 — 서버가 그
// code를 직접 확인해주면(응답의 earnedAt이 채워지면) 그때 보류 상태를
// 지운다. loadId는 load() 요청끼리 겹칠 때 더 이전 요청의 응답을 버리는
// 용도다.
type BadgesState = {
  badges: Badge[];
  hasLoaded: boolean;
  isLoading: boolean;
  loadError: boolean;
  optimisticEarnedAt: Record<number, string>;
  load: () => Promise<void>;
  markEarned: (codes: number[], earnedAt: string) => void;
};

let latestLoadId = 0;

export const useBadgesStore = create<BadgesState>((set) => ({
  badges: [],
  hasLoaded: false,
  isLoading: false,
  loadError: false,
  optimisticEarnedAt: {},
  load: async () => {
    const loadId = ++latestLoadId;
    set({ isLoading: true });
    try {
      const items = await getBadges();
      if (loadId !== latestLoadId) return;
      set((state) => {
        const optimisticEarnedAt = { ...state.optimisticEarnedAt };
        const badges = items.map((item) => {
          const earnedAt =
            item.earnedAt ?? optimisticEarnedAt[item.code] ?? null;
          if (item.earnedAt !== null) delete optimisticEarnedAt[item.code];
          return {
            ...BADGE_CATALOG[item.code],
            earned: earnedAt !== null,
            earnedAt,
            progress: null,
          };
        });
        return {
          badges,
          hasLoaded: true,
          isLoading: false,
          loadError: false,
          optimisticEarnedAt,
        };
      });
    } catch {
      if (loadId !== latestLoadId) return;
      set({ hasLoaded: true, isLoading: false, loadError: true });
    }
  },
  markEarned: (codes, earnedAt) =>
    set((state) => {
      const optimisticEarnedAt = { ...state.optimisticEarnedAt };
      for (const code of codes) optimisticEarnedAt[code] = earnedAt;
      return {
        badges: state.badges.map((badge) =>
          codes.includes(badge.code)
            ? { ...badge, earned: true, earnedAt, progress: null }
            : badge,
        ),
        optimisticEarnedAt,
      };
    }),
}));
