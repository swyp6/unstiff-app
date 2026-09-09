import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";
import type { PushMessageResponse } from "@/features/notifications/types";

type NotificationRowProps = {
  message: PushMessageResponse;
  timeLabel: string;
  onPress: (message: PushMessageResponse) => void;
};

// Figma "Row / 알림" (3502:47598). 최신 디자인에는 아이콘 슬롯과 읽음 상태
// 구분이 없다 — 컴포넌트 설명대로 "읽음 상태 구분 없음 (판정 기준 미정)"이라
// read 값에 따라 배경/보더/dot를 다르게 그리지 않는다(읽음 API는 그대로 동작).
export function NotificationRow({
  message,
  timeLabel,
  onPress,
}: NotificationRowProps) {
  const accessibilityLabel = [message.title, message.body, timeLabel]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={() => onPress(message)}
      style={styles.card}
    >
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <ThemedText
            numberOfLines={1}
            style={styles.title}
            typography="body-3-bold"
          >
            {message.title}
          </ThemedText>
          <ThemedText style={styles.time} typography="caption-2-regular">
            {timeLabel}
          </ThemedText>
        </View>
        <ThemedText
          numberOfLines={1}
          style={styles.body}
          typography="caption-1-regular"
        >
          {message.body}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: primitiveColors.neutral[0],
    borderRadius: 20,
    flexDirection: "row",
    gap: 14,
    // Figma 기본 높이는 70이지만, 시스템 글꼴을 키우면 한 줄짜리 제목/본문도
    // 70을 넘기므로 고정 height 대신 minHeight로 두어 잘리지 않고 늘어나게 한다.
    minHeight: 70,
    padding: 16,
    width: "100%",
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
    width: "100%",
  },
  title: {
    color: primitiveColors.charcoal[11],
    flex: 1,
    minWidth: 0,
  },
  time: {
    color: primitiveColors.charcoal[4],
  },
  body: {
    color: primitiveColors.charcoal[5],
  },
});
