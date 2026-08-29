import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { NotificationToggle } from "@/features/settings/components/notification-toggle";

const NOTIFICATION_DIVIDER_COLOR = "#E2E6EC";
const SECTION_LABEL_COLOR = "#9BA5B7";

type NotificationSettingRowProps = {
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function NotificationSettingRow({
  title,
  value,
  onValueChange,
}: NotificationSettingRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTitle}>
        <ThemedText style={styles.rowText} typography="body-2-medium">
          {title}
        </ThemedText>
      </View>
      <NotificationToggle
        accessibilityLabel={title}
        onValueChange={onValueChange}
        value={value}
      />
      <View style={styles.divider} />
    </View>
  );
}

function NotificationSectionLabel({ label }: { label: string }) {
  return (
    <ThemedText style={styles.sectionLabel} typography="caption-1-medium">
      {label}
    </ThemedText>
  );
}

export default function NotificationSettingsScreen() {
  const [allNotifications, setAllNotifications] = useState(true);
  const [dailyQuestion, setDailyQuestion] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState(true);
  const [dailyMission, setDailyMission] = useState(true);
  const [recordReminder, setRecordReminder] = useState(false);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Pressable
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              color={semanticColors["label-normal"]}
              name="chevron-back"
              size={20}
            />
          </Pressable>
        </View>
        <ThemedText typography="body-1-medium">알림설정</ThemedText>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <NotificationSectionLabel label="알림" />
          <NotificationSettingRow
            onValueChange={setAllNotifications}
            title="전체 알림"
            value={allNotifications}
          />
        </View>

        <View style={styles.section}>
          <NotificationSectionLabel label="서비스 알림" />
          <View>
            <NotificationSettingRow
              onValueChange={setDailyQuestion}
              title="오늘의 질문"
              value={dailyQuestion}
            />
            <NotificationSettingRow
              onValueChange={setWorkoutPlan}
              title="운동 계획"
              value={workoutPlan}
            />
            <NotificationSettingRow
              onValueChange={setDailyMission}
              title="데일리 미션"
              value={dailyMission}
            />
            <NotificationSettingRow
              onValueChange={setRecordReminder}
              title="기록 리마인드"
              value={recordReminder}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: semanticColors["background-normal"],
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 72,
    paddingHorizontal: 24,
  },
  backButton: {
    alignItems: "flex-start",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerSide: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  section: {
    gap: 8,
    marginBottom: 32,
  },
  sectionLabel: {
    color: SECTION_LABEL_COLOR,
    lineHeight: 18,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    height: 56,
    paddingHorizontal: 16,
    position: "relative",
    width: "100%",
  },
  rowTitle: {
    flex: 1,
    minWidth: 0,
  },
  rowText: {
    color: semanticColors["label-normal"],
  },
  divider: {
    backgroundColor: NOTIFICATION_DIVIDER_COLOR,
    bottom: 0,
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
  },
});
