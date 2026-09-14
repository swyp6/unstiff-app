import { router } from "expo-router";

type SettingsBackFallback =
  | "/mypage"
  | "/mypage/settings"
  | "/mypage/settings/notification"
  | "/mypage/settings/legal";

export function goBackOrReplace(fallback: SettingsBackFallback) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
