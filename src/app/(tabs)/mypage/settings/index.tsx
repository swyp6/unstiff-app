import Constants from "expo-constants";
import { router } from "expo-router";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
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
  { title: "앱 권한 및 연동", href: "/mypage/settings/permissions" },
] as const;

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
      <SettingsHeader
        onBack={() => goBackOrReplace("/mypage")}
        title="설정"
        variant="settingsNav"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <SettingsSectionLabel label="계정 및 앱 설정" />
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

        <View style={[styles.section, styles.serviceSection]}>
          <SettingsSectionLabel label="서비스" />
          {/* Figma 4841:25631 — 약관 4종을 각각 열던 대신 약관 조회·동의 내역·
              AI 선택 동의를 관리하는 단일 진입점. */}
          <SettingsRow
            description="약관 조회 · 동의 내역 · AI 선택 동의 관리"
            onPress={() => router.push("/mypage/settings/legal")}
            title="약관 및 개인정보"
          />
        </View>

        <View style={styles.actionSection}>
          <SettingsRow destructive onPress={handleLogout} title="로그아웃" />
          <SettingsRow
            destructive
            onPress={() => router.push("/mypage/settings/withdrawal")}
            title="회원 탈퇴"
          />
        </View>

        {/* Figma 기준(812 높이) 마지막 행 아래 108, safe-area 하단 위 39에
            버전이 오도록 — 남는 세로 공간이 있으면 spacer가 늘어나 아래쪽에
            머물고, 작은 기기에서는 최소 간격만 지키며 스크롤된다. */}
        <View style={styles.versionSpacer} />
        <ThemedText style={styles.versionText} typography="caption-2-regular">
          {`현재 앱 버전 : ${Constants.expoConfig?.version ?? "-"}`}
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: semanticColors["background-normal"],
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 39,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  section: {
    gap: 8,
    marginBottom: 40,
  },
  // Figma: 서비스 섹션과 로그아웃·회원 탈퇴 그룹 사이만 24.
  serviceSection: {
    marginBottom: 24,
  },
  actionSection: {
    gap: 8,
  },
  versionSpacer: {
    flexGrow: 1,
    minHeight: 108,
  },
  versionText: {
    color: primitiveColors.charcoal["5"],
    textAlign: "center",
  },
});
