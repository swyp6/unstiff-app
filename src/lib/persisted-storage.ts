import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// expo-secure-store has no web implementation (its web module is a stub),
// so getItemAsync/setItemAsync throw there — fall back to localStorage on
// web instead of leaving zustand persist's rehydration permanently unresolved.
export const platformKeyValueStorage =
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

// zustand's persist middleware calls the returned callback as
// `(state, error)`, where `state` is only defined on a successful read —
// on a failed one (corrupted JSON, a SecureStore error) it's `undefined`.
// Reading `initialState` from the outer closure instead (always defined,
// since it's `get() ?? configResult`) makes hydration finish either way,
// instead of leaving `hasHydrated` stuck at false forever on a read error.
export function markHydratedOnRehydrate<
  T extends { setHasHydrated: (value: boolean) => void },
>(initialState: T) {
  return () => {
    initialState.setHasHydrated(true);
  };
}
