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

const NICKNAME_MIN_LENGTH = 3;
const NICKNAME_MAX_LENGTH = 20;

// Only A-Z, a-z, 0-9, and the three allowed special characters may ever sit
// in state — everything else (whitespace, Hangul, other punctuation, emoji)
// is stripped as it's typed. Case is never transformed; "abc" and "ABC" stay
// distinct.
const NICKNAME_INPUT_DISALLOWED_CHARS = /[^A-Za-z0-9._-]/g;

const NICKNAME_FORMAT_PATTERN = new RegExp(
  `^[A-Za-z0-9._-]{${NICKNAME_MIN_LENGTH},${NICKNAME_MAX_LENGTH}}$`,
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
  const formatValid = NICKNAME_FORMAT_PATTERN.test(nickname);

  // No nickname duplicate-check endpoint exists anywhere in the current API
  // surface (confirmed by searching the whole codebase) — until the backend
  // adds one, real availability can never be confirmed, so this stays
  // hard-coded false in production and the CTA below stays disabled even
  // for an otherwise-valid nickname. Do not derive this from format
  // validation.
  //
  // TODO(backend): remove this __DEV__ bypass once the duplicate-check API
  // exists and is wired up here — it exists solely so the rest of the
  // signup UI flow (profile-photo, signup-complete) can be exercised in
  // development builds without a real availability check to pass.
  // formatValid is unaffected and still rejects the same invalid input
  // (too short/long, whitespace, disallowed special characters) in dev
  // builds.
  const nicknameAvailabilityConfirmed = __DEV__ ? formatValid : false;
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
  // designed error copy for an invalid format (too short/long, disallowed
  // characters, etc.), so rather than inventing one, this stays the single
  // guidance string regardless of validity — formatValid still gates
  // canSubmit above, this text just isn't used to communicate that.
  const helperText =
    "영어·숫자 및 특수기호(.,-,_)만 사용하여 3~20자로 입력해주세요.";

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
