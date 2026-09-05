import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

type OnboardingHeaderProps = {
  title: string;
  // Omit for a screen with no back path (e.g. signup-complete, which Figma
  // gives no back button — it's the end of the flow).
  onBack?: () => void;
};

// Shared TopNav for the SNS-signup screen stack (terms → nickname →
// profile photo → photo-adjust → signup-complete) — WF/Signup/TopNav in
// Figma, identical across all of them.
export function OnboardingHeader({ title, onBack }: OnboardingHeaderProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={styles.backButton}
        >
          <Ionicons
            color={semanticColors["label-normal"]}
            name="chevron-back"
            size={20}
          />
        </Pressable>
      ) : (
        <View style={styles.backButton} />
      )}
      <ThemedText style={styles.headerTitle} typography="body-1-medium">
        {title}
      </ThemedText>
      <View style={styles.headerSide} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    flexDirection: "row",
    height: 52,
    paddingHorizontal: 8,
  },
  backButton: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  headerTitle: {
    color: semanticColors["label-normal"],
    flex: 1,
    textAlign: "center",
  },
  headerSide: {
    width: 48,
  },
});
