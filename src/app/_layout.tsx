import "@/global.css";

import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { useRegisterPushToken } from "@/features/notifications/use-register-push-token";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useRegisterPushToken();

  // Font names match tokens.ts's `typography` fontFamily values — see
  // scripts/sync-figma-tokens.js's WEIGHT_SUFFIX/FONT_FAMILY_PREFIX constants.
  const [fontsLoaded, fontError] = useFonts({
    "Pretendard-Regular": require("../../assets/fonts/Pretendard-Regular.otf"),
    "Pretendard-Medium": require("../../assets/fonts/Pretendard-Medium.otf"),
    "Pretendard-SemiBold": require("../../assets/fonts/Pretendard-SemiBold.otf"),
    "Pretendard-Bold": require("../../assets/fonts/Pretendard-Bold.otf"),
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="splash" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="terms-agreement" />
          <Stack.Screen name="nickname" />
          <Stack.Screen name="profile-photo" />
          <Stack.Screen name="map" />
          <Stack.Screen name="camera" options={{ presentation: "modal" }} />
          <Stack.Screen name="test" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
