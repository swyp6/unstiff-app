// 최상위 "expo-media-library"는 이 SDK에서 새 API로 바뀌었고 이 프로젝트는
// legacy 경로를 쓴다(features/workout-history/save-photo.ts와 동일).
import * as MediaLibrary from "expo-media-library/legacy";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { typography } from "@/constants/tokens";
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
import { useSignupHeroLayout } from "@/features/auth/use-signup-hero-layout";
import {
  ImageUploadError,
  logImageUploadError,
} from "@/features/upload/cloudinary";
import { pickImage } from "@/features/upload/use-image-upload";
import { useSignupStore } from "@/store/signup-store";

// Figma 402 프레임(4501:44949 등록 전 / 4501:44969 등록 완료)은 콘텐츠 세로
// 중심이 화면 50% - 54, 375 프레임(4501:44747)은 50% - 34에 있다.
const HERO_CENTER_OFFSET_WIDE = 54;
const HERO_CENTER_OFFSET_COMPACT = 34;
const HERO_AVATAR_TEXT_GAP = 24;
const HERO_TITLE_DESCRIPTION_GAP = 8;

type PhotoLibraryAccess = "full" | "limited" | "denied";

// 커스텀 앨범(/profile-photo-library)은 expo-media-library의 읽기 권한이
// 있어야 목록을 가져올 수 있다. 권한이 없거나(예: Android 13+에서 manifest에
// READ_MEDIA_IMAGES가 없어 요청 자체가 거부되는 경우) 요청이 실패하면 기존
// native picker(expo-image-picker) 흐름으로 그대로 돌아간다.
//
// "limited"(iOS "선택한 사진만" / Android 14 부분 접근)는 granted=true로
// 내려오지만 커스텀 앨범에는 허용한 사진만 나오고 허용 목록을 바꿀 UI도 없다.
// 시스템 picker는 limited여도 전체 라이브러리를 보여주므로 full과 구분해
// 호출부가 picker로 보낼 수 있게 한다.
async function getPhotoLibraryAccess(): Promise<PhotoLibraryAccess> {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync(false, [
      "photo",
    ]);
    if (permission.accessPrivileges === "limited") return "limited";
    return permission.granted ? "full" : "denied";
  } catch {
    return "denied";
  }
}

function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/nickname");
}

// Both skip and "다음" just move on to signup-complete — profile photo is
// optional, so neither path is gated on having a confirmedPhotoUri. Signup
// completion itself (and the temporary signup-store clear) happens on
// signup-complete's "시작하기", not here. Marking hasCompletedProfileStep
// here is what lets signup-complete's guard tell "skipped, no photo" apart
// from "never reached this step" — both otherwise leave confirmedPhotoUri
// null.
function goToSignupComplete() {
  useSignupStore.getState().setHasCompletedProfileStep(true);
  router.push("/signup-complete");
}

export default function ProfilePhotoScreen() {
  const confirmedPhotoUri = useSignupStore((state) => state.confirmedPhotoUri);
  const [isPicking, setIsPicking] = useState(false);

  // Guard against reaching this screen out of order — redirects to
  // whichever earlier step is actually incomplete, not a single fallback:
  // not a new-user session → /login; terms not agreed yet → /terms-
  // agreement; terms agreed but no nickname yet → /nickname. Checked once
  // at mount via getState() rather than reactive dependencies — this
  // screen stays mounted underneath signup-complete in the push-based
  // stack, so subscribing reactively meant signup-complete's own reset()
  // (on "시작하기") flipped this state back to its initial values while
  // this screen was still alive, firing this redirect and racing the
  // intended router.replace("/home").
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
    }
  }, []);

  async function handlePickImage() {
    if (isPicking) return;
    setIsPicking(true);
    try {
      if ((await getPhotoLibraryAccess()) === "full") {
        router.push("/profile-photo-library");
        return;
      }
      // limited → 시스템 picker가 전체 라이브러리를 보여준다.
      // denied → pickImage가 기존대로 권한 요청 후 거부 시 안내 alert를 띄운다.
      const asset = await pickImage("library");
      if (!asset) return; // user cancelled the system picker — stay put
      router.push({
        pathname: "/profile-photo-adjust",
        params: {
          uri: asset.uri,
          width: String(asset.width),
          height: String(asset.height),
        },
      });
    } catch (pickError) {
      logImageUploadError("profile photo pick failed", pickError);
      Alert.alert(
        "오류",
        pickError instanceof ImageUploadError
          ? pickError.message
          : "사진을 불러오지 못했습니다.",
      );
    } finally {
      setIsPicking(false);
    }
  }

  const { isWide, heroMarginTop } = useSignupHeroLayout();
  const avatarSize = isWide ? AVATAR_SIZE_WIDE : AVATAR_SIZE_COMPACT;
  const hasPhoto = Boolean(confirmedPhotoUri);
  // 등록 완료 제목은 402 프레임에서만 title/2/bold(22/30)로 커지고, 등록 전
  // 설명은 body/3/regular(13/18), 등록 완료 설명은 body/2/regular(14/19)다.
  const titleTypography: keyof typeof typography =
    hasPhoto && isWide ? "title-2-bold" : "title-3-bold";
  const descriptionTypography: keyof typeof typography = hasPhoto
    ? "body-2-regular"
    : "body-3-regular";
  const heroHeight =
    avatarSize +
    HERO_AVATAR_TEXT_GAP +
    typography[titleTypography].lineHeight +
    HERO_TITLE_DESCRIPTION_GAP +
    typography[descriptionTypography].lineHeight;
  const heroTop = heroMarginTop(
    heroHeight,
    isWide ? HERO_CENTER_OFFSET_WIDE : HERO_CENTER_OFFSET_COMPACT,
  );

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      <OnboardingHeader onBack={handleBack} title="프로필 설정" />

      <OnboardingContent style={styles.content}>
        <View style={[styles.hero, { marginTop: heroTop }]}>
          <Pressable
            accessibilityLabel="프로필 사진 선택"
            accessibilityRole="button"
            disabled={isPicking}
            onPress={handlePickImage}
          >
            <ProfileAvatarPreview
              imageUri={confirmedPhotoUri}
              showCameraBadge
              size={avatarSize}
            />
          </Pressable>

          <View style={styles.textBlock}>
            <ThemedText style={styles.title} typography={titleTypography}>
              {hasPhoto
                ? "프로필 사진을 등록했어요"
                : "프로필 사진을 등록해주세요."}
            </ThemedText>
            <ThemedText
              style={styles.description}
              typography={descriptionTypography}
            >
              {hasPhoto
                ? "사진은 나중에 변경할 수 있어요"
                : "사진은 나중에 변경할 수 있어요."}
            </ThemedText>
          </View>
        </View>
      </OnboardingContent>

      <OnboardingFooter style={styles.footer}>
        {/* Figma 등록 완료 프레임(4501:44747 / 4501:44969)에는 건너뛰기가
            없다 — 사진이 있으면 "다음"이 활성화돼 같은 곳으로 가므로 기능
            손실 없이 숨긴다. */}
        {!hasPhoto && (
          <Pressable
            accessibilityLabel="지금은 건너뛸래요"
            accessibilityRole="button"
            hitSlop={12}
            onPress={goToSignupComplete}
          >
            <ThemedText style={styles.skipText} typography="body-2-medium">
              지금은 건너뛸래요
            </ThemedText>
          </Pressable>
        )}
        <OnboardingCtaButton
          disabled={!confirmedPhotoUri}
          onPress={goToSignupComplete}
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
  // "지금은 건너뛸래요"(top 733, 19 높이)와 CTA(top 768) 사이 16.
  footer: {
    alignItems: "center",
    gap: 16,
  },
  skipText: {
    color: signupColors.textSubtle,
    textAlign: "center",
  },
});
