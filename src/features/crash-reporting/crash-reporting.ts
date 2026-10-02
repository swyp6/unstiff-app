import {
  getCrashlytics,
  recordError as recordFirebaseError,
  setCrashlyticsCollectionEnabled,
  setUserId as setFirebaseUserId,
} from "@react-native-firebase/crashlytics";

// getCrashlytics() 최초 호출 시 RNFB가 fatal JS 에러 + unhandled promise
// rejection을 잡는 전역 핸들러를 자동 등록한다(handlers.js의
// setGlobalErrorHandler/setOnUnhandledPromiseRejectionHandler) — 직접
// ErrorUtils를 또 감싸면 fatal 에러가 두 번 기록된다.
//
// 디버그 빌드에선 리로드/개발 중 에러가 노이즈로 쌓이니 수집을 꺼둔다 — 아래
// 함수들은 __DEV__에서도 그대로 호출하지만, 이 설정 때문에 실제로 전송되지는
// 않는다.
setCrashlyticsCollectionEnabled(getCrashlytics(), !__DEV__);

export function recordError(error: Error, jsErrorName?: string) {
  return recordFirebaseError(getCrashlytics(), error, jsErrorName);
}

export function setCrashUserId(userId: string) {
  return setFirebaseUserId(getCrashlytics(), userId);
}
