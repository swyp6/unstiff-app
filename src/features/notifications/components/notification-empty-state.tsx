import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

const EMPTY_BELL = require("@/assets/notifications/empty-bell.png");

type NotificationEmptyStateProps = {
  onOpenSettings: () => void;
};

// Figma 3452:37123 — 받은 알림이 하나도 없을 때의 화면.
export function NotificationEmptyState({
  onOpenSettings,
}: NotificationEmptyStateProps) {
  return (
    <View style={styles.container}>
      <Image contentFit="contain" source={EMPTY_BELL} style={styles.bell} />

      <View style={styles.copy}>
        <ThemedText style={styles.title} typography="body-1-bold">
          받은 알림이 없어요
        </ThemedText>
        <ThemedText style={styles.description} typography="body-3-regular">
          {"운동 계획 리마인드와 주간 요약을\n여기로 보내드려요"}
        </ThemedText>
      </View>

      <Pressable
        accessibilityLabel="알림 설정 열기"
        accessibilityRole="button"
        onPress={onOpenSettings}
        style={styles.settingsButton}
      >
        <ThemedText style={styles.settingsButtonText} typography="body-3-bold">
          알림 설정 열기
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    gap: 20,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  bell: {
    height: 58,
    width: 56,
  },
  copy: {
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  title: {
    color: semanticColors["label-subtle"],
    textAlign: "center",
  },
  description: {
    color: semanticColors["label-disabled"],
    textAlign: "center",
  },
  settingsButton: {
    alignItems: "center",
    borderColor: semanticColors["line-strong"],
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  settingsButtonText: {
    color: semanticColors["label-normal"],
  },
});
