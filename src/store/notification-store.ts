import { create } from "zustand";

type NotificationState = {
  permissionGranted: boolean;
  fcmToken: string | null;
  setPermissionGranted: (granted: boolean) => void;
  setFcmToken: (token: string | null) => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  permissionGranted: false,
  fcmToken: null,
  setPermissionGranted: (permissionGranted) => set({ permissionGranted }),
  setFcmToken: (fcmToken) => set({ fcmToken }),
}));
