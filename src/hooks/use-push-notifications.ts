import { useEffect } from "react";

import {
  getFcmToken,
  onFcmTokenRefresh,
  requestNotificationPermission,
} from "@/features/notifications/api";
import { useNotificationStore } from "@/store/notification-store";

export function usePushNotifications() {
  const setPermissionGranted = useNotificationStore(
    (state) => state.setPermissionGranted,
  );
  const setFcmToken = useNotificationStore((state) => state.setFcmToken);

  useEffect(() => {
    let isMounted = true;

    async function register() {
      const granted = await requestNotificationPermission();
      if (!isMounted) return;
      setPermissionGranted(granted);
      if (!granted) return;

      const token = await getFcmToken();
      if (!isMounted) return;
      setFcmToken(token);
    }

    register().catch(() => {
      if (isMounted) setPermissionGranted(false);
    });

    const unsubscribe = onFcmTokenRefresh((token) => {
      setFcmToken(token);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [setFcmToken, setPermissionGranted]);
}
