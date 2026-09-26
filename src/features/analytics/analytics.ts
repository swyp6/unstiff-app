import {
  getAnalytics,
  logEvent as logFirebaseEvent,
} from "@react-native-firebase/analytics";

export function logEvent(name: string, params?: Record<string, unknown>) {
  return logFirebaseEvent(getAnalytics(), name, params);
}

// GA4 이벤트 이름 40자 제한 때문에 버튼 이벤트 이름엔 페이지명을 넣지 않는다 —
// 같은 동작(재시도, 사진삭제 등)은 여러 화면에서 event_id를 재사용하고 page_id로
// 구분한다. 전체 카탈로그: Notion "GA4 이벤트 정의" 문서 참고.
export function trackClick(pageId: string, buttonId: string) {
  return logEvent(`app_${buttonId}_click`, {
    page_id: pageId,
    button_id: buttonId,
  });
}
