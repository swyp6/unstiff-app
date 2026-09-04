import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onTokenRefresh,
  requestPermission,
} from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";

async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    if (Platform.Version < 33) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const status = await requestPermission(getMessaging());
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
}

// Returns the FCM registration token for this device on both Android and
// iOS (Firebase maps the iOS APNs token to an FCM token internally), or
// null if the user denied the notification permission.
export async function getFcmToken(): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  return getToken(getMessaging());
}

// The backend asks for a re-register whenever FCM rotates the token, not
// just on first issue.
export function subscribeToFcmTokenRefresh(listener: (token: string) => void) {
  return onTokenRefresh(getMessaging(), listener);
}
