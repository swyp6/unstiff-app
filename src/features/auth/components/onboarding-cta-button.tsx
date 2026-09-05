import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

type OnboardingCtaButtonProps = {
  label?: string;
  disabled: boolean;
  onPress: () => void;
};

// Shared bottom CTA for the SNS-signup screen stack — WF/Signup/CTA in
// Figma, identical enabled/disabled styling on all three screens.
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
        typography="body-2-bold"
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: semanticColors["primary-normal"],
    borderRadius: 20,
    height: 52,
    justifyContent: "center",
    width: "100%",
  },
  buttonDisabled: {
    backgroundColor: semanticColors["fill-strong"],
  },
  text: {
    color: semanticColors["primary-on"],
  },
  textDisabled: {
    color: semanticColors["label-disabled"],
  },
});
