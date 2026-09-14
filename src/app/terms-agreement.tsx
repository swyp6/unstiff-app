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
import { LEGAL_DOCUMENTS } from "@/constants/legal-urls";
import { agreeToTerms, getTerms } from "@/features/auth/api";
import { CheckCircle } from "@/features/auth/components/check-circle";
import { OnboardingCtaButton } from "@/features/auth/components/onboarding-cta-button";
import { OnboardingHeader } from "@/features/auth/components/onboarding-header";
import {
  OnboardingContent,
  OnboardingFooter,
} from "@/features/auth/components/onboarding-layout";
import { signupColors } from "@/features/auth/signup-ui";
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

type TermRowProps = {
  title: string;
  required: boolean;
  checked: boolean;
  onToggle: () => void;
  hasDetail: boolean;
  onPressDetail?: () => void;
};

// Figma "약관 행"(4501:44659) — py 14, 24px Circle, gap 12, body/2/regular
// 본문, 열 수 있는 contentUrl이 있는 행은 오른쪽에 body/3/regular 밑줄
// "보기"(charcoal/5).
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
        <CheckCircle checked={checked} />
        <ThemedText style={styles.termText} typography="body-2-regular">
          {required ? "[필수] " : "[선택] "}
          {title}
        </ThemedText>
      </Pressable>
      {hasDetail && (
        <Pressable
          accessibilityLabel={`${title} 상세 보기`}
          accessibilityRole="button"
          hitSlop={12}
          onPress={onPressDetail}
        >
          <ThemedText style={styles.detailText} typography="body-3-regular">
            보기
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

// 화면에 그려지는 약관은 전부 GET /api/v1/terms 응답이고, 로컬에서 만들어내는
// 약관은 없다. 이 배열은 표시 계층 — 노출 순서와 문구 — 만 담당한다.
// id·type·required·contentUrl·agreed 같은 실제 약관 상태는 서버 응답이
// source of truth다. 4종 모두 배포된 문서(LEGAL_DOCUMENTS)가 있으므로 "보기"는
// 서버가 열 수 있는 contentUrl을 내려주는지만 보고 정한다.
//
// 민감정보/외부 AI 약관의 서버 type은 아직 정해지지 않아 type이 아니라 문서명으로
// 매칭한다. 서버가 "[필수] " 접두어나 "동의" 접미사를 붙여 내려주든 아니든
// 걸리도록 둘 다 떼고 비교한다.
type TermDisplaySpec = {
  match: (term: Term) => boolean;
  title: string;
};

function normalizeTermTitle(title: string) {
  return title
    .replace(/^\[(필수|선택)\]\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/\s*동의$/, "")
    .trim();
}

function byTitle(title: string) {
  const expected = normalizeTermTitle(title);
  return (term: Term) => normalizeTermTitle(term.title) === expected;
}

const TERM_DISPLAY: TermDisplaySpec[] = LEGAL_DOCUMENTS.map((document) => ({
  match: byTitle(document.title),
  title: document.title,
}));

function termOrderIndex(term: Term) {
  const index = TERM_DISPLAY.findIndex((spec) => spec.match(term));
  // 목록에 없는 약관이 서버에 추가되면 알려진 항목 뒤에 서버 순서대로 붙는다.
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

  // 선택 약관(외부 AI 동의)까지 포함한다.
  const allAgreed = useMemo(
    () =>
      orderedTerms !== null &&
      orderedTerms.length > 0 &&
      orderedTerms.every((term) => agreements[term.id]),
    [orderedTerms, agreements],
  );

  // required 약관만 본다 — 선택 약관(외부 AI 동의)은 required=false라 미동의여도
  // 다음 단계로 진행할 수 있다.
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
    if (!orderedTerms) return;
    setAgreements((current) => ({
      ...current,
      ...Object.fromEntries(orderedTerms.map((term) => [term.id, value])),
    }));
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
          <ActivityIndicator color={signupColors.text} />
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

      <OnboardingContent style={styles.content}>
        <ThemedText style={styles.title} typography="title-3-bold">
          이용약관 동의
        </ThemedText>

        <Pressable
          accessibilityLabel="약관 전체 동의"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: allAgreed }}
          onPress={() => toggleAll(!allAgreed)}
          style={styles.allAgreeRow}
        >
          <CheckCircle checked={allAgreed} />
          <ThemedText style={styles.allAgreeText} typography="body-1-bold">
            약관 전체 동의
          </ThemedText>
        </Pressable>

        <View style={styles.divider} />

        <View style={styles.sectionLabelArea}>
          <ThemedText style={styles.sectionLabel} typography="body-3-bold">
            약관 동의
          </ThemedText>
        </View>

        {orderedTerms.map((term) => {
          const display = TERM_DISPLAY.find((spec) => spec.match(term));
          const title = display?.title ?? term.title;
          // 4종 모두 상세 문서가 있어 열 수 있는 contentUrl이 오면 "보기"를
          // 보여준다. contentUrl이 null인 약관은 서버 계약대로 체크박스만 둔다.
          const hasDetail = isValidHttpUrl(term.contentUrl);
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
      </OnboardingContent>

      <OnboardingFooter>
        <OnboardingCtaButton disabled={!canSubmit} onPress={handleSubmit} />
      </OnboardingFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: signupColors.white,
    flex: 1,
  },
  loadingScreen: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: signupColors.text,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: signupColors.white,
  },
  // Figma 콘텐츠 top 108 = status bar 44 + TopNav 52 + 12.
  content: {
    flex: 1,
    paddingTop: 12,
  },
  title: {
    color: signupColors.text,
  },
  allAgreeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingBottom: 20,
    paddingTop: 24,
  },
  allAgreeText: {
    color: signupColors.text,
    flex: 1,
  },
  divider: {
    backgroundColor: signupColors.fill,
    height: 1,
    width: "100%",
  },
  sectionLabelArea: {
    paddingBottom: 4,
    paddingTop: 24,
  },
  sectionLabel: {
    color: signupColors.textSubtle,
  },
  termRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 14,
  },
  termCheckArea: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  termText: {
    color: signupColors.text,
    flex: 1,
  },
  detailText: {
    color: signupColors.textSubtle,
    textDecorationLine: "underline",
  },
});
