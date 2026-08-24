import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Pressable, Text, useColorScheme } from "react-native";

export type SocialProvider = "apple" | "kakao" | "google";

export type SocialLoginButtonProps = {
  provider: SocialProvider;
  label: string;
  onPress?: () => void;
};

const KAKAO_SYMBOL_IMAGE = require("@/assets/social-login/kakao-symbol.png");
const GOOGLE_LOGO_IMAGE = require("@/assets/social-login/google-logo.png");

// Shared size/shape for all three buttons so they read as one button group.
const BUTTON_SIZE_CLASS =
  "h-[45px] w-72 flex-row items-center justify-center gap-2 rounded-full";

const PROVIDER_STYLES: Record<
  SocialProvider,
  { container: string; containerDark?: string; text: string; textDark?: string }
> = {
  apple: {
    container: "bg-black",
    containerDark: "border border-[#DADCE0] bg-white",
    text: "text-white",
    textDark: "text-black",
  },
  kakao: {
    container: "bg-[#FEE500]",
    text: "text-black/85",
  },
  google: {
    container: "border border-[#DADCE0] bg-white",
    text: "text-[#3C4043]",
  },
};

export function SocialLoginButton({
  provider,
  label,
  onPress,
}: SocialLoginButtonProps) {
  const isDark = useColorScheme() === "dark";
  const styles = PROVIDER_STYLES[provider];

  return (
    <Pressable
      onPress={onPress}
      className={`${BUTTON_SIZE_CLASS} ${isDark && styles.containerDark ? styles.containerDark : styles.container}`}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <SocialLoginIcon provider={provider} isDark={isDark} />
      <Text
        className={`text-base font-semibold ${isDark && styles.textDark ? styles.textDark : styles.text}`}
      >
        {label}
      </Text>
    </Pressable>
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
