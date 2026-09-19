import { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getCameraPermissionStatus,
  getPhotoLibraryPermissionStatus,
  getPushPermissionStatus,
  handlePermissionRowPress,
  requestCameraPermission,
  requestPhotoLibraryPermission,
  requestPushPermission,
} from "@/features/permissions/api";
import {
  SETTINGS_CHROME_BACKGROUND,
  SettingsHeader,
} from "@/features/settings/components/settings-header";
import {
  SettingsSectionLabel,
  SettingsValueRow,
} from "@/features/settings/components/settings-list";
import { goBackOrReplace } from "@/features/settings/navigation";
import { semanticColors } from "@/constants/tokens";

type PermissionRowKey = "camera" | "photoLibrary" | "push";

// Figma 4953:59814의 기기 권한 행 3개.
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
];

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
    // settings/index.tsx와 같은 이유로 bottom을 iOS에서만 유지한다 — 이
    // 화면도 항상 탭바 위에 떠 있다.
    <SafeAreaView
      edges={
        Platform.OS === "android"
          ? ["top", "left", "right"]
          : ["top", "left", "right", "bottom"]
      }
      style={styles.screen}
    >
      <SettingsHeader
        onBack={() => goBackOrReplace("/mypage/settings")}
        title="앱 권한 및 연동"
        variant="settingsNav"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View style={styles.section}>
          <SettingsSectionLabel label="기기 권한" variant="subheading" />
          <View style={styles.rows}>
            {DEVICE_PERMISSION_ROWS.map((row) => (
              <SettingsValueRow
                key={row.key}
                disabled={pendingKeys.has(row.key)}
                divider={false}
                onPress={() =>
                  runRowAction(row.key, () => handlePermissionRowPress(row))
                }
                title={row.title}
                value="권한 설정"
              />
            ))}
          </View>
        </View>
      </ScrollView>
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
  // Figma 4953:59814 — 콘텐츠 padding 20, 라벨→행 8, 행 사이 8, 구분선 없음.
  content: {
    padding: 20,
  },
  section: {
    gap: 8,
  },
  rows: {
    gap: 8,
  },
});
