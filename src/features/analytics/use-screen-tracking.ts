import { usePathname } from "expo-router";
import { useEffect } from "react";

import { logEvent } from "@/features/analytics/analytics";
import { getPageId } from "@/features/analytics/page-ids";

// pathname은 그룹((tabs) 등) 제거된 실제 URL이라 동적 라우트도 안전하게 매칭
// 가능 — getPageId가 접두사 매칭(workout-plans/[id] 등)으로 처리한다.
export function useScreenTracking() {
  const pathname = usePathname();

  useEffect(() => {
    const pageId = getPageId(pathname);
    if (!pageId) return;
    logEvent(`app_${pageId}_view`, { page_id: pageId });
  }, [pathname]);
}
