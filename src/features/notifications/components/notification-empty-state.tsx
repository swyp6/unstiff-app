import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";

// Figma 3502:47616 "종" — 사선이 그어진 muted bell. Ionicons에 같은 글리프가
// 없어 Figma export를 PNG로 저장해 쓴다(사선 여백이 surface/background 색으로
// 그려져 있어 화면 배경과 같은 #fafafa 위에서만 정확히 맞는다).
const EMPTY_BELL = require("@/assets/notifications/empty-bell.png");

type NotificationEmptyStateProps = {
  onOpenSettings: () => void;
};

// Figma 3502:47615 — 받은 알림이 하나도 없을 때의 화면.
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
        <ThemedText style={styles.description} typography="body-2-regular">
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
    height: 56.7,
    width: 56,
  },
  copy: {
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  title: {
    color: primitiveColors.charcoal[11],
    textAlign: "center",
  },
  description: {
    color: primitiveColors.charcoal[5],
    textAlign: "center",
  },
  settingsButton: {
    alignItems: "center",
    backgroundColor: primitiveColors.orange[50],
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  settingsButtonText: {
    color: primitiveColors.orange[500],
  },
});
