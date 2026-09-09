import { create } from "zustand";

// 홈 헤더의 알림 아이콘과 알림함 화면이 같은 안 읽은 개수를 보도록 공유하는
// 최소 상태. 목록 자체는 화면 local state로 두고 개수만 공유한다. 사용자별
// 값이므로 persist하지 않는다 — 앱을 다시 켜면 0에서 시작해 서버 값으로
// 채워지고, 로그아웃 후에는 useUnreadPushCount가 0으로 되돌린다.
type UnreadPushCountState = {
  unreadCount: number;
  setUnreadCount: (unreadCount: number) => void;
  decrementUnreadCount: () => void;
};

export const useUnreadPushCountStore = create<UnreadPushCountState>()(
  (set) => ({
    unreadCount: 0,
    setUnreadCount: (unreadCount) =>
      set({ unreadCount: Math.max(0, unreadCount) }),
    decrementUnreadCount: () =>
      set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  }),
);
