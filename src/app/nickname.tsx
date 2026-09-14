import { Image } from "expo-image";
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
import { typography } from "@/constants/tokens";
import { OnboardingCtaButton } from "@/features/auth/components/onboarding-cta-button";
import { OnboardingHeader } from "@/features/auth/components/onboarding-header";
import {
  OnboardingContent,
  OnboardingFooter,
} from "@/features/auth/components/onboarding-layout";
import {
  NICKNAME_ALREADY_USED_TEXT,
  NICKNAME_FORMAT_GUIDE_TEXT,
  NICKNAME_MAX_LENGTH,
  validateNickname,
} from "@/features/auth/nickname-validation";
import { signupColors } from "@/features/auth/signup-ui";
import { useNicknameAvailability } from "@/features/auth/use-nickname-availability";
import { useSignupStore } from "@/store/signup-store";

// Figma "Field"(3326:9022 포커스 / 3326:9034 오류) — 52 높이, radius 12,
// 안쪽 left 15 / right 17. Figma는 stroke가 padding 안쪽에 겹치므로 RN
// border 두께만큼 padding을 줄여 텍스트 시작 위치를 같게 맞춘다.
const FIELD_PADDING_LEFT = 15;
const FIELD_PADDING_RIGHT = 17;
const FIELD_FOCUS_BORDER_WIDTH = 1.5;
const FIELD_ERROR_BORDER_WIDTH = 1.4;

function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/login");
}

type NicknameFieldStatus = "default" | "success" | "format-error" | "duplicate";

export default function NicknameScreen() {
  const storedNickname = useSignupStore((state) => state.nickname);
  const setStoredNickname = useSignupStore((state) => state.setNickname);
  const [nickname, setNickname] = useState(storedNickname);
  const [isFocused, setIsFocused] = useState(false);

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

  // 사용자가 친 문자열을 그대로 보관한다 — 한글/공백/허용하지 않는 기호나 20자
  // 초과분을 지우거나 잘라내지 않고, 아래 validateNickname 결과로만 오류를
  // 안내한다. 서버에는 로컬 검증 + 중복 확인을 모두 통과한 값만 저장된다
  // (handleNext는 canSubmit일 때만 store에 쓴다).
  function handleChangeText(text: string) {
    setNickname(text);
  }

  function handleNext() {
    if (!canSubmit) return;
    setStoredNickname(nickname);
    router.push("/profile-photo");
  }

  // Figma가 그린 상태: 기본 안내(4501:44699), 성공(4501:44714), 로컬 검증
  // 오류(4501:44879 + 마이페이지와 공유하는 Field/닉네임 variant별 문구), 중복
  // (4501:44862). 우선순위는 validateNickname의 로컬 규칙(길이 → 문자 → 기호
  // 위치)이 먼저고, 로컬 검증을 통과한 값만 중복 확인 훅이 서버에 물어본다 —
  // 훅은 invalid 값에 대해 "idle"을 돌려주므로 별도 요청이 나가지 않는다.
  // "checking"/"error"(네트워크 실패는 훅이 Alert로 알림)는 디자인된 문구가
  // 없어 기본 안내를 유지하고 CTA만 비활성으로 둔다.
  const validation = validateNickname(nickname);
  const status: NicknameFieldStatus = validation.message
    ? "format-error"
    : availability === "unavailable"
      ? "duplicate"
      : availability === "available"
        ? "success"
        : "default";
  const hasError = status === "format-error" || status === "duplicate";
  const errorMessage =
    status === "duplicate"
      ? `${NICKNAME_ALREADY_USED_TEXT}.`
      : validation.message;

  // 포커스(빈값 포함)는 charcoal/9 1.5px, 오류는 neg/normal 1.4px, 그 외
  // (성공 포함)는 테두리 없음.
  const borderWidth = hasError
    ? FIELD_ERROR_BORDER_WIDTH
    : isFocused
      ? FIELD_FOCUS_BORDER_WIDTH
      : 0;
  const borderColor = hasError
    ? signupColors.negative
    : signupColors.fieldFocusBorder;

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
        <OnboardingContent style={styles.content}>
          <View style={styles.titleAndField}>
            <ThemedText style={styles.title} typography="title-3-bold">
              사용할 닉네임을 입력해주세요.
            </ThemedText>

            <View
              style={[
                styles.field,
                {
                  borderColor,
                  borderWidth,
                  paddingLeft: FIELD_PADDING_LEFT - borderWidth,
                  paddingRight: FIELD_PADDING_RIGHT - borderWidth,
                },
              ]}
            >
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={() => setIsFocused(false)}
                onChangeText={handleChangeText}
                onFocus={() => setIsFocused(true)}
                placeholder="닉네임 입력"
                placeholderTextColor={signupColors.textSubtle}
                style={styles.input}
                value={nickname}
              />
              <ThemedText
                style={[styles.counter, hasError && styles.counterError]}
                typography="caption-1-regular"
              >
                {nickname.length} / {NICKNAME_MAX_LENGTH}
              </ThemedText>
            </View>
          </View>

          {status === "default" && (
            <ThemedText style={styles.helper} typography="body-3-regular">
              {NICKNAME_FORMAT_GUIDE_TEXT}
            </ThemedText>
          )}
          {status === "success" && (
            <View style={styles.statusRow}>
              <Image
                contentFit="contain"
                source={require("@/assets/signup/icon-status-success.svg")}
                style={styles.statusIcon}
              />
              <ThemedText
                style={styles.successText}
                typography="caption-1-regular"
              >
                사용 가능한 닉네임이에요.
              </ThemedText>
            </View>
          )}
          {hasError && (
            <View style={styles.statusRow}>
              <Image
                contentFit="contain"
                source={require("@/assets/signup/icon-status-error.svg")}
                style={styles.statusIcon}
              />
              <ThemedText style={styles.errorText} typography="body-3-regular">
                {errorMessage}
              </ThemedText>
            </View>
          )}
        </OnboardingContent>

        <OnboardingFooter>
          <OnboardingCtaButton disabled={!canSubmit} onPress={handleNext} />
        </OnboardingFooter>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: signupColors.white,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  // Figma 콘텐츠(4501:44709) top 112 = status bar 44 + TopNav 52 + 16,
  // 제목+필드 묶음과 안내 문구 사이 gap 8.
  content: {
    flex: 1,
    gap: 8,
    paddingTop: 16,
  },
  titleAndField: {
    gap: 20,
  },
  title: {
    color: signupColors.text,
  },
  field: {
    alignItems: "center",
    backgroundColor: signupColors.fieldBackground,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    height: 52,
  },
  input: {
    color: signupColors.text,
    flex: 1,
    fontFamily: typography["body-1-medium"].fontFamily,
    fontSize: typography["body-1-medium"].fontSize,
    lineHeight: typography["body-1-medium"].lineHeight,
    padding: 0,
  },
  counter: {
    color: signupColors.textSubtle,
  },
  counterError: {
    color: signupColors.negative,
  },
  helper: {
    color: signupColors.textSubtle,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  // Icon / 상태 성공·오류는 16px 컴포넌트지만 이 화면에서는 14px로 놓였다.
  statusIcon: {
    height: 14,
    width: 14,
  },
  successText: {
    color: signupColors.positive,
    flex: 1,
  },
  errorText: {
    color: signupColors.negative,
    flex: 1,
  },
});
