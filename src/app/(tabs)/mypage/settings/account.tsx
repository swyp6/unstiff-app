import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { semanticColors } from "@/constants/tokens";
import { getMyProfile } from "@/features/auth/api";
import type { UserProfile } from "@/features/auth/types";
import {
  SETTINGS_CHROME_BACKGROUND,
  SettingsHeader,
} from "@/features/settings/components/settings-header";
import {
  SettingsInfoRow,
  SettingsSectionLabel,
} from "@/features/settings/components/settings-list";
import { goBackOrReplace } from "@/features/settings/navigation";

const AUTH_TYPE_LABELS: Record<UserProfile["authType"], string> = {
  APPLE: "Apple",
  KAKAO: "Kakao",
  GOOGLE: "Google",
};

export default function AccountScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .catch(() => {
        if (!cancelled) {
          Alert.alert(
            "오류",
            "계정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <SettingsHeader
        onBack={() => goBackOrReplace("/mypage/settings")}
        title="계정 설정"
        variant="settingsNav"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <SettingsSectionLabel label="계정 정보" variant="label" />
        <View style={styles.rows}>
          <SettingsInfoRow label="닉네임" value={profile?.nickname ?? "-"} />
          <SettingsInfoRow
            label="로그인 방식"
            value={profile ? AUTH_TYPE_LABELS[profile.authType] : "-"}
          />
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
  content: {
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  rows: {
    gap: 8,
  },
});
