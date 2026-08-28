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
