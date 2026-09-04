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

    // Guards against a slow getFcmToken() from a previous account still
    // resolving after accessToken has already changed (e.g. quick
    // logout/login) — without this, a stale call could register the
    // device against whichever account happens to be signed in by the
    // time it finally resolves.
    let cancelled = false;

    getFcmToken()
      .then((token) => {
        if (cancelled || !token) return;
        return registerPushDevice(token);
      })
      .catch((error) =>
        console.log("[push] failed to register device token", error),
      );

    const unsubscribe = subscribeToFcmTokenRefresh((token) => {
      registerPushDevice(token).catch((error) =>
        console.log("[push] failed to register refreshed token", error),
      );
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [accessToken]);
}
