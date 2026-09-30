import {
  getAnalytics,
  logEvent as logFirebaseEvent,
  setUserId,
} from "@react-native-firebase/analytics";

export function logEvent(name: string, params?: Record<string, unknown>) {
  return logFirebaseEvent(getAnalytics(), name, params);
}

// 로그인 세션 단위로 서버 user id를 연결한다 — 이벤트 payload마다 user_id를
// 넣지 않고, 설정 이후 전송되는 이벤트에 Firebase가 붙여 준다. 로그아웃 시 null.
export function setAnalyticsUserId(userId: string | null) {
  return setUserId(getAnalytics(), userId);
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
