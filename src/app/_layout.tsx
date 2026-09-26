import "@/global.css";

import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { useScreenTracking } from "@/features/analytics/use-screen-tracking";
import { useNotificationLanding } from "@/features/notifications/use-notification-landing";
import { useRegisterPushToken } from "@/features/notifications/use-register-push-token";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useRegisterPushToken();
  useScreenTracking();

  // Font names match tokens.ts's `typography` fontFamily values — see
  // scripts/sync-figma-tokens.js's WEIGHT_SUFFIX/FONT_FAMILY_PREFIX constants.
  const [fontsLoaded, fontError] = useFonts({
    "Pretendard-Regular": require("../../assets/fonts/Pretendard-Regular.otf"),
    "Pretendard-Medium": require("../../assets/fonts/Pretendard-Medium.otf"),
    "Pretendard-SemiBold": require("../../assets/fonts/Pretendard-SemiBold.otf"),
    "Pretendard-Bold": require("../../assets/fonts/Pretendard-Bold.otf"),
  });

  // 폰트 로딩 전에는 아래 Stack이 아직 없어 알림 랜딩을 시작하지 않는다.
  const isNavigatorMounted = fontsLoaded || !!fontError;
  useNotificationLanding(isNavigatorMounted);

  if (!isNavigatorMounted) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          {/* Android는 edge-to-edge(RN core, 모든 API 레벨)로 status bar가
              투명이고, AppTheme에 windowLightStatusBar가 없어 아이콘이 기본
              흰색이다 — 흰 배경 위에서 안 보인다. 이 앱은 Figma에 다크 모드가
              없어 거의 모든 화면이 system color scheme과 무관하게 밝은 배경
              (background-normal/#fafafa)을 깔므로, scheme을 따르는 "auto"가
              아니라 실제 배경에 맞춘 "dark"(어두운 아이콘)로 iOS/Android를
              맞춘다. 어두운 화면(camera.tsx, record-complete.tsx)만 자기
              <StatusBar style="light" />를 올려 그 화면이 보이는 동안 우선하고,
              내려가면 여기 값으로 돌아온다. */}
          <StatusBar style="dark" />
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="splash" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="login" />
            <Stack.Screen name="terms-agreement" />
            <Stack.Screen name="terms-document/[type]" />
            <Stack.Screen
              name="camera"
              options={{ presentation: "fullScreenModal" }}
            />
            {/* record-target(3642)은 root route가 아니다 — Figma에 Native
                TabBar가 보여서 (tabs)/capture/target.tsx로 그 탭의 nested
                stack 안에 있다(capture/_layout.tsx 참고). record-editor/
                record-complete는 Figma에 탭바가 없어 root fullScreenModal로
                남는다. */}
            <Stack.Screen
              name="record-editor"
              options={{ presentation: "fullScreenModal" }}
            />
            <Stack.Screen
              name="record-complete"
              options={{ presentation: "fullScreenModal" }}
            />
            <Stack.Screen
              name="day-record"
              options={{ presentation: "fullScreenModal" }}
            />
            <Stack.Screen name="test" />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
