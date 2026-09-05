import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { OnboardingCtaButton } from "@/features/auth/components/onboarding-cta-button";
import { OnboardingHeader } from "@/features/auth/components/onboarding-header";
import { ProfileAvatarPreview } from "@/features/auth/components/profile-avatar-preview";
import {
  ImageUploadError,
  logImageUploadError,
} from "@/features/upload/cloudinary";
import { pickImage } from "@/features/upload/use-image-upload";
import { useSignupStore } from "@/store/signup-store";

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
// signup-complete's "시작하기", not here.
function goToSignupComplete() {
  router.push("/signup-complete");
}

export default function ProfilePhotoScreen() {
  const isNewUser = useSignupStore((state) => state.isNewUser);
  const nickname = useSignupStore((state) => state.nickname);
  const confirmedPhotoUri = useSignupStore((state) => state.confirmedPhotoUri);
  const [isPicking, setIsPicking] = useState(false);

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

  async function handlePickImage() {
    if (isPicking) return;
    setIsPicking(true);
    try {
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

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      <OnboardingHeader onBack={handleBack} title="프로필 설정" />

      <View style={styles.content}>
        <Pressable
          accessibilityLabel="프로필 사진 선택"
          accessibilityRole="button"
          disabled={isPicking}
          onPress={handlePickImage}
        >
          <ProfileAvatarPreview imageUri={confirmedPhotoUri} />
        </Pressable>

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
          onPress={goToSignupComplete}
          style={styles.skipButton}
        >
          <ThemedText style={styles.skipText} typography="body-2-medium">
            지금은 건너뛸래요
          </ThemedText>
        </Pressable>
        <OnboardingCtaButton
          disabled={!confirmedPhotoUri}
          onPress={goToSignupComplete}
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
