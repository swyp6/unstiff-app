import { useState } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import {
  getTodayStepCount as getTodayHealthConnectStepCount,
  requestStepCountAuthorization as requestHealthConnectStepCountAuthorization,
} from "@/features/health-connect/api";

import { getTodayStepCount, requestStepCountAuthorization } from "../api";

export function StepCountCard() {
  const [stepCount, setStepCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadStepCount = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (Platform.OS === "android") {
        await requestHealthConnectStepCountAuthorization();
        setStepCount(await getTodayHealthConnectStepCount());
      } else if (Platform.OS === "ios") {
        await requestStepCountAuthorization();
        setStepCount(await getTodayStepCount());
      }
    } catch (error) {
      setStepCount(null);
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
      {stepCount === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          걸음 수가 보이지 않는다면 건강 앱의 접근 권한을 확인해주세요.
        </ThemedText>
      )}
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
