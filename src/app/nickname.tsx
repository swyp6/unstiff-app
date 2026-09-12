import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors, typography } from "@/constants/tokens";
import { OnboardingCtaButton } from "@/features/auth/components/onboarding-cta-button";
import { OnboardingHeader } from "@/features/auth/components/onboarding-header";
import {
  NICKNAME_MAX_LENGTH,
  sanitizeNickname,
} from "@/features/auth/nickname-validation";
import { useNicknameAvailability } from "@/features/auth/use-nickname-availability";
import { useSignupStore } from "@/store/signup-store";

function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/login");
}

export default function NicknameScreen() {
  const storedNickname = useSignupStore((state) => state.nickname);
  const setStoredNickname = useSignupStore((state) => state.setNickname);
  const [nickname, setNickname] = useState(storedNickname);

  // Guard against reaching this screen out of order — two distinct cases,
  // not conflated: (1) this isn't a new-user onboarding session at all
  // (direct/deep link, or an existing user) → same fallback as before,
  // /login; (2) it is a new-user session but required terms haven't
  // actually been agreed to yet → /terms-agreement, not /login, since the
  // user just needs to finish that step, not start over. Checked once at
  // mount via getState() rather than reactive dependencies — this screen
  // stays mounted (not unmounted) underneath profile-photo/signup-complete
  // in the push-based stack, so subscribing reactively meant
  // signup-complete's own reset() (on "시작하기") flipped this state back
  // to its initial values while this screen was still alive, firing this
  // redirect and racing the intended router.replace("/home").
  useEffect(() => {
    const state = useSignupStore.getState();
    if (!state.isNewUser) {
      router.replace("/login");
      return;
    }
    if (!state.hasAgreedToRequiredTerms) {
      router.replace("/terms-agreement");
    }
  }, []);

  const hasInput = nickname.length > 0;

  // Bumped on every focus so a nickname already marked "available" gets
  // re-checked if the user is sent back here after it was rejected as
  // NICKNAME_ALREADY_USED at final save (profile-photo/signup-complete stay
  // mounted underneath this screen, so this component instance — and its
  // stale availability state — would otherwise survive that round trip
  // untouched).
  const [refreshKey, setRefreshKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRefreshKey((key) => key + 1);
    }, []),
  );

  const availability = useNicknameAvailability(nickname, { refreshKey });
  const canSubmit = availability === "available";

  function handleChangeText(text: string) {
    setNickname(sanitizeNickname(text));
  }

  function handleNext() {
    if (!canSubmit) return;
    setStoredNickname(nickname);
    router.push("/profile-photo");
  }

  // Figma only designed two helper-text states: this default guidance copy
  // and "사용 가능한 닉네임이에요." (shown once the duplicate-check confirms
  // availability). There's no designed copy for "unavailable"/"checking"/
  // "error" — those states are only communicated via the CTA staying
  // disabled, not by changing this text.
  const helperText =
    availability === "available"
      ? "사용 가능한 닉네임이에요."
      : "영문과 숫자로 2~10자, 특수기호는 . _ 만 쓸 수 있어요";

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      <OnboardingHeader onBack={handleBack} title="프로필 설정" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <ThemedText style={styles.title} typography="title-3-bold">
            사용할 닉네임을 입력해주세요.
          </ThemedText>

          <View style={[styles.inputBox, hasInput && styles.inputBoxFilled]}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={NICKNAME_MAX_LENGTH}
              onChangeText={handleChangeText}
              placeholder="닉네임 입력"
              placeholderTextColor={semanticColors["label-disabled"]}
              style={[styles.input, hasInput && styles.inputFilled]}
              value={nickname}
            />
            {hasInput && (
              <ThemedText style={styles.counter} typography="caption-1-regular">
                {nickname.length}/{NICKNAME_MAX_LENGTH}
              </ThemedText>
            )}
          </View>

          <ThemedText style={styles.helper} typography="caption-1-regular">
            {helperText}
          </ThemedText>
        </View>

        <View style={styles.footer}>
          <OnboardingCtaButton disabled={!canSubmit} onPress={handleNext} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: semanticColors["fill-subtle"],
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  title: {
    color: semanticColors["label-normal"],
    marginBottom: 18,
  },
  inputBox: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: radius.default,
    flexDirection: "row",
    height: 52,
    paddingHorizontal: 16,
  },
  inputBoxFilled: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-normal"],
    borderWidth: 1,
  },
  input: {
    color: semanticColors["label-normal"],
    flex: 1,
    fontFamily: typography["body-2-regular"].fontFamily,
    fontSize: typography["body-2-regular"].fontSize,
    lineHeight: typography["body-2-regular"].lineHeight,
    padding: 0,
  },
  inputFilled: {
    color: semanticColors["label-subtle"],
    fontFamily: typography["body-2-bold"].fontFamily,
  },
  counter: {
    color: semanticColors["label-disabled"],
  },
  helper: {
    color: semanticColors["label-subtle"],
    marginTop: 14,
  },
  footer: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
