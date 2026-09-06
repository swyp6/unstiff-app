import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";
import { getMissionSetting } from "@/features/missions/api";
import { formatOfferTimeLabel } from "@/features/missions/offer-time";
import {
  disablePushConfig,
  enablePushConfig,
  getPushConfigs,
} from "@/features/notifications/api";
import {
  SERVICE_PUSH_CONFIG_LABELS,
  SERVICE_PUSH_CONFIG_TYPES,
  type ServicePushConfigType,
} from "@/features/notifications/types";
import { NotificationToggle } from "@/features/settings/components/notification-toggle";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import {
  SettingsSectionLabel,
  SettingsValueRow,
  SETTINGS_DIVIDER_COLOR,
} from "@/features/settings/components/settings-list";
import { goBackOrReplace } from "@/features/settings/navigation";

type PushConfigMap = Record<ServicePushConfigType, boolean>;

type NotificationSettingRowProps = {
  title: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
};

function NotificationSettingRow({
  title,
  value,
  disabled = false,
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
        disabled={disabled}
        onValueChange={onValueChange}
        value={value}
      />
      <View style={styles.divider} />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const [configs, setConfigs] = useState<PushConfigMap | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [pendingTypes, setPendingTypes] = useState<Set<ServicePushConfigType>>(
    new Set(),
  );
  const [isAllToggling, setIsAllToggling] = useState(false);
  const [missionOfferTime, setMissionOfferTime] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getPushConfigs()
      .then(({ configs: serverConfigs }) => {
        if (cancelled) return;
        const map = SERVICE_PUSH_CONFIG_TYPES.reduce<PushConfigMap>(
          (acc, type) => {
            acc[type] =
              serverConfigs.find((config) => config.type === type)?.enabled ??
              false;
            return acc;
          },
          {} as PushConfigMap,
        );
        setConfigs(map);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setLoadError(false);
    setReloadKey((key) => key + 1);
  }

  // Fetches on both initial mount and every return to this screen — picking
  // a new mission time happens on a separate screen, so re-checking on
  // focus is what picks up the change (the server, not local state, is the
  // source of truth).
  useFocusEffect(
    useCallback(() => {
      getMissionSetting()
        .then(({ offerTime }) => setMissionOfferTime(offerTime))
        .catch(() => setMissionOfferTime(null));
    }, []),
  );

  async function handleToggle(type: ServicePushConfigType, nextValue: boolean) {
    if (!configs || isAllToggling || pendingTypes.has(type)) return;

    setPendingTypes((prev) => new Set(prev).add(type));
    setConfigs((prev) => (prev ? { ...prev, [type]: nextValue } : prev));

    try {
      if (nextValue) {
        await enablePushConfig(type);
      } else {
        await disablePushConfig(type);
      }
    } catch {
      setConfigs((prev) => (prev ? { ...prev, [type]: !nextValue } : prev));
      Alert.alert(
        "오류",
        "알림 설정을 변경하지 못했습니다. 다시 시도해주세요.",
      );
    } finally {
      setPendingTypes((prev) => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
    }
  }

  async function handleToggleAll(nextValue: boolean) {
    if (!configs || isAllToggling) return;

    const targets = SERVICE_PUSH_CONFIG_TYPES.filter(
      (type) => configs[type] !== nextValue && !pendingTypes.has(type),
    );
    if (targets.length === 0) return;

    setIsAllToggling(true);
    setPendingTypes(new Set(targets));
    setConfigs((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      for (const type of targets) next[type] = nextValue;
      return next;
    });

    const results = await Promise.allSettled(
      targets.map((type) =>
        nextValue ? enablePushConfig(type) : disablePushConfig(type),
      ),
    );
    const failedTypes = targets.filter(
      (_, index) => results[index].status === "rejected",
    );

    if (failedTypes.length > 0) {
      setConfigs((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        for (const type of failedTypes) next[type] = !nextValue;
        return next;
      });
      Alert.alert(
        "오류",
        "일부 알림 설정을 변경하지 못했습니다. 다시 시도해주세요.",
      );
    }

    setPendingTypes(new Set());
    setIsAllToggling(false);
  }

  const allEnabled = configs
    ? SERVICE_PUSH_CONFIG_TYPES.every((type) => configs[type])
    : false;
  const isDailyMissionEnabled = configs?.DAILY_MISSION ?? false;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <SettingsHeader
        onBack={() => goBackOrReplace("/mypage/settings")}
        title="알림설정"
      />

      {loadError ? (
        <View style={styles.centerContent}>
          <ThemedText
            style={styles.errorText}
            themeColor="textSecondary"
            typography="body-2-medium"
          >
            알림 설정을 불러오지 못했습니다.
          </ThemedText>
          <Pressable
            accessibilityLabel="다시 시도"
            accessibilityRole="button"
            onPress={retry}
            style={styles.retryButton}
          >
            <ThemedText
              style={styles.retryButtonText}
              typography="body-1-medium"
            >
              다시 시도
            </ThemedText>
          </Pressable>
        </View>
      ) : !configs ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color={semanticColors["label-normal"]} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.section}>
            <SettingsSectionLabel label="알림" />
            <NotificationSettingRow
              onValueChange={handleToggleAll}
              title="전체 알림"
              value={allEnabled}
            />
          </View>

          <View style={styles.section}>
            <SettingsSectionLabel label="서비스 알림" />
            <View>
              <NotificationSettingRow
                disabled={pendingTypes.has("DAILY_DISCOVERY")}
                onValueChange={(value) =>
                  handleToggle("DAILY_DISCOVERY", value)
                }
                title={SERVICE_PUSH_CONFIG_LABELS.DAILY_DISCOVERY}
                value={configs.DAILY_DISCOVERY}
              />
              <NotificationSettingRow
                disabled={pendingTypes.has("DAILY_PLAN")}
                onValueChange={(value) => handleToggle("DAILY_PLAN", value)}
                title={SERVICE_PUSH_CONFIG_LABELS.DAILY_PLAN}
                value={configs.DAILY_PLAN}
              />
              <NotificationSettingRow
                disabled={pendingTypes.has("DAILY_MISSION")}
                onValueChange={(value) => handleToggle("DAILY_MISSION", value)}
                title={SERVICE_PUSH_CONFIG_LABELS.DAILY_MISSION}
                value={configs.DAILY_MISSION}
              />
              <SettingsValueRow
                disabled={!isDailyMissionEnabled}
                onPress={
                  isDailyMissionEnabled
                    ? () => router.push("/mypage/settings/mission-time")
                    : undefined
                }
                title="미션 수신 시간"
                value={
                  missionOfferTime
                    ? formatOfferTimeLabel(missionOfferTime)
                    : "시간 설정"
                }
              />
              <NotificationSettingRow
                disabled={pendingTypes.has("REMIND_PLAN")}
                onValueChange={(value) => handleToggle("REMIND_PLAN", value)}
                title={SERVICE_PUSH_CONFIG_LABELS.REMIND_PLAN}
                value={configs.REMIND_PLAN}
              />
            </View>
          </View>
        </View>
      )}
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
  centerContent: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: semanticColors["primary-normal"],
    borderRadius: radius.default,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: semanticColors["primary-on"],
  },
  section: {
    gap: 8,
    marginBottom: 32,
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
