import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useOnboardingStore } from "@/store/onboarding-store";

const SWIPE_THRESHOLD = 60;

type OnboardingStep = {
  title: string;
  subtitle: string;
  illustration: number;
};

// Figma nodes 4501:44559 / 44580 / 44601 ("온보딩 7/8/9").
const STEPS: OnboardingStep[] = [
  {
    title: "운동한 날을\n사진으로 남겨요",
    subtitle: "오늘 뭘 했는지 한 장이면 충분해요",
    illustration: require("@/assets/onboarding/step-1.png"),
  },
  {
    title: "달력에 사진이 쌓여요",
    subtitle: "한 달을 한눈에 돌아볼 수 있어요",
    illustration: require("@/assets/onboarding/step-2.png"),
  },
  {
    title: "매일 맞춤 미션을 받아요",
    subtitle: "기록을 보고 무리 없는 양을 제안해요",
    illustration: require("@/assets/onboarding/step-3.png"),
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];

  function finishOnboarding() {
    useOnboardingStore.getState().completeOnboarding();
    router.replace("/login");
  }

  // Gesture.Pan() below is memoized to build the gesture config once rather
  // than on every render, so these read/clamp the step via the functional
  // setState form instead of closing over the `step` state value directly.
  const goToNextStep = useCallback(() => {
    setDirection("forward");
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }, []);

  const goToPreviousStep = useCallback(() => {
    setDirection("backward");
    setStep((current) => Math.max(current - 1, 0));
  }, []);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan().onEnd((event) => {
        "worklet";
        if (event.translationX < -SWIPE_THRESHOLD) {
          scheduleOnRN(goToNextStep);
        } else if (event.translationX > SWIPE_THRESHOLD) {
          scheduleOnRN(goToPreviousStep);
        }
      }),
    [goToNextStep, goToPreviousStep],
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 px-6">
        <View className="h-11 flex-row justify-end">
          <Pressable
            className="px-3 py-2"
            accessibilityRole="button"
            accessibilityLabel="건너뛰기"
            onPress={finishOnboarding}
          >
            <ThemedText typography="body-3-bold" className="text-charcoal-5">
              건너뛰기
            </ThemedText>
          </Pressable>
        </View>

        <GestureDetector gesture={swipeGesture}>
          <View style={{ flex: 1 }}>
            <Animated.View
              key={step}
              entering={direction === "forward" ? SlideInRight : SlideInLeft}
              exiting={direction === "forward" ? SlideOutLeft : SlideOutRight}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 40,
              }}
            >
              <Image
                source={current.illustration}
                style={{ width: 255, height: 273 }}
                contentFit="contain"
              />
              <View className="items-center gap-2">
                <ThemedText
                  typography="title-2-bold"
                  style={{ textAlign: "center" }}
                >
                  {current.title}
                </ThemedText>
                <ThemedText
                  typography="body-2-medium"
                  className="text-charcoal-5"
                  style={{ textAlign: "center" }}
                >
                  {current.subtitle}
                </ThemedText>
              </View>
            </Animated.View>
          </View>
        </GestureDetector>

        <View className="items-center gap-10 pb-4">
          <View className="flex-row items-center gap-1.5">
            {STEPS.map((_, index) => (
              <View
                key={index}
                className={
                  index === step
                    ? "h-1.5 w-[18px] rounded-full bg-orange-500"
                    : "h-1.5 w-1.5 rounded-full bg-line-strong"
                }
              />
            ))}
          </View>

          <Pressable
            className="h-14 w-full items-center justify-center rounded-2xl bg-label-normal"
            accessibilityRole="button"
            onPress={() => (isLastStep ? finishOnboarding() : goToNextStep())}
          >
            <ThemedText typography="body-2-bold" style={{ color: "#ffffff" }}>
              {isLastStep ? "시작하기" : "다음"}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
