import { router } from "expo-router";
import { useState } from "react";
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
};

// The Figma file only has designs for steps 1-2 ("온보딩 4"/"온보딩 5") but its
// indicator is built for 3 dots, and the user asked to build a 3rd step as a
// placeholder to match. Replace this step's copy once that design exists.
const STEPS: OnboardingStep[] = [
  {
    title: "운동한 날을\n사진으로 남겨요",
    subtitle: "오늘 뭘 했는지 한 장이면 충분해요",
  },
  {
    title: "달력에 사진이 쌓여요",
    subtitle: "한 달을 한눈에 돌아볼 수 있어요",
  },
  {
    title: "매일 맞춤 미션을 받아요",
    subtitle: "기록을 보고 무리 없는 양을 제안해요",
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

  function goToNextStep() {
    if (step >= STEPS.length - 1) return;
    setDirection("forward");
    setStep(step + 1);
  }

  function goToPreviousStep() {
    if (step <= 0) return;
    setDirection("backward");
    setStep(step - 1);
  }

  const swipeGesture = Gesture.Pan().onEnd((event) => {
    "worklet";
    if (event.translationX < -SWIPE_THRESHOLD) {
      scheduleOnRN(goToNextStep);
    } else if (event.translationX > SWIPE_THRESHOLD) {
      scheduleOnRN(goToPreviousStep);
    }
  });

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
            <ThemedText typography="body-3-bold" themeColor="textSecondary">
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
              <View className="h-[220px] w-[255px] rounded-[20px] bg-fill-subtle" />
              <View className="items-center gap-2">
                <ThemedText
                  typography="title-2-bold"
                  style={{ textAlign: "center" }}
                >
                  {current.title}
                </ThemedText>
                <ThemedText
                  typography="body-2-medium"
                  themeColor="textSecondary"
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
                    ? "h-1.5 w-[18px] rounded-full bg-label-normal"
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
