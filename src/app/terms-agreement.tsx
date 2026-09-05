import Ionicons from "@expo/vector-icons/Ionicons";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";
import { agreeToTerms, getTerms } from "@/features/auth/api";
import { OnboardingCtaButton } from "@/features/auth/components/onboarding-cta-button";
import { OnboardingHeader } from "@/features/auth/components/onboarding-header";
import type { Term } from "@/features/auth/types";
import { useSignupStore } from "@/store/signup-store";

function isValidHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function openTermContent(
  title: string,
  contentUrl: string | null | undefined,
) {
  if (!isValidHttpUrl(contentUrl)) {
    console.warn(
      `[terms-agreement] invalid contentUrl for term "${title}":`,
      contentUrl,
    );
    Alert.alert("오류", "약관 내용을 불러올 수 없습니다.");
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(contentUrl);
  } catch {
    Alert.alert("오류", "페이지를 열지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
}

function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/login");
}

type CheckboxProps = {
  checked: boolean;
};

function Checkbox({ checked }: CheckboxProps) {
  return (
    <View
      style={[
        styles.checkbox,
        checked ? styles.checkboxChecked : styles.checkboxUnchecked,
      ]}
    >
      {checked && (
        <Ionicons
          color={semanticColors["primary-on"]}
          name="checkmark"
          size={16}
        />
      )}
    </View>
  );
}

type TermRowProps = {
  title: string;
  required: boolean;
  checked: boolean;
  onToggle: () => void;
  onPressDetail?: () => void;
};

function TermRow({
  title,
  required,
  checked,
  onToggle,
  onPressDetail,
}: TermRowProps) {
  return (
    <View style={styles.termRow}>
      <Pressable
        accessibilityLabel={title}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={onToggle}
        style={styles.termCheckArea}
      >
        <Checkbox checked={checked} />
        <ThemedText style={styles.termText} typography="body-2-regular">
          {required ? "[필수] " : "[선택] "}
          {title}
        </ThemedText>
      </Pressable>
      {onPressDetail ? (
        <Pressable
          accessibilityLabel={`${title} 상세 보기`}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onPressDetail}
          style={styles.chevronButton}
        >
          <Ionicons
            color={semanticColors["label-subtle"]}
            name="chevron-forward"
            size={18}
          />
        </Pressable>
      ) : (
        // No server Term/contentUrl backs this row, so the chevron is
        // shown for visual parity with Figma but isn't interactive.
        <View style={styles.chevronButton}>
          <Ionicons
            color={semanticColors["label-subtle"]}
            name="chevron-forward"
            size={18}
          />
        </View>
      )}
    </View>
  );
}

// The server's Term list has no "만 14세 이상" entry — it's a signup
// eligibility check, not a legal document, so it's tracked as local-only
// state and excluded from the agreeToTerms payload.
const AGE_REQUIREMENT_TITLE = "만 14세 이상 가입 동의";

export default function TermsAgreementScreen() {
  const [terms, setTerms] = useState<Term[] | null>(null);
  const [agreements, setAgreements] = useState<Record<number, boolean>>({});
  const [ageRequirementAgreed, setAgeRequirementAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getTerms()
      .then((result) => {
        if (cancelled) return;
        setTerms(result.terms);
        setAgreements(
          Object.fromEntries(
            result.terms.map((term) => [term.id, term.agreed]),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retry() {
    setLoadError(false);
    setReloadKey((key) => key + 1);
  }

  const allAgreed = useMemo(
    () =>
      terms !== null &&
      ageRequirementAgreed &&
      terms.every((term) => agreements[term.id]),
    [terms, agreements, ageRequirementAgreed],
  );

  const requiredAgreed = useMemo(
    () =>
      terms !== null &&
      ageRequirementAgreed &&
      terms
        .filter((term) => term.required)
        .every((term) => agreements[term.id]),
    [terms, agreements, ageRequirementAgreed],
  );

  function toggleAll(value: boolean) {
    if (!terms) return;
    setAgeRequirementAgreed(value);
    setAgreements(Object.fromEntries(terms.map((term) => [term.id, value])));
  }

  async function handleSubmit() {
    if (!terms) return;
    setIsSubmitting(true);
    try {
      const agreedIds = terms
        .filter((term) => agreements[term.id])
        .map((term) => term.id);
      await agreeToTerms(agreedIds);
      if (useSignupStore.getState().isNewUser) {
        // Keep terms-agreement in the stack so nickname/profile-photo can
        // `router.back()` here — unlike the final /home hop, this isn't a
        // dead end for an existing user re-agreeing to updated terms.
        router.push("/nickname");
      } else {
        router.replace("/home");
      }
    } catch {
      Alert.alert("오류", "약관 동의 처리 중 문제가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <SafeAreaView
        edges={["top", "left", "right", "bottom"]}
        style={styles.screen}
      >
        <OnboardingHeader onBack={handleBack} title="회원가입" />
        <View style={styles.loadingScreen}>
          <ThemedText
            style={styles.errorText}
            themeColor="textSecondary"
            typography="body-2-medium"
          >
            약관 정보를 불러오지 못했습니다.
          </ThemedText>
          <Pressable
            accessibilityLabel="다시 시도"
            accessibilityRole="button"
            onPress={retry}
            style={styles.retryButton}
          >
            <ThemedText
              style={styles.retryButtonText}
              typography="body-1-medium"
            >
              다시 시도
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!terms) {
    return (
      <SafeAreaView
        edges={["top", "left", "right", "bottom"]}
        style={styles.screen}
      >
        <OnboardingHeader onBack={handleBack} title="회원가입" />
        <View style={styles.loadingScreen}>
          <ActivityIndicator color={semanticColors["label-normal"]} />
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = requiredAgreed && !isSubmitting;

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      <OnboardingHeader onBack={handleBack} title="회원가입" />

      <View style={styles.content}>
        <ThemedText style={styles.title} typography="title-3-bold">
          이용약관 동의
        </ThemedText>

        <Pressable
          accessibilityLabel="약관 전체 동의"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: allAgreed }}
          onPress={() => toggleAll(!allAgreed)}
          style={styles.allAgreeCard}
        >
          <Checkbox checked={allAgreed} />
          <ThemedText style={styles.allAgreeText} typography="body-2-bold">
            약관 전체 동의
          </ThemedText>
        </Pressable>

        <ThemedText style={styles.sectionLabel} typography="caption-1-regular">
          찌뿌둥 이용약관
        </ThemedText>

        <View style={styles.termsList}>
          <TermRow
            checked={ageRequirementAgreed}
            onToggle={() => setAgeRequirementAgreed((value) => !value)}
            required
            title={AGE_REQUIREMENT_TITLE}
          />
          {terms.map((term) => (
            <TermRow
              checked={agreements[term.id] ?? false}
              key={term.id}
              onPressDetail={() => openTermContent(term.title, term.contentUrl)}
              onToggle={() =>
                setAgreements((current) => ({
                  ...current,
                  [term.id]: !current[term.id],
                }))
              }
              required={term.required}
              title={term.title}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <OnboardingCtaButton disabled={!canSubmit} onPress={handleSubmit} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: semanticColors["fill-subtle"],
    flex: 1,
  },
  loadingScreen: {
    alignItems: "center",
    gap: 16,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: semanticColors["primary-normal"],
    borderRadius: radius.default,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: semanticColors["primary-on"],
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
  allAgreeCard: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-normal"],
    borderRadius: radius.default,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    height: 52,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  allAgreeText: {
    color: semanticColors["label-normal"],
  },
  sectionLabel: {
    color: semanticColors["label-subtle"],
    marginBottom: 18,
  },
  termsList: {
    gap: 14,
  },
  termRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 44,
  },
  termCheckArea: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  termText: {
    color: semanticColors["label-normal"],
    flexShrink: 1,
  },
  chevronButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 24,
  },
  checkbox: {
    alignItems: "center",
    borderRadius: 6,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkboxChecked: {
    backgroundColor: semanticColors["primary-normal"],
  },
  checkboxUnchecked: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-strong"],
    borderWidth: 1,
  },
  footer: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
