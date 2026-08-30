import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { Easing, Keyframe } from "react-native-reanimated";

import { BrandMark } from "@/components/brand-mark";
import { ThemedView } from "@/components/themed-view";
import { useOnboardingStore } from "@/store/onboarding-store";

const GROW_DURATION_MS = 700;
const AUTO_ADVANCE_MS = 3000;

// Mirrors the scale-up keyframe already used for the native-splash-to-app
// handoff in animated-icon.tsx, reused here for the logo screen itself.
const growKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 0.6 }],
    opacity: 0,
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(0.7),
  },
});

export default function SplashScreen() {
  const hasHydrated = useOnboardingStore((state) => state.hasHydrated);
  const hasCompletedOnboarding = useOnboardingStore(
    (state) => state.hasCompletedOnboarding,
  );

  function goNext() {
    if (!hasHydrated) return;
    router.replace(hasCompletedOnboarding ? "/login" : "/onboarding");
  }

  // Auto-advance after a fixed delay instead of waiting on the entering
  // animation's completion callback — that callback doesn't reliably fire
  // when this screen is revisited via router.replace (e.g. after logout),
  // which left the screen stuck forever until a full app reload.
  useEffect(() => {
    if (!hasHydrated) return;
    const timer = setTimeout(goNext, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, hasCompletedOnboarding]);

  return (
    <Pressable
      accessibilityLabel="계속하기"
      accessibilityRole="button"
      onPress={goNext}
      style={{ flex: 1 }}
    >
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Animated.View entering={growKeyframe.duration(GROW_DURATION_MS)}>
            <BrandMark />
          </Animated.View>
        </SafeAreaView>
      </ThemedView>
    </Pressable>
  );
}
