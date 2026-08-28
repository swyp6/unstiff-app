import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { platformKeyValueStorage } from "@/lib/persisted-storage";

type OnboardingState = {
  hasCompletedOnboarding: boolean;
  hasHydrated: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      hasHydrated: false,
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => platformKeyValueStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
