import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getStepCountAuthorizationStatus as getAndroidStepCountAuthorizationStatus,
  openHealthConnectSettings,
  requestStepCountAuthorization as requestAndroidStepCountAuthorization,
  type HealthConnectStepCountStatus,
} from "@/features/health-connect/api";
import {
  getStepCountAuthorizationRequestStatus,
  requestStepCountAuthorization as requestIosStepCountAuthorization,
  type HealthKitStepCountRequestStatus,
} from "@/features/healthkit/api";
import {
  getCameraPermissionStatus,
  getLocationPermissionStatus,
  getPhotoLibraryPermissionStatus,
  getPushPermissionStatus,
  handlePermissionRowPress,
  requestCameraPermission,
  requestLocationPermission,
  requestPhotoLibraryPermission,
  requestPushPermission,
} from "@/features/permissions/api";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import {
  SettingsSectionLabel,
  SettingsValueRow,
} from "@/features/settings/components/settings-list";
import { goBackOrReplace } from "@/features/settings/navigation";
import { semanticColors } from "@/constants/tokens";

type PermissionRowKey =
  "camera" | "photoLibrary" | "push" | "location" | "health";

const DEVICE_PERMISSION_ROWS = [
  {
    key: "camera" as const,
    title: "카메라 접근",
    getStatus: getCameraPermissionStatus,
    request: requestCameraPermission,
  },
  {
    key: "photoLibrary" as const,
    title: "사진 접근",
    getStatus: getPhotoLibraryPermissionStatus,
    request: requestPhotoLibraryPermission,
  },
  {
    key: "push" as const,
    title: "푸시 알림",
    getStatus: getPushPermissionStatus,
    request: requestPushPermission,
  },
  {
    key: "location" as const,
    title: "위치정보 제공",
    getStatus: getLocationPermissionStatus,
    request: requestLocationPermission,
  },
];

// "error" is local to this screen (not a value either native API returns)
// — it marks that the last status check itself failed, so the screen can
// treat it as retry-able instead of a resolved authorization state.
type HealthStatus =
  HealthKitStepCountRequestStatus | HealthConnectStepCountStatus | "error";

export default function PermissionsScreen() {
  const [pendingKeys, setPendingKeys] = useState<Set<PermissionRowKey>>(
    new Set(),
  );
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const healthStatusRequestRef = useRef<Promise<HealthStatus> | null>(null);

  // Dedupes concurrent callers (mount, AppState foreground, and a tap that
  // lands before the first check resolves) onto a single in-flight request
  // instead of firing a fresh one each time. Never rejects — a failed
  // native check resolves to "error" instead, since this also runs outside
  // runRowAction's try/catch (on mount and on AppState foreground) where a
  // rejection would otherwise surface as an unhandled promise rejection.
  const refreshHealthStatus = useCallback((): Promise<HealthStatus> => {
    if (!healthStatusRequestRef.current) {
      healthStatusRequestRef.current = (async () => {
        let next: HealthStatus;
        try {
          next =
            Platform.OS === "ios"
              ? await getStepCountAuthorizationRequestStatus()
              : Platform.OS === "android"
                ? await getAndroidStepCountAuthorizationStatus()
                : "unavailable";
        } catch {
          next = "error";
        }
        setHealthStatus(next);
        return next;
      })().finally(() => {
        healthStatusRequestRef.current = null;
      });
    }
    return healthStatusRequestRef.current;
  }, []);

  // Health authorization is only ever changed by leaving the app (the
  // Health app on iOS, Health Connect's settings on Android), so refreshing
  // on foreground return — the same AppState pattern used for the FCM token
  // in use-register-push-token.ts — is what picks up a change made there.
  // `refreshHealthStatus` never rejects (see above), so these fire-and-
  // forget calls are safe without their own catch.
  useEffect(() => {
    void refreshHealthStatus();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void refreshHealthStatus();
    });
    return () => subscription.remove();
  }, [refreshHealthStatus]);

  const handleHealthPress = useCallback(async () => {
    // A cached "error" is a failed check, not a resolved status — retry it
    // live instead of replaying the same failure.
    const status =
      healthStatus && healthStatus !== "error"
        ? healthStatus
        : await refreshHealthStatus();

    if (status === "unavailable") {
      Alert.alert(
        "안내",
        Platform.OS === "ios"
          ? "이 기기에서는 Health 연동을 사용할 수 없습니다."
          : "이 기기에서는 Health Connect를 사용할 수 없습니다.",
      );
      return;
    }

    // "unknown" (HealthKit genuinely doesn't know yet, distinct from
    // "unnecessary" which means already decided) and "error" (the retry
    // above also failed) both mean we couldn't determine a usable status
    // — surface it as a failure via runRowAction's common catch rather
    // than silently assuming access is settled.
    if (status === "unknown" || status === "error") {
      throw new Error("Health authorization status could not be determined");
    }

    if (status === "shouldRequest") {
      await requestIosStepCountAuthorization();
      await refreshHealthStatus();
      return;
    }

    if (status === "notGranted") {
      await requestAndroidStepCountAuthorization();
      await refreshHealthStatus();
      return;
    }

    if (status === "granted") {
      await openHealthConnectSettings();
      return;
    }

    // status === "unnecessary" (iOS, already decided) — HealthKit never
    // reveals whether a read permission was granted or denied once
    // decided, so the Health app is the only place left to review it.
    await Linking.openURL("x-apple-health://");
  }, [healthStatus, refreshHealthStatus]);

  async function runRowAction(
    key: PermissionRowKey,
    action: () => Promise<void>,
  ) {
    if (pendingKeys.has(key)) return;
    setPendingKeys((prev) => new Set(prev).add(key));
    try {
      await action();
    } catch {
      Alert.alert("오류", "요청을 처리하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <SettingsHeader
        onBack={() => goBackOrReplace("/mypage/settings")}
        title="앱 권한 및 연동"
      />

      <View style={styles.content}>
        <View style={styles.section}>
          <SettingsSectionLabel label="기기 권한" />
          <View>
            {DEVICE_PERMISSION_ROWS.map((row) => (
              <SettingsValueRow
                key={row.key}
                disabled={pendingKeys.has(row.key)}
                onPress={() =>
                  runRowAction(row.key, () => handlePermissionRowPress(row))
                }
                title={row.title}
                value="권한 설정"
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SettingsSectionLabel label="건강 데이터" />
          <View>
            <SettingsValueRow
              disabled={pendingKeys.has("health")}
              onPress={() => runRowAction("health", handleHealthPress)}
              title="Health 연동"
              value="걸음 수"
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
  content: {
    paddingHorizontal: 24,
  },
  section: {
    gap: 8,
    marginBottom: 32,
  },
});
