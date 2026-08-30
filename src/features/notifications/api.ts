import { Platform } from "react-native";

export type PushNotificationErrorCode =
  "UNSUPPORTED_PLATFORM" | "PERMISSION_DENIED" | "TOKEN_FETCH_FAILED";

export class PushNotificationError extends Error {
  constructor(
    public readonly code: PushNotificationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PushNotificationError";
  }
}

function isSupportedPlatform() {
  return Platform.OS === "ios" || Platform.OS === "android";
}

async function requestAndroidPermission(): Promise<boolean> {
  if (Platform.OS !== "android" || Platform.Version < 33) return true;

  const { PermissionsAndroid } = await import("react-native");
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isSupportedPlatform()) return false;

  try {
    if (!(await requestAndroidPermission())) return false;

    const { getMessaging, requestPermission, AuthorizationStatus } =
      await import("@react-native-firebase/messaging");
    const authStatus = await requestPermission(getMessaging());

    return (
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    throw new PushNotificationError(
      "PERMISSION_DENIED",
      "알림 권한 요청 중 오류가 발생했습니다.",
      { cause: error },
    );
  }
}

export async function getFcmToken(): Promise<string> {
  if (!isSupportedPlatform()) {
    throw new PushNotificationError(
      "UNSUPPORTED_PLATFORM",
      "이 플랫폼에서는 푸시 알림을 사용할 수 없습니다.",
    );
  }

  try {
    const {
      getMessaging,
      getToken,
      registerDeviceForRemoteMessages,
      isDeviceRegisteredForRemoteMessages,
    } = await import("@react-native-firebase/messaging");
    const messagingInstance = getMessaging();

    if (
      Platform.OS === "ios" &&
      !isDeviceRegisteredForRemoteMessages(messagingInstance)
    ) {
      await registerDeviceForRemoteMessages(messagingInstance);
    }

    return await getToken(messagingInstance);
  } catch (error) {
    if (error instanceof PushNotificationError) throw error;

    throw new PushNotificationError(
      "TOKEN_FETCH_FAILED",
      "FCM 토큰을 가져오지 못했습니다.",
      { cause: error },
    );
  }
}

export function onFcmTokenRefresh(
  callback: (token: string) => void,
): () => void {
  if (!isSupportedPlatform()) return () => {};

  let unsubscribe: (() => void) | undefined;
  let cancelled = false;

  import("@react-native-firebase/messaging").then(
    ({ getMessaging, onTokenRefresh }) => {
      if (cancelled) return;
      unsubscribe = onTokenRefresh(getMessaging(), callback);
    },
  );

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export function onForegroundMessage(
  callback: (title: string, body: string) => void,
): () => void {
  if (!isSupportedPlatform()) return () => {};

  let unsubscribe: (() => void) | undefined;
  let cancelled = false;

  import("@react-native-firebase/messaging").then(
    ({ getMessaging, onMessage }) => {
      if (cancelled) return;
      unsubscribe = onMessage(getMessaging(), (remoteMessage) => {
        callback(
          remoteMessage.notification?.title ?? "",
          remoteMessage.notification?.body ?? "",
        );
      });
    },
  );

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}
