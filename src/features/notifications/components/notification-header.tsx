import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";

type NotificationHeaderProps = {
  onBack: () => void;
};

// Figma 3502:47589 / 3502:47610 — [back 44] 알림 [빈 44]. 최신 디자인에는
// 우측 `모두 읽음` 액션이 없어 44px 균형 여백만 둔다(read-all API 함수는
// features/notifications/api.ts에 그대로 남아 있다).
export function NotificationHeader({ onBack }: NotificationHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
        style={styles.side}
      >
        <Ionicons
          color={primitiveColors.charcoal[11]}
          name="chevron-back"
          size={20}
        />
      </Pressable>

      <ThemedText style={styles.title} typography="heading-1-bold">
        알림
      </ThemedText>

      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 44,
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 20,
  },
  side: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  title: {
    color: primitiveColors.charcoal[11],
  },
});
