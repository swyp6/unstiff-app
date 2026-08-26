import { Redirect } from "expo-router";

import AppTabs from "@/components/app-tabs";
import { useAuthStore } from "@/store/auth-store";

export default function TabsLayout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  if (!hasHydrated) return null;
  if (!accessToken) return <Redirect href="/login" />;

  return <AppTabs />;
}
