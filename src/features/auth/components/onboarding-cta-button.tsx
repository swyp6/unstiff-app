import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { SIGNUP_CTA_HEIGHT, signupColors } from "@/features/auth/signup-ui";

type OnboardingCtaButtonProps = {
  label?: string;
  disabled: boolean;
  onPress: () => void;
};

// Shared bottom CTA for the SNS-signup screen stack — Figma "Button / CTA"
// (3326:9001 기본 / 3326:9003 비활성): 335 폭, py 16 + body/1/bold(16/22) =
// 54 높이, radius 999. 기본은 charcoal/11 위 white, 비활성은 charcoal/1 위
// charcoal/5.
export function OnboardingCtaButton({
  label = "다음",
  disabled,
  onPress,
}: OnboardingCtaButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <ThemedText
        style={[styles.text, disabled && styles.textDisabled]}
        typography="body-1-bold"
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: signupColors.text,
    borderRadius: 999,
    height: SIGNUP_CTA_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 20,
    width: "100%",
  },
  buttonDisabled: {
    backgroundColor: signupColors.fill,
  },
  text: {
    color: signupColors.white,
  },
  textDisabled: {
    color: signupColors.textSubtle,
  },
});
