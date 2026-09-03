import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { semanticColors } from "@/constants/tokens";
import { LEGAL_URLS } from "@/constants/legal-urls";
import { logout } from "@/features/auth/logout";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import {
  SettingsRow,
  SettingsSectionLabel,
} from "@/features/settings/components/settings-list";
import { goBackOrReplace } from "@/features/settings/navigation";

const ACCOUNT_ITEMS = [
  { title: "계정 설정", href: "/mypage/settings/account" },
  { title: "알림 설정", href: "/mypage/settings/notification" },
] as const;

const SERVICE_ITEMS = [
  { title: "이용약관", url: LEGAL_URLS.terms },
  { title: "개인정보 처리방침", url: LEGAL_URLS.privacy },
] as const;

async function openLegalDocument(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Alert.alert("오류", "페이지를 열지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
}

export default function SettingsScreen() {
  function handleLogout() {
    Alert.alert("로그아웃", "로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: logout,
      },
    ]);
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <SettingsHeader onBack={() => goBackOrReplace("/mypage")} title="설정" />

      <View style={styles.content}>
        <View style={styles.section}>
          <SettingsSectionLabel label="계정" />
          <View>
            {ACCOUNT_ITEMS.map((item) => (
              <SettingsRow
                key={item.href}
                onPress={() => router.push(item.href)}
                title={item.title}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SettingsSectionLabel label="서비스" />
          <View>
            {SERVICE_ITEMS.map((item) => (
              <SettingsRow
                key={item.url}
                onPress={() => void openLegalDocument(item.url)}
                title={item.title}
              />
            ))}
          </View>
        </View>

        <View style={styles.actionSection}>
          <SettingsRow destructive onPress={handleLogout} title="로그아웃" />
          <SettingsRow
            destructive
            onPress={() => router.push("/mypage/settings/withdrawal")}
            title="회원 탈퇴"
          />
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
  actionSection: {
    marginTop: 8,
  },
});
