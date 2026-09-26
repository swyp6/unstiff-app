import {
  getAnalytics,
  logEvent as logFirebaseEvent,
  logScreenView as logFirebaseScreenView,
} from "@react-native-firebase/analytics";

export function logScreenView(screenName: string) {
  return logFirebaseScreenView(getAnalytics(), { screen_name: screenName });
}

export function logEvent(name: string, params?: Record<string, unknown>) {
  return logFirebaseEvent(getAnalytics(), name, params);
}
