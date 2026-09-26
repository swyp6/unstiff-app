import { useSegments } from "expo-router";
import { useEffect } from "react";

import { logScreenView } from "@/features/analytics/analytics";

// useSegments()는 실제 경로가 아니라 파일 세그먼트를 그대로 준다(동적 라우트는
// 값이 아니라 "[id]" 같은 패턴 그대로) — screen_name을 pathname으로 잡으면
// workout-plans/42, workout-plans/43 ...이 GA4에서 전부 다른 화면으로 잡혀서
// 리포트가 무의미해진다.
export function useScreenTracking() {
  const segments = useSegments();
  const screenName = segments.length ? `/${segments.join("/")}` : "/";

  useEffect(() => {
    logScreenView(screenName);
  }, [screenName]);
}
