import { router } from "expo-router";
import { useEffect } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { OnboardingCtaButton } from "@/features/auth/components/onboarding-cta-button";
import { OnboardingHeader } from "@/features/auth/components/onboarding-header";
import { ProfileAvatarPreview } from "@/features/auth/components/profile-avatar-preview";
import { useSignupStore } from "@/store/signup-store";

// This is where the temporary signup-store state actually gets cleared —
// not on profile-photo's Next/Skip — because this screen still needs to
// show the confirmed nickname/photo preview one last time before the user
// leaves the signup flow.
function handleStart() {
  useSignupStore.getState().reset();
  router.replace("/home");
}

export default function SignupCompleteScreen() {
  const isNewUser = useSignupStore((state) => state.isNewUser);
  const nickname = useSignupStore((state) => state.nickname);
  const confirmedPhotoUri = useSignupStore((state) => state.confirmedPhotoUri);

  // Minimal guard against reaching this screen out of order (direct/deep
  // link) — mirrors nickname.tsx/profile-photo.tsx's guard. Photo is
  // optional so it isn't part of this check.
  useEffect(() => {
    if (!isNewUser) {
      router.replace("/login");
      return;
    }
    if (!nickname) {
      router.replace("/nickname");
    }
  }, [isNewUser, nickname]);

  // This is the final confirmation screen — Android's hardware back button
  // must not pop it back to profile-photo any more than the (already
  // hidden) header back button or iOS's swipe gesture should. Scoped to
  // just this screen's lifetime, not a global guard.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      {/* Figma has no back button here — this is the end of the signup
          flow, so OnboardingHeader's onBack is intentionally omitted. */}
      <OnboardingHeader title="가입 완료" />

      <View style={styles.content}>
        <ProfileAvatarPreview imageUri={confirmedPhotoUri} />

        <View style={styles.textBlock}>
          <ThemedText style={styles.title} typography="title-3-bold">
            환영합니다!
          </ThemedText>
          <ThemedText style={styles.description} typography="body-2-medium">
            프로필 설정이 완료됐어요.
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <OnboardingCtaButton
          disabled={false}
          label="시작하기"
          onPress={handleStart}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: semanticColors["fill-subtle"],
    flex: 1,
  },
  content: {
    alignItems: "center",
    flex: 1,
    gap: 18,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  textBlock: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: semanticColors["label-normal"],
    textAlign: "center",
  },
  description: {
    color: semanticColors["label-subtle"],
    textAlign: "center",
  },
  footer: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
