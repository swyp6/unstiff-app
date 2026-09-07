import { router } from "expo-router";

import { useMyProfileStore } from "@/features/mypage/profile-store";
import { useAuthStore } from "@/store/auth-store";

export function logout() {
  useMyProfileStore.getState().reset();
  useAuthStore.getState().logout();
  router.replace("/splash");
}
