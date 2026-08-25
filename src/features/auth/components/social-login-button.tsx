import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Text, useColorScheme } from "react-native";

import { Button, buttonTextVariants } from "@/components/ui/button";

export type SocialProvider = "apple" | "kakao" | "google";

export type SocialLoginButtonProps = {
  provider: SocialProvider;
  label: string;
  onPress?: () => void;
};

const KAKAO_SYMBOL_IMAGE = require("@/assets/social-login/kakao-symbol.png");
const GOOGLE_LOGO_IMAGE = require("@/assets/social-login/google-logo.png");

export function SocialLoginButton({
  provider,
  label,
  onPress,
}: SocialLoginButtonProps) {
  const isDark = useColorScheme() === "dark";

  return (
    <Button variant={provider} onPress={onPress} accessibilityLabel={label}>
      <SocialLoginIcon provider={provider} isDark={isDark} />
      <Text className={buttonTextVariants({ variant: provider })}>{label}</Text>
    </Button>
  );
}

function SocialLoginIcon({
  provider,
  isDark,
}: {
  provider: SocialProvider;
  isDark: boolean;
}) {
  // Apple HIG offers a black button (light backgrounds) and a white button
  // (dark backgrounds) — not a single button that visually survives both.
  if (provider === "apple") {
    return (
      <Ionicons
        name="logo-apple"
        size={18}
        color={isDark ? "#000000" : "#FFFFFF"}
      />
    );
  }

  // Kakao's symbol, cropped from their official button asset (no standalone
  // icon-only asset is published) — brand guideline forbids redrawing it.
  if (provider === "kakao") {
    return (
      <Image
        source={KAKAO_SYMBOL_IMAGE}
        style={{ width: 20, height: 19 }}
        contentFit="contain"
      />
    );
  }

  // Google's official multi-color "G" mark, from their branding guidelines
  // page — a flat monochrome icon isn't allowed by their guidelines.
  return (
    <Image
      source={GOOGLE_LOGO_IMAGE}
      style={{ width: 18, height: 18 }}
      contentFit="contain"
    />
  );
}
