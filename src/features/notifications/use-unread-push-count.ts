import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { getUnreadPushCount } from "@/features/notifications/api";
import { useUnreadPushCountStore } from "@/features/notifications/unread-count-store";
import { useAuthStore } from "@/store/auth-store";

// 홈 헤더에서 쓰는 안 읽은 알림 개수. 화면이 포커스를 받을 때마다 다시 조회하기
// 때문에 알림함에서 읽고 돌아온 직후에도 서버 값과 어긋나지 않는다(알림함에서의
// 개별/전체 읽음은 store를 직접 갱신하므로 그 사이에도 즉시 반영된다).
export function useUnreadPushCount() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const unreadCount = useUnreadPushCountStore((state) => state.unreadCount);
  const setUnreadCount = useUnreadPushCountStore(
    (state) => state.setUnreadCount,
  );

  useFocusEffect(
    useCallback(() => {
      // 로그아웃 직후 이전 사용자의 개수가 남지 않도록 비운다.
      if (!accessToken) {
        setUnreadCount(0);
        return;
      }

      let cancelled = false;
      getUnreadPushCount()
        .then(({ unreadCount: nextCount }) => {
          if (!cancelled) setUnreadCount(nextCount);
        })
        // 개수 조회 실패는 화면을 막을 이유가 없다 — 직전 값을 그대로 둔다.
        .catch(() => {});

      return () => {
        cancelled = true;
      };
    }, [accessToken, setUnreadCount]),
  );

  return unreadCount;
}
