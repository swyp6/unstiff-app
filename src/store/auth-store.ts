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

// 매번 DevTools 콘솔에 쳐서 꺼낼 필요 없이, 토큰이 바뀔 때마다(로그인/로그아웃/
// 리하이드레이션/재발급) Metro 로그에 찍는다 — __DEV__ 가드로 프로덕션 빌드에는
// 안 남는다.
if (__DEV__) {
  useAuthStore.subscribe((state) =>
    console.log("[auth] accessToken", state.accessToken),
  );
}
