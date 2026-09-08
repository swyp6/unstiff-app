import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import type { PushMessageResponse } from "@/features/notifications/types";

type NotificationRowProps = {
  message: PushMessageResponse;
  timeLabel: string;
  onPress: (message: PushMessageResponse) => void;
};

// Figma 3452:37082(읽지 않음) / 3452:37109(읽음). 읽음 여부는 서버 `read` 값이
// source of truth다.
export function NotificationRow({
  message,
  timeLabel,
  onPress,
}: NotificationRowProps) {
  const accessibilityLabel = [
    message.read ? null : "읽지 않음",
    message.title,
    message.body,
    timeLabel,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={() => onPress(message)}
      style={[styles.card, message.read ? styles.cardRead : styles.cardUnread]}
    >
      {/* 디자인상 아이콘 자리는 아직 글리프 없이 채워진 사각형이다 — 유형별
          아이콘이 나오기 전까지 Figma 그대로 둔다. */}
      <View
        style={[
          styles.icon,
          message.read ? styles.iconRead : styles.iconUnread,
        ]}
      />

      <View style={styles.text}>
        <View style={styles.titleRow}>
          <ThemedText style={styles.title} typography="body-3-bold">
            {message.title}
          </ThemedText>
          <ThemedText style={styles.time} typography="caption-1-regular">
            {timeLabel}
          </ThemedText>
        </View>
        <ThemedText style={styles.body} typography="caption-1-regular">
          {message.body}
        </ThemedText>
      </View>

      {!message.read && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    flexDirection: "row",
    gap: 14,
    padding: 16,
    width: "100%",
  },
  cardUnread: {
    backgroundColor: semanticColors["fill-subtle"],
  },
  cardRead: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-normal"],
    borderWidth: 1,
  },
  icon: {
    borderRadius: 10,
    height: 38,
    width: 38,
  },
  iconUnread: {
    backgroundColor: semanticColors["label-normal"],
  },
  iconRead: {
    backgroundColor: semanticColors["fill-normal"],
  },
  text: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  title: {
    color: semanticColors["label-normal"],
    flex: 1,
    minWidth: 0,
  },
  time: {
    color: semanticColors["label-disabled"],
  },
  body: {
    color: semanticColors["label-subtle"],
  },
  unreadDot: {
    backgroundColor: semanticColors["label-normal"],
    borderRadius: 3.5,
    height: 7,
    position: "absolute",
    right: 9,
    top: 14,
    width: 7,
  },
});
