import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  markHydratedOnRehydrate,
  platformKeyValueStorage,
} from "@/lib/persisted-storage";

type AuthState = {
  accessToken: string | null;
  hasHydrated: boolean;
  setAccessToken: (token: string | null) => void;
  setHasHydrated: (value: boolean) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      hasHydrated: false,
      setAccessToken: (accessToken) => set({ accessToken }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      logout: () => set({ accessToken: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => platformKeyValueStorage),
      partialize: (state) => ({ accessToken: state.accessToken }),
      onRehydrateStorage: markHydratedOnRehydrate,
    },
  ),
);
