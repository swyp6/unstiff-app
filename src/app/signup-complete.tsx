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
//
// The whole terms → nickname → profile-photo → signup-complete chain is
// router.push()-based (so mid-flow "back" keeps working), which means by
// the time we're here the root Stack's history looks like
// [..., terms-agreement, nickname, profile-photo, signup-complete] — a
// plain router.replace("/home") would only swap this last entry, leaving
// the rest reachable via swipe-back/hardware-back. dismissAll() (a
// popToTop on the closest Stack — there's only one, the root Stack
// registered in _layout.tsx, so this is unambiguous here) collapses that
// back down to the single entry that sat below terms-agreement (whatever
// login had replaced its way into), and the replace() below then turns
// that into "/home" — leaving a single-entry stack with no onboarding
// screen reachable by any back gesture.
//
// Order: reset() first, matching the "1. state 정리 2. history 정리 3. /home
// 진입" sequence this was specced with. This is safe regardless of order
// now — every guard in nickname/profile-photo/signup-complete reads
// signup-store via getState() inside a mount-once (`[]`-deps) effect, not
// a reactive selector, so clearing the store here can no longer re-trigger
// a stale screen's redirect the way it did before that fix.
function handleStart() {
  useSignupStore.getState().reset();
  router.dismissAll();
  router.replace("/home");
}

export default function SignupCompleteScreen() {
  const confirmedPhotoUri = useSignupStore((state) => state.confirmedPhotoUri);

  // Guard against reaching this screen out of order — redirects to
  // whichever earlier step is actually incomplete: not a new-user session
  // → /login; terms not agreed → /terms-agreement; no nickname yet →
  // /nickname; profile-photo step not completed → /profile-photo. Photo
  // itself is optional (Skip is a valid completion), so confirmedPhotoUri
  // is deliberately NOT checked here — only hasCompletedProfileStep, which
  // profile-photo sets on either Skip or Next.
  //
  // Checked once at mount via getState() rather than reactive dependencies.
  // This screen's own "시작하기" calls useSignupStore.getState().reset(),
  // which flips all of this back to its initial (falsy) values — with a
  // reactive dependency, that reset triggered this same effect to re-run
  // *while still mounted* (the replace("/home") navigation hadn't
  // unmounted it yet) and fire router.replace("/login"), racing the
  // intended navigation and occasionally winning it. This was the actual
  // cause of a real-device report where completing signup landed on
  // /login instead of /home — accessToken/auth-store were never involved.
  useEffect(() => {
    const state = useSignupStore.getState();
    if (!state.isNewUser) {
      router.replace("/login");
      return;
    }
    if (!state.hasAgreedToRequiredTerms) {
      router.replace("/terms-agreement");
      return;
    }
    if (!state.nickname) {
      router.replace("/nickname");
      return;
    }
    if (!state.hasCompletedProfileStep) {
      router.replace("/profile-photo");
    }
  }, []);

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
