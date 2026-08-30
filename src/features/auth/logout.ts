import { router } from "expo-router";

import { useAuthStore } from "@/store/auth-store";

export function logout() {
  useAuthStore.getState().logout();
  router.replace("/splash");
}
