import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { NotificationToggle } from "@/features/settings/components/notification-toggle";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import { SETTINGS_DIVIDER_COLOR } from "@/features/settings/components/settings-list";
import { goBackOrReplace } from "@/features/settings/navigation";

const SECTION_LABEL_COLOR = "#9BA5B7";

const SERVICE_NOTIFICATION_ITEMS = [
  { key: "dailyQuestion", title: "오늘의 질문" },
  { key: "workoutPlan", title: "운동 계획" },
  { key: "dailyMission", title: "데일리 미션" },
  { key: "recordReminder", title: "기록 리마인드" },
] as const;

type ServiceNotificationKey =
  (typeof SERVICE_NOTIFICATION_ITEMS)[number]["key"];

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
  const [notificationSettings, setNotificationSettings] = useState<
    Record<ServiceNotificationKey, boolean>
  >({
    dailyQuestion: true,
    workoutPlan: true,
    dailyMission: true,
    recordReminder: false,
  });

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <SettingsHeader
        onBack={() => goBackOrReplace("/mypage/settings")}
        title="알림설정"
      />

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
            {SERVICE_NOTIFICATION_ITEMS.map((item) => (
              <NotificationSettingRow
                key={item.key}
                onValueChange={(value) =>
                  setNotificationSettings((current) => ({
                    ...current,
                    [item.key]: value,
                  }))
                }
                title={item.title}
                value={notificationSettings[item.key]}
              />
            ))}
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
    backgroundColor: SETTINGS_DIVIDER_COLOR,
    bottom: 0,
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
  },
});
