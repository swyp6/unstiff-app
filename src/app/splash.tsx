import { router } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { Easing, Keyframe } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { BrandMark } from "@/components/brand-mark";
import { ThemedView } from "@/components/themed-view";
import { useOnboardingStore } from "@/store/onboarding-store";

const GROW_DURATION_MS = 700;

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
  const [hasAnimated, setHasAnimated] = useState(false);
  const hasHydrated = useOnboardingStore((state) => state.hasHydrated);
  const hasCompletedOnboarding = useOnboardingStore(
    (state) => state.hasCompletedOnboarding,
  );

  useEffect(() => {
    if (!hasAnimated || !hasHydrated) return;
    router.replace(hasCompletedOnboarding ? "/login" : "/onboarding");
  }, [hasAnimated, hasHydrated, hasCompletedOnboarding]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Animated.View
          entering={growKeyframe
            .duration(GROW_DURATION_MS)
            .withCallback((finished) => {
              "worklet";
              if (finished) scheduleOnRN(setHasAnimated, true);
            })}
        >
          <BrandMark />
        </Animated.View>
      </SafeAreaView>
    </ThemedView>
  );
}
