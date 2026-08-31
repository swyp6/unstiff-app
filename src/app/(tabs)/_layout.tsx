import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import AppTabs from "@/components/app-tabs";
import { hasUnagreedRequiredTerms } from "@/features/auth/api";
import { useAuthStore } from "@/store/auth-store";
import { useOnboardingStore } from "@/store/onboarding-store";

export default function TabsLayout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydratedAuth = useAuthStore((state) => state.hasHydrated);
  const hasHydratedOnboarding = useOnboardingStore(
    (state) => state.hasHydrated,
  );
  const [termsRequired, setTermsRequired] = useState<boolean | null>(null);

  // Re-checked on every entry (not just right after login) so a user who
  // closed the app before agreeing to required terms — and so still holds a
  // valid accessToken — gets routed back to the agreement screen instead of
  // straight into the tabs.
  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    hasUnagreedRequiredTerms()
      .then((required) => {
        if (!cancelled) setTermsRequired(required);
      })
      .catch(() => {
        if (!cancelled) setTermsRequired(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (!hasHydratedAuth || !hasHydratedOnboarding) return null;
  if (!accessToken) return <Redirect href="/splash" />;
  if (termsRequired === null) return null;
  if (termsRequired) return <Redirect href="/terms-agreement" />;

  return <AppTabs />;
}
