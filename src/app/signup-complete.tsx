import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, BackHandler, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { typography } from "@/constants/tokens";
import { trackClick } from "@/features/analytics/analytics";
import {
  isNicknameAlreadyUsedError,
  updateMyProfile,
} from "@/features/auth/api";
import { OnboardingCtaButton } from "@/features/auth/components/onboarding-cta-button";
import { OnboardingHeader } from "@/features/auth/components/onboarding-header";
import {
  OnboardingContent,
  OnboardingFooter,
} from "@/features/auth/components/onboarding-layout";
import {
  AVATAR_SIZE_COMPACT,
  AVATAR_SIZE_WIDE,
  ProfileAvatarPreview,
} from "@/features/auth/components/profile-avatar-preview";
import { signupColors } from "@/features/auth/signup-ui";
import type { UpdateProfileRequest } from "@/features/auth/types";
import { useSignupHeroLayout } from "@/features/auth/use-signup-hero-layout";
import { useMyProfileStore } from "@/features/mypage/profile-store";
import {
  ImageUploadError,
  logImageUploadError,
} from "@/features/upload/cloudinary";
import { uploadImageFromUri } from "@/features/upload/upload-image";
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
// Figma 4501:44992 — 콘텐츠(아바타 152, gap 24, title/1/bold 24/32, gap 8,
// body/3/regular 13/18)의 세로 중심이 화면 50% - 54. 375 폭 프레임은 없어서
// 아바타 크기만 profile-photo와 같은 기준(120)으로 줄이고 위치 식은 그대로 쓴다.
const HERO_CENTER_OFFSET = 54;
const HERO_AVATAR_TEXT_GAP = 24;
const HERO_TITLE_DESCRIPTION_GAP = 8;
const HERO_HEIGHT_WITHOUT_AVATAR =
  HERO_AVATAR_TEXT_GAP +
  typography["title-1-bold"].lineHeight +
  HERO_TITLE_DESCRIPTION_GAP +
  typography["body-3-regular"].lineHeight;

function finishSignup() {
  useSignupStore.getState().reset();
  router.dismissAll();
  router.replace("/home");
}

export default function SignupCompleteScreen() {
  const confirmedPhotoUri = useSignupStore((state) => state.confirmedPhotoUri);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Caches the last successful upload for this exact local photo so a retry
  // after a PUT failure (nickname taken, network, etc.) doesn't re-upload
  // the same confirmed image to Cloudinary a second time.
  const uploadedPhotoRef = useRef<{ uri: string; secureUrl: string } | null>(
    null,
  );

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

  async function handleStart() {
    trackClick("signup_complete", "start");
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { nickname } = useSignupStore.getState();

      let profileImageUrl: string | undefined;
      if (confirmedPhotoUri) {
        if (uploadedPhotoRef.current?.uri === confirmedPhotoUri) {
          profileImageUrl = uploadedPhotoRef.current.secureUrl;
        } else {
          profileImageUrl = await uploadImageFromUri(
            confirmedPhotoUri,
            "USER_PROFILE",
          );
          uploadedPhotoRef.current = {
            uri: confirmedPhotoUri,
            secureUrl: profileImageUrl,
          };
        }
      }

      // Photo is optional onboarding input — a skipped photo must still let
      // nickname-only save through, not be blocked by it.
      const body: UpdateProfileRequest = { nickname };
      if (profileImageUrl) body.profileImageUrl = profileImageUrl;
      await updateMyProfile(body);

      useMyProfileStore.getState().setNickname(nickname);
      if (profileImageUrl) {
        useMyProfileStore
          .getState()
          .setAvatar({ type: "photo", uri: profileImageUrl });
      }

      finishSignup();
    } catch (error) {
      if (isNicknameAlreadyUsedError(error)) {
        Alert.alert("오류", "이미 사용 중인 닉네임이에요. 다시 입력해주세요.");
        router.dismissTo("/nickname");
        return;
      }
      logImageUploadError("signup profile save failed", error);
      Alert.alert(
        "오류",
        error instanceof ImageUploadError
          ? error.message
          : "프로필 저장에 실패했습니다. 다시 시도해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const { isWide, heroMarginTop } = useSignupHeroLayout();
  const avatarSize = isWide ? AVATAR_SIZE_WIDE : AVATAR_SIZE_COMPACT;
  const heroTop = heroMarginTop(
    avatarSize + HERO_HEIGHT_WITHOUT_AVATAR,
    HERO_CENTER_OFFSET,
  );

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      {/* Figma has no back button here — this is the end of the signup
          flow, so OnboardingHeader's onBack is intentionally omitted. */}
      <OnboardingHeader title="가입 완료" />

      <OnboardingContent style={styles.content}>
        <View style={[styles.hero, { marginTop: heroTop }]}>
          {/* Figma의 회색 원은 placeholder일 뿐 — 사용자가 등록한 사진이
              있으면 그대로 보여준다. */}
          <ProfileAvatarPreview
            imageUri={confirmedPhotoUri}
            size={avatarSize}
          />

          <View style={styles.textBlock}>
            <ThemedText style={styles.title} typography="title-1-bold">
              환영합니다!
            </ThemedText>
            <ThemedText style={styles.description} typography="body-3-regular">
              프로필 설정이 완료됐어요
            </ThemedText>
          </View>
        </View>
      </OnboardingContent>

      <OnboardingFooter>
        <OnboardingCtaButton
          disabled={isSubmitting}
          label="시작하기"
          onPress={handleStart}
        />
      </OnboardingFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: signupColors.white,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  hero: {
    alignItems: "center",
    gap: HERO_AVATAR_TEXT_GAP,
  },
  textBlock: {
    alignItems: "center",
    gap: HERO_TITLE_DESCRIPTION_GAP,
    width: "100%",
  },
  title: {
    color: signupColors.text,
    textAlign: "center",
  },
  description: {
    color: signupColors.textSubtle,
    textAlign: "center",
  },
});
