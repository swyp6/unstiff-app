import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { getMyProfile } from "@/features/auth/api";
import type { UserProfile } from "@/features/auth/types";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import { SettingsInfoRow } from "@/features/settings/components/settings-list";
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
        title="계정"
      />

      <View style={styles.content}>
        <ThemedText style={styles.sectionLabel} typography="body-2-medium">
          계정 정보
        </ThemedText>

        <View style={styles.rows}>
          <SettingsInfoRow label="로그인 계정" value="user@email.com" />
          <SettingsInfoRow
            label="로그인 방식"
            value={profile ? AUTH_TYPE_LABELS[profile.authType] : "-"}
          />
        </View>

        <View style={styles.infoCard}>
          <ThemedText style={styles.cardTitle} typography="body-2-medium">
            계정 정보 안내
          </ThemedText>
          <ThemedText
            style={styles.cardDescription}
            typography="caption-1-regular"
          >
            {"로그인 계정과 방식은 인증 제공자에서\n확인한 정보예요."}
          </ThemedText>
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
  sectionLabel: {
    color: semanticColors["label-subtle"],
    lineHeight: 20,
  },
  rows: {
    marginTop: 20,
  },
  infoCard: {
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: 12,
    gap: 8,
    height: 90,
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    width: "100%",
  },
  cardTitle: {
    color: semanticColors["secondary-normal"],
    lineHeight: 20,
  },
  cardDescription: {
    color: semanticColors["label-subtle"],
    lineHeight: 18,
  },
});
