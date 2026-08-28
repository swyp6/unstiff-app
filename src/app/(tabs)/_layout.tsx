import { Redirect } from "expo-router";

import AppTabs from "@/components/app-tabs";
import { useAuthStore } from "@/store/auth-store";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function TabsLayout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydratedAuth = useAuthStore((state) => state.hasHydrated);
  const hasHydratedOnboarding = useOnboardingStore(
    (state) => state.hasHydrated,
  );

  if (!hasHydratedAuth || !hasHydratedOnboarding) return null;
  if (!accessToken) return <Redirect href="/splash" />;

  return <AppTabs />;
}
