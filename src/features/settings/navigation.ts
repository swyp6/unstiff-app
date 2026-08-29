import { router } from "expo-router";

type SettingsBackFallback = "/mypage" | "/mypage/settings";

export function goBackOrReplace(fallback: SettingsBackFallback) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
