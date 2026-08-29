import { router } from "expo-router";
import { Alert, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { logout } from "@/features/auth/logout";
import { useOnboardingStore } from "@/store/onboarding-store";

// No Figma design has been shared for this tab yet — placeholder screen with
// just the settings entry and logout actions wired up.
export default function MyPageScreen() {
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

  function handleLogoutAndResetOnboarding() {
    Alert.alert(
      "로그아웃 + 온보딩 초기화",
      "로그아웃하고 온보딩부터 다시 보시겠어요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "초기화",
          style: "destructive",
          onPress: () => {
            useOnboardingStore.getState().resetOnboarding();
            logout();
          },
        },
      ],
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView
        style={{
          flex: 1,
          paddingHorizontal: Spacing.three,
          gap: Spacing.three,
        }}
      >
        <ThemedText
          typography="title-2-bold"
          style={{ marginTop: Spacing.two, marginBottom: Spacing.one }}
        >
          마이페이지
        </ThemedText>

        <Pressable
          className="items-center rounded-2xl border border-line-normal py-4"
          accessibilityRole="button"
          accessibilityLabel="설정"
          onPress={() => router.push("/mypage/settings")}
        >
          <ThemedText typography="body-2-bold">설정</ThemedText>
        </Pressable>

        <Pressable
          className="items-center rounded-2xl border border-line-normal py-4"
          accessibilityRole="button"
          accessibilityLabel="로그아웃"
          onPress={handleLogout}
        >
          <ThemedText typography="body-2-bold">로그아웃</ThemedText>
        </Pressable>

        <Pressable
          className="items-center rounded-2xl border border-line-normal py-4"
          accessibilityRole="button"
          accessibilityLabel="로그아웃 후 온보딩 초기화"
          onPress={handleLogoutAndResetOnboarding}
        >
          <ThemedText typography="body-2-bold" themeColor="textSecondary">
            로그아웃 + 온보딩 초기화
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}
