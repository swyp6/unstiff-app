import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Pressable, Text, useColorScheme } from "react-native";

export type SocialProvider = "apple" | "kakao" | "google";

export type SocialLoginButtonProps = {
  provider: SocialProvider;
  label?: string;
  onPress?: () => void;
};

const KAKAO_BUTTON_IMAGE = require("@/assets/social-login/kakao-login-button.png");
const KAKAO_BUTTON_ASPECT_RATIO = 183 / 45;

export function SocialLoginButton({
  provider,
  label,
  onPress,
}: SocialLoginButtonProps) {
  const isDark = useColorScheme() === "dark";

  if (provider === "kakao") {
    return (
      <Pressable
        onPress={onPress}
        className="h-[45px] w-full"
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <Image
          source={KAKAO_BUTTON_IMAGE}
          style={{
            width: "100%",
            height: "100%",
            aspectRatio: KAKAO_BUTTON_ASPECT_RATIO,
          }}
          contentFit="contain"
        />
      </Pressable>
    );
  }

  const isApple = provider === "apple";

  // Apple HIG offers a black button (light backgrounds) and a white button
  // (dark backgrounds) — not a single button that visually survives both.
  // This screen's background follows the OS scheme, so the Apple button
  // switches with it too, using the same white-with-border style Apple
  // specifies for the dark variant.
  // Google's official mark is multi-color; Ionicons' logo-google is
  // single-color, so this is a simplified monochrome approximation.
  const appleIconColor = isDark ? "#000000" : "#FFFFFF";
  const googleIconColor = "#3C4043";

  return (
    <Pressable
      onPress={onPress}
      className={
        isApple
          ? "h-[45px] w-full flex-row items-center justify-center gap-2 rounded-full bg-black dark:border dark:border-[#DADCE0] dark:bg-white"
          : "h-[45px] w-full flex-row items-center justify-center gap-2 rounded-full border border-[#DADCE0] bg-white"
      }
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <Ionicons
        name={isApple ? "logo-apple" : "logo-google"}
        size={18}
        color={isApple ? appleIconColor : googleIconColor}
      />
      <Text
        className={
          isApple
            ? "text-base font-semibold text-white dark:text-black"
            : "text-base font-semibold text-[#3C4043]"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
