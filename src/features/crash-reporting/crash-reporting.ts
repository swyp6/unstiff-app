import type { ErrorUtils as RNErrorUtils } from "react-native";

import {
  getCrashlytics,
  recordError as recordFirebaseError,
  setCrashlyticsCollectionEnabled,
  setUserId as setFirebaseUserId,
} from "@react-native-firebase/crashlytics";

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

// RN이 setUpErrorHandling.js에서 전역으로 등록해두는 핸들러 — fatal JS 에러뿐
// 아니라 unhandled promise rejection도 ExceptionsManager를 거쳐 여기로 들어온다
// (promiseRejectionTrackingOptions.js의 onUnhandled가 isFatal=false로 호출).
// 그래서 별도 promise rejection tracking 설정 없이 이 핸들러 하나로 둘 다 잡힌다.
const errorUtils = (globalThis as unknown as { ErrorUtils: RNErrorUtils })
  .ErrorUtils;
const defaultGlobalHandler = errorUtils.getGlobalHandler();

errorUtils.setGlobalHandler((error, isFatal) => {
  recordError(error, isFatal ? "Fatal JS Error" : "Unhandled Rejection");
  defaultGlobalHandler(error, isFatal);
});
