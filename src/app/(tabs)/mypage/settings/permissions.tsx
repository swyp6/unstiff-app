import { useState } from "react";
import { Alert, Linking, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getStepCountAuthorizationStatus as getAndroidStepCountAuthorizationStatus,
  openHealthConnectSettings,
  requestStepCountAuthorization as requestAndroidStepCountAuthorization,
} from "@/features/health-connect/api";
import {
  getStepCountAuthorizationRequestStatus,
  requestStepCountAuthorization as requestIosStepCountAuthorization,
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

async function handleHealthRowPress() {
  if (Platform.OS === "ios") {
    const status = await getStepCountAuthorizationRequestStatus();
    if (status === "unavailable") {
      Alert.alert("안내", "이 기기에서는 Health 연동을 사용할 수 없습니다.");
      return;
    }
    if (status === "shouldRequest") {
      try {
        await requestIosStepCountAuthorization();
      } catch {
        Alert.alert("오류", "Health 권한 요청 중 문제가 발생했습니다.");
      }
      return;
    }
    // HealthKit never reveals whether a read permission was granted or
    // denied once decided — the Health app is the only place to review it.
    await Linking.openURL("x-apple-health://").catch(() => {
      Alert.alert("안내", "건강 앱에서 연동 권한을 확인해주세요.");
    });
    return;
  }

  if (Platform.OS === "android") {
    const status = await getAndroidStepCountAuthorizationStatus();
    if (status === "unavailable") {
      Alert.alert("안내", "이 기기에서는 Health Connect를 사용할 수 없습니다.");
      return;
    }
    if (status === "granted") {
      await openHealthConnectSettings();
      return;
    }
    try {
      await requestAndroidStepCountAuthorization();
    } catch {
      Alert.alert("오류", "Health 권한 요청 중 문제가 발생했습니다.");
    }
  }
}

export default function PermissionsScreen() {
  const [pendingKeys, setPendingKeys] = useState<Set<PermissionRowKey>>(
    new Set(),
  );

  async function runRowAction(
    key: PermissionRowKey,
    action: () => Promise<void>,
  ) {
    if (pendingKeys.has(key)) return;
    setPendingKeys((prev) => new Set(prev).add(key));
    try {
      await action();
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
              onPress={() => runRowAction("health", handleHealthRowPress)}
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
