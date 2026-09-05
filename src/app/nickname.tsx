import { router } from "expo-router";
import { useEffect, useState } from "react";
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
import { useSignupStore } from "@/store/signup-store";

const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 10;

// Input-stage filter only — keeps whitespace/punctuation/emoji out of state
// as the user types, but must still tolerate compatibility jamo (ㄱ-ㅎ,
// ㅏ-ㅣ) so an in-progress Hangul composition (a lone "ㅅ" before it becomes
// "사") isn't stripped mid-keystroke. This is deliberately looser than
// NICKNAME_FORMAT_PATTERN below — passing this filter does NOT mean the
// nickname is valid, only that it's safe to hold in state.
const NICKNAME_INPUT_DISALLOWED_CHARS = /[^A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/g;

// Final validity check. Deliberately stricter than the input filter above:
// lone/compatibility jamo that never resolved into a complete syllable
// (e.g. "ㄱㄱ", "ㅏㅏ", "ㄱ1") must NOT pass here, even though the input
// filter has to let it sit in state mid-composition.
const NICKNAME_FORMAT_PATTERN = new RegExp(
  `^[A-Za-z0-9가-힣]{${NICKNAME_MIN_LENGTH},${NICKNAME_MAX_LENGTH}}$`,
);

function sanitizeNickname(value: string) {
  return value
    .replace(NICKNAME_INPUT_DISALLOWED_CHARS, "")
    .slice(0, NICKNAME_MAX_LENGTH);
}

function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/login");
}

export default function NicknameScreen() {
  const isNewUser = useSignupStore((state) => state.isNewUser);
  const storedNickname = useSignupStore((state) => state.nickname);
  const setStoredNickname = useSignupStore((state) => state.setNickname);
  const [nickname, setNickname] = useState(storedNickname);

  // Minimal guard against reaching this screen by direct/deep-link
  // navigation outside the SNS-login → terms flow (the in-memory signup
  // store is only ever set to newUser there).
  useEffect(() => {
    if (!isNewUser) {
      router.replace("/login");
    }
  }, [isNewUser]);

  const hasInput = nickname.length > 0;
  const formatValid = NICKNAME_FORMAT_PATTERN.test(nickname);

  // No nickname duplicate-check endpoint exists anywhere in the current API
  // surface (confirmed by searching the whole codebase) — until the backend
  // adds one, real availability can never be confirmed, so this stays
  // hard-coded false and the CTA below stays disabled even for an
  // otherwise-valid nickname. Do not derive this from format validation.
  const nicknameAvailabilityConfirmed = false;
  const canSubmit = formatValid && nicknameAvailabilityConfirmed;

  function handleChangeText(text: string) {
    setNickname(sanitizeNickname(text));
  }

  function handleNext() {
    if (!canSubmit) return;
    setStoredNickname(nickname);
    router.push("/profile-photo");
  }

  // Figma only designed two helper-text states: this initial guidance copy
  // and "사용 가능한 닉네임이에요." (shown only once a real duplicate-check
  // succeeds — see nicknameAvailabilityConfirmed above). There's no
  // designed error copy for an invalid format (too short, jamo-only,
  // etc.), so rather than inventing one, this stays the single guidance
  // string regardless of validity — formatValid still gates canSubmit
  // above, this text just isn't used to communicate that.
  const helperText = "한글, 영어, 숫자 포함 2~10자까지 가능해요.";

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
