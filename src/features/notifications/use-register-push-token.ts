import { useEffect } from "react";
import { Platform } from "react-native";

import { registerPushDevice } from "@/features/notifications/api";
import {
  getFcmToken,
  subscribeToFcmTokenRefresh,
} from "@/features/notifications/push-token";
import { useAuthStore } from "@/store/auth-store";

// Registers this device's FCM token with the backend once the user is
// signed in, and re-registers whenever FCM rotates the token.
export function useRegisterPushToken() {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (Platform.OS === "web" || !accessToken) return;

    getFcmToken()
      .then((token) => {
        console.log("[push] FCM token:", token);
        if (token) return registerPushDevice(token);
      })
      .catch((error) =>
        console.log("[push] failed to register device token", error),
      );

    return subscribeToFcmTokenRefresh((token) => {
      console.log("[push] FCM token refreshed:", token);
      registerPushDevice(token).catch((error) =>
        console.log("[push] failed to register refreshed token", error),
      );
    });
  }, [accessToken]);
}
