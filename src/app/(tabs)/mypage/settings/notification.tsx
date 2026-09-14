import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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
import { MissionReceiveTimeRow } from "@/features/settings/components/mission-receive-time-row";
import {
  SETTINGS_CHROME_BACKGROUND,
  SettingsHeader,
} from "@/features/settings/components/settings-header";
import {
  SettingsSectionLabel,
  SettingsToggleRow,
  type SettingsDividerProps,
} from "@/features/settings/components/settings-list";
import { goBackOrReplace } from "@/features/settings/navigation";

type PushConfigMap = Record<ServicePushConfigType, boolean>;

type NotificationSettingRowProps = SettingsDividerProps & {
  title: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
};

// Figma 4953:59838 / 4953:59859의 toggle 행 구분선은 0.5px charcoal/1이고 행마다
// 다르다: 전체 알림·오늘의 질문·운동 계획은 top+bottom, 기록 리마인드는 bottom만.
// 미션 수신 시간 행은 List Row 기본값(bottom 1px)을 쓴다.
const NOTIFICATION_DIVIDER_WIDTH = 0.5;
const DIVIDER_TOP_AND_BOTTOM: SettingsDividerProps = {
  dividerTop: true,
  dividerWidth: NOTIFICATION_DIVIDER_WIDTH,
};
const DIVIDER_BOTTOM: SettingsDividerProps = {
  dividerWidth: NOTIFICATION_DIVIDER_WIDTH,
};

// Figma 4953:59838 — 56 높이의 toggle 행이 상하 4px 여백을 가진 64 높이
// "항목 영역" 안에 놓인다(미션 수신 시간 행만 여백 없이 64/120 그대로).
function NotificationSettingRow({
  title,
  value,
  disabled = false,
  onValueChange,
  ...dividerProps
}: NotificationSettingRowProps) {
  return (
    <View style={styles.rowArea}>
      <SettingsToggleRow
        disabled={disabled}
        onValueChange={onValueChange}
        title={title}
        value={value}
        {...dividerProps}
      />
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
    setPendingTypes((prev) => new Set([...prev, ...targets]));
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

    setPendingTypes((prev) => {
      const next = new Set(prev);
      for (const type of targets) next.delete(type);
      return next;
    });
    setIsAllToggling(false);
  }

  const allEnabled = configs
    ? SERVICE_PUSH_CONFIG_TYPES.every((type) => configs[type])
    : false;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <SettingsHeader
        onBack={() => goBackOrReplace("/mypage/settings")}
        title="알림 설정"
        variant="settingsNav"
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
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={styles.section}>
            <SettingsSectionLabel label="알림" variant="subheading" />
            <NotificationSettingRow
              {...DIVIDER_TOP_AND_BOTTOM}
              disabled={pendingTypes.size > 0}
              onValueChange={handleToggleAll}
              title="전체 알림"
              value={allEnabled}
            />
          </View>

          <View style={styles.section}>
            <SettingsSectionLabel label="서비스 알림" variant="subheading" />
            <View>
              <NotificationSettingRow
                {...DIVIDER_TOP_AND_BOTTOM}
                disabled={pendingTypes.has("DAILY_DISCOVERY")}
                onValueChange={(value) =>
                  handleToggle("DAILY_DISCOVERY", value)
                }
                title={SERVICE_PUSH_CONFIG_LABELS.DAILY_DISCOVERY}
                value={configs.DAILY_DISCOVERY}
              />
              <NotificationSettingRow
                {...DIVIDER_TOP_AND_BOTTOM}
                disabled={pendingTypes.has("DAILY_PLAN")}
                onValueChange={(value) => handleToggle("DAILY_PLAN", value)}
                title={SERVICE_PUSH_CONFIG_LABELS.DAILY_PLAN}
                value={configs.DAILY_PLAN}
              />
              {/* DAILY_MISSION 푸시는 서버가 offerTime에 보내는 "오늘의 미션이
                  도착했어" 알림이라, 그 수신 동의가 곧 이 행의 toggle이다
                  (Figma 4953:59838 / 4953:59859 — 별도 "데일리 미션" 행 없음).
                  offerTime 자체는 mission setting API의 별개 값이라 toggle을
                  꺼도 그대로 두고, 켜면 저장돼 있던 시간을 다시 보여준다. */}
              <MissionReceiveTimeRow
                enabled={configs.DAILY_MISSION}
                onTimePress={() => router.push("/mypage/settings/mission-time")}
                onToggle={(value) => handleToggle("DAILY_MISSION", value)}
                timeLabel={
                  missionOfferTime
                    ? formatOfferTimeLabel(missionOfferTime)
                    : null
                }
                toggleDisabled={pendingTypes.has("DAILY_MISSION")}
              />
              <NotificationSettingRow
                {...DIVIDER_BOTTOM}
                disabled={pendingTypes.has("REMIND_PLAN")}
                onValueChange={(value) => handleToggle("REMIND_PLAN", value)}
                title={SERVICE_PUSH_CONFIG_LABELS.REMIND_PLAN}
                value={configs.REMIND_PLAN}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: SETTINGS_CHROME_BACKGROUND,
    flex: 1,
  },
  scroll: {
    backgroundColor: semanticColors["background-normal"],
  },
  content: {
    gap: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  centerContent: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
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
    paddingTop: 20,
  },
  rowArea: {
    paddingVertical: 4,
  },
});
