import { router } from "expo-router";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { OnboardingCtaButton } from "@/features/auth/components/onboarding-cta-button";
import { OnboardingHeader } from "@/features/auth/components/onboarding-header";
import { useImageUpload } from "@/features/upload/use-image-upload";
import { useSignupStore } from "@/store/signup-store";

// Figma node 1917:33151 — WF/Signup/ProfileAvatar(135x134) /
// ProfileAvatarInner(67x66) / CameraButton(50x48) are plain flat ellipses
// (confirmed via get_metadata: <ellipse>, not vector art), reproduced here
// as plain Views rather than as ChatAvatar — ChatAvatar draws a person-icon
// silhouette fallback that Figma's placeholder doesn't have, and only ever
// renders a single circle, not this outer/inner nested-circle structure.
const AVATAR_OUTER_SIZE = 135;
const AVATAR_INNER_SIZE = 66;
const CAMERA_BUTTON_SIZE = 48;

function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/nickname");
}

// No backend endpoint accepts { nickname, profileImageUrl } to finalize a
// new signup yet — accessToken was already issued at OAuth sign-in, before
// this screen even ran, and there's no separate "complete signup" call to
// make here. Until the backend adds one, this only clears the local signup
// state and routes home. A successful image upload above only means the
// file reached Cloudinary — it does NOT mean the user's profile has been
// saved server-side; there is currently no way to make that second step
// happen. Shared by both "다음" and the skip link so neither path
// duplicates (or overstates) this.
function completeOnboarding() {
  useSignupStore.getState().reset();
  router.replace("/home");
}

export default function ProfilePhotoScreen() {
  const isNewUser = useSignupStore((state) => state.isNewUser);
  const nickname = useSignupStore((state) => state.nickname);
  const storedProfileImageUrl = useSignupStore(
    (state) => state.profileImageUrl,
  );
  const setStoredProfileImageUrl = useSignupStore(
    (state) => state.setProfileImageUrl,
  );
  // Undefined/null here means "no user-selected photo" — never a
  // placeholder asset path or a guessed backend default URL.
  const [profileImageUrl, setProfileImageUrl] = useState(storedProfileImageUrl);
  const { isUploading, error, pickAndUpload } = useImageUpload("USER_PROFILE");

  // Minimal guard against reaching this screen out of order (direct/deep
  // link, or skipping the nickname step) — mirrors nickname.tsx's guard.
  useEffect(() => {
    if (!isNewUser) {
      router.replace("/login");
      return;
    }
    if (!nickname) {
      router.replace("/nickname");
    }
  }, [isNewUser, nickname]);

  useEffect(() => {
    if (error) Alert.alert("오류", error);
  }, [error]);

  async function handlePickImage() {
    const secureUrl = await pickAndUpload("library");
    if (!secureUrl) return;
    // This is only "uploaded to Cloudinary", not "saved to the user's
    // profile" — see the completeOnboarding() comment above.
    setProfileImageUrl(secureUrl);
    setStoredProfileImageUrl(secureUrl);
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      <OnboardingHeader onBack={handleBack} title="프로필 설정" />

      <View style={styles.content}>
        <View style={styles.avatarWrapper}>
          <Pressable
            accessibilityLabel="프로필 사진 선택"
            accessibilityRole="button"
            disabled={isUploading}
            onPress={handlePickImage}
          >
            <View style={styles.avatarOuter}>
              {profileImageUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: profileImageUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarInner} />
              )}
            </View>
          </Pressable>
          <Pressable
            accessibilityLabel="프로필 사진 변경"
            accessibilityRole="button"
            disabled={isUploading}
            hitSlop={4}
            onPress={handlePickImage}
            style={styles.cameraButton}
          >
            {isUploading ? (
              <ActivityIndicator
                color={semanticColors["label-subtle"]}
                size="small"
              />
            ) : (
              // WF/Signup/CameraIcon in Figma is literally a "●" text
              // glyph, not a real camera icon asset yet — reproduced as-is
              // rather than substituting a different glyph of our own
              // choosing. Swap this node for the real icon/asset once
              // design provides one; nothing else here needs to change.
              <ThemedText
                style={styles.cameraGlyph}
                typography="body-2-regular"
              >
                ●
              </ThemedText>
            )}
          </Pressable>
        </View>

        <View style={styles.textBlock}>
          <ThemedText style={styles.title} typography="title-3-bold">
            프로필 사진을 등록해주세요.
          </ThemedText>
          <ThemedText style={styles.description} typography="body-2-medium">
            사진은 나중에 변경할 수 있어요.
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityLabel="지금은 건너뛸래요"
          accessibilityRole="button"
          hitSlop={8}
          onPress={completeOnboarding}
          style={styles.skipButton}
        >
          <ThemedText style={styles.skipText} typography="body-2-medium">
            지금은 건너뛸래요
          </ThemedText>
        </Pressable>
        <OnboardingCtaButton
          disabled={!profileImageUrl}
          onPress={completeOnboarding}
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
  avatarWrapper: {
    height: AVATAR_OUTER_SIZE,
    width: AVATAR_OUTER_SIZE,
  },
  avatarOuter: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-normal"],
    borderRadius: AVATAR_OUTER_SIZE / 2,
    borderWidth: 1,
    height: AVATAR_OUTER_SIZE,
    justifyContent: "center",
    overflow: "hidden",
    width: AVATAR_OUTER_SIZE,
  },
  avatarInner: {
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: AVATAR_INNER_SIZE / 2,
    height: AVATAR_INNER_SIZE,
    width: AVATAR_INNER_SIZE,
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  cameraButton: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: CAMERA_BUTTON_SIZE / 2,
    bottom: 0,
    height: CAMERA_BUTTON_SIZE,
    justifyContent: "center",
    position: "absolute",
    right: -9,
    width: CAMERA_BUTTON_SIZE,
  },
  cameraGlyph: {
    color: semanticColors["label-subtle"],
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
    alignItems: "center",
    gap: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skipButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  skipText: {
    color: semanticColors["label-subtle"],
  },
});
