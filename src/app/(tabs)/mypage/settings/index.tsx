import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import {
  SettingsRow,
  SettingsSectionLabel,
} from "@/features/settings/components/settings-list";

export default function SettingsScreen() {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Pressable
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              color={semanticColors["label-normal"]}
              name="chevron-back"
              size={20}
            />
          </Pressable>
        </View>
        <ThemedText typography="body-1-medium">설정</ThemedText>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <SettingsSectionLabel label="계정" />
          <View>
            <SettingsRow
              onPress={() => router.push("/mypage/settings/account")}
              title="계정 설정"
            />
            <SettingsRow
              onPress={() => router.push("/mypage/settings/notification")}
              title="알림 설정"
            />
          </View>
        </View>

        <View style={styles.section}>
          <SettingsSectionLabel label="서비스" />
          <View>
            <SettingsRow title="이용약관" />
            <SettingsRow title="개인정보 처리방침" />
          </View>
        </View>

        <View style={styles.actionSection}>
          <SettingsRow destructive title="로그아웃" />
          <SettingsRow destructive title="회원 탈퇴" />
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 72,
    paddingHorizontal: 24,
  },
  backButton: {
    alignItems: "flex-start",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerSide: {
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
