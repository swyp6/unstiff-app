import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

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
  // 이 hook 인스턴스가 마지막으로 조회를 시작한 accessToken.
  const requestedTokenRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      // 로그아웃 직후 이전 사용자의 개수가 남지 않도록 비운다.
      if (!accessToken) {
        requestedTokenRef.current = null;
        setUnreadCount(0);
        return;
      }

      // store는 모듈 스코프라 로그아웃으로 화면이 언마운트돼도 값이 남는다.
      // 이 인스턴스가 아직 한 번도 조회하지 않았다면 남아 있는 값은 이전
      // 계정의 것일 수 있으므로, 새 응답이 도착하기 전에 먼저 비운다 —
      // A 로그아웃 → B 로그인에서 A의 dot이 B 화면에 남는 순간이 없다.
      // (같은 세션에서 서버가 토큰만 재발급한 경우는 이미 조회한 적이 있어
      // 불필요하게 깜빡이지 않는다.)
      if (requestedTokenRef.current === null) setUnreadCount(0);
      requestedTokenRef.current = accessToken;

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
