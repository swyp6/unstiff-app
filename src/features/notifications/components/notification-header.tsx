import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

type NotificationHeaderProps = {
  onBack: () => void;
  // Figma상 `모두 읽음`은 목록이 있을 때만 있고, 빈 상태에서는 오른쪽에 44px
  // 자리맞춤만 남는다.
  showMarkAllRead: boolean;
  isMarkAllReadPending: boolean;
  onMarkAllRead: () => void;
};

// Figma 3452:37072 / 3452:37124.
export function NotificationHeader({
  onBack,
  showMarkAllRead,
  isMarkAllReadPending,
  onMarkAllRead,
}: NotificationHeaderProps) {
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
          color={semanticColors["label-normal"]}
          name="chevron-back"
          size={20}
        />
      </Pressable>

      <ThemedText style={styles.title} typography="body-2-bold">
        알림
      </ThemedText>

      {showMarkAllRead ? (
        <Pressable
          accessibilityLabel="모두 읽음"
          accessibilityRole="button"
          accessibilityState={{ busy: isMarkAllReadPending }}
          onPress={onMarkAllRead}
          style={styles.markAllRead}
        >
          <ThemedText
            style={styles.markAllReadText}
            typography="caption-1-bold"
          >
            모두 읽음
          </ThemedText>
        </Pressable>
      ) : (
        <View style={styles.side} />
      )}
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
    color: semanticColors["label-normal"],
  },
  markAllRead: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  markAllReadText: {
    color: semanticColors["label-subtle"],
  },
});
