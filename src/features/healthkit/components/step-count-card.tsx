import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

import { getTodayStepCount, requestStepCountAuthorization } from "../api";

export function StepCountCard() {
  const [stepCount, setStepCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadStepCount = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await requestStepCountAuthorization();
      setStepCount(await getTodayStepCount());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "오늘 걸음 수를 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedText type="smallBold">오늘 걸음 수</ThemedText>
      <ThemedText type="subtitle">
        {stepCount === null ? "-" : stepCount.toLocaleString()}
      </ThemedText>
      {errorMessage && (
        <ThemedText type="small" themeColor="textSecondary">
          {errorMessage}
        </ThemedText>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={isLoading}
        onPress={loadStepCount}
        style={({ pressed }) => [
          styles.button,
          (pressed || isLoading) && styles.buttonInactive,
        ]}
      >
        <ThemedText type="smallBold">
          {isLoading ? "불러오는 중..." : "걸음 수 불러오기"}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  buttonInactive: {
    opacity: 0.5,
  },
});
