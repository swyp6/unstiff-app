import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AuthState = {
  accessToken: string | null;
  hasHydrated: boolean;
  setAccessToken: (token: string | null) => void;
  setHasHydrated: (value: boolean) => void;
  logout: () => void;
};

// expo-secure-store has no web implementation (its web module is a stub),
// so getItemAsync/setItemAsync throw there — fall back to localStorage on
// web instead of leaving persist's rehydration permanently unresolved.
const authStorage =
  Platform.OS === "web"
    ? {
        getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
        setItem: (key: string, value: string) => {
          localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          localStorage.removeItem(key);
          return Promise.resolve();
        },
      }
    : {
        getItem: SecureStore.getItemAsync,
        setItem: SecureStore.setItemAsync,
        removeItem: SecureStore.deleteItemAsync,
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
      storage: createJSONStorage(() => authStorage),
      partialize: (state) => ({ accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
