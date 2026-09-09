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
  hasDetail: boolean;
  onPressDetail?: () => void;
};

function TermRow({
  title,
  required,
  checked,
  onToggle,
  hasDetail,
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
      {hasDetail ? (
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
        // Keeps the same-width column so rows without a detail page still
        // align their checkbox/text with rows that have a chevron.
        <View style={styles.chevronButton} />
      )}
    </View>
  );
}

// 화면에 그려지는 약관은 전부 GET /api/v1/terms 응답이고, 로컬에서 만들어내는
// 약관은 없다. 이 배열은 Figma(AC-01-04)가 정의하는 표시 계층 — 노출 순서, 문구,
// chevron(상세 진입) 노출 여부 — 만 담당한다. id·type·required·contentUrl·agreed
// 같은 실제 약관 상태는 서버 응답이 source of truth다.
//
// SERVICE 타입 약관이 둘(만 14세 / 이용약관)이라 type만으로는 구분되지 않아
// 그 둘은 title로, 타입이 유일한 MARKETING은 title 변경에 흔들리지 않도록
// type으로 매칭한다. title 매칭은 서버가 "동의" 접미사를 붙여 내려주든 아니든
// 걸리도록 접미사를 떼고 비교한다.
type TermDisplaySpec = {
  match: (term: Term) => boolean;
  title: string;
  hasDetail: boolean;
};

function byTitle(title: string) {
  return (term: Term) => term.title.replace(/\s*동의$/, "") === title;
}

const TERM_DISPLAY: TermDisplaySpec[] = [
  {
    match: byTitle("만 14세 이상 가입"),
    title: "만 14세 이상 가입 동의",
    // 법적 고지 문서가 아니라 가입 자격 확인이라 Figma에 상세 진입이 없다.
    hasDetail: false,
  },
  {
    match: byTitle("찌뿌두둥 이용약관"),
    title: "찌뿌두둥 이용약관 동의",
    hasDetail: true,
  },
  {
    match: byTitle("개인정보 수집 및 이용"),
    title: "개인정보 수집 및 이용 동의",
    hasDetail: true,
  },
  {
    match: (term) => term.type === "MARKETING",
    title: "Push 알림 동의",
    // 서버가 contentUrl을 내려주더라도 Figma에는 chevron이 없다.
    hasDetail: false,
  },
];

function termOrderIndex(term: Term) {
  const index = TERM_DISPLAY.findIndex((spec) => spec.match(term));
  // Figma에 없는 약관이 서버에 추가되면 알려진 항목 뒤에 서버 순서대로 붙는다.
  return index === -1 ? TERM_DISPLAY.length : index;
}

export default function TermsAgreementScreen() {
  const [terms, setTerms] = useState<Term[] | null>(null);
  const [agreements, setAgreements] = useState<Record<number, boolean>>({});
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

  const orderedTerms = useMemo(
    () =>
      terms === null
        ? null
        : // sort는 stable이라 TERM_DISPLAY에 없는 약관끼리는 서버 순서를 유지한다.
          [...terms].sort((a, b) => termOrderIndex(a) - termOrderIndex(b)),
    [terms],
  );

  // 선택 약관(MARKETING)까지 포함한다.
  const allAgreed = useMemo(
    () => terms !== null && terms.every((term) => agreements[term.id]),
    [terms, agreements],
  );

  // required 약관만 본다 — MARKETING은 required=false라 미동의여도 다음 단계로
  // 진행할 수 있다.
  const requiredAgreed = useMemo(() => {
    if (terms === null) return false;
    const requiredTerms = terms.filter((term) => term.required);
    // 빈 배열의 every()는 true라 length 확인이 필요하다 — 서버가 필수 약관을
    // 하나도 내려주지 않으면 아무것도 동의하지 않은 채로 다음 버튼이 열린다.
    return (
      requiredTerms.length > 0 &&
      requiredTerms.every((term) => agreements[term.id])
    );
  }, [terms, agreements]);

  function toggleAll(value: boolean) {
    if (!terms) return;
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
      // Only flips true once the server call above actually succeeded —
      // nickname/profile-photo/signup-complete's guards gate on this to
      // block a new user from jumping straight past terms, so it must
      // never be set on a click alone or a failed request.
      useSignupStore.getState().setHasAgreedToRequiredTerms(true);
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

  if (!terms || !orderedTerms) {
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
          {orderedTerms.map((term) => {
            const display = TERM_DISPLAY.find((spec) => spec.match(term));
            const title = display?.title ?? term.title;
            // chevron 노출은 Figma 정책이 먼저고, 서버 contentUrl은 실제로 열
            // 페이지가 있는지 확인하는 용도로만 쓴다.
            const hasDetail =
              (display?.hasDetail ?? true) && isValidHttpUrl(term.contentUrl);
            return (
              <TermRow
                checked={agreements[term.id] ?? false}
                hasDetail={hasDetail}
                key={term.id}
                onPressDetail={
                  hasDetail
                    ? () => openTermContent(title, term.contentUrl)
                    : undefined
                }
                onToggle={() =>
                  setAgreements((current) => ({
                    ...current,
                    [term.id]: !current[term.id],
                  }))
                }
                required={term.required}
                title={title}
              />
            );
          })}
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
