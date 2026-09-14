import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getTerms } from "@/features/auth/api";
import { OnboardingHeader } from "@/features/auth/components/onboarding-header";
import { OnboardingContent } from "@/features/auth/components/onboarding-layout";
import {
  formatOnboardingTermLabel,
  getOnboardingDocumentTitle,
  getOnboardingTermTitle,
  isOnboardingTermType,
  isValidHttpUrl,
} from "@/features/auth/onboarding-terms";
import { signupColors } from "@/features/auth/signup-ui";
import type { Term } from "@/features/auth/types";
import { LegalDocumentCard } from "@/features/legal/components/legal-document-card";
import { formatLegalDocumentMeta } from "@/features/legal/legal-document-meta";

// 카드 아래 여백 — 설정 문서 상세와 같은 16. SafeAreaView가 bottom inset을
// 먹으므로 home indicator와 카드는 겹치지 않는다.
const CONTENT_PADDING_BOTTOM = 16;

// 온보딩 약관 "보기"의 목적지. 설정 > 약관 및 개인정보 상세(mypage/settings/
// legal/[type])와 같은 WebView 카드(LegalDocumentCard)를 쓰되 shell은 온보딩
// 것(SafeAreaView → OnboardingHeader → OnboardingContent)이다 — 온보딩은 (tabs)
// 바깥 flow라 설정 route를 재사용하지 않는다. 읽기 전용이라 동의 체크·CTA는
// 없고, 동의는 terms-agreement 목록에서만 한다.
//
// type은 PRIVACY / SERVICE / SENSITIVE만 받는다. EXTERNAL_AI는 설정에서만
// 다루므로 딥링크로 들어와도 문서를 열지 않고 "불러올 수 없음"만 보여준다.
// 문서 주소는 GET /terms의 contentUrl이 source of truth라 여기서 다시 조회하고
// navigation param으로 받지 않는다.
export default function TermsDocumentScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const documentType = isOnboardingTermType(type) ? type : null;

  const [terms, setTerms] = useState<Term[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!documentType) return;
    let cancelled = false;
    getTerms()
      .then((result) => {
        if (!cancelled) setTerms(result.terms);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [documentType, reloadKey]);

  function retry() {
    setLoadError(false);
    setReloadKey((key) => key + 1);
  }

  // 정상 흐름은 terms-agreement에서 push로 왔으니 back이면 그 화면의 체크 상태
  // 그대로 돌아간다. 딥링크 등으로 스택이 비어 있으면 목록으로 replace.
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/terms-agreement");
  }

  const term =
    terms && documentType
      ? (terms.find((item) => item.type === documentType) ?? null)
      : null;
  // undefined: 아직 GET /terms 응답 전(스피너). null: 잘못된 type, 서버에 그
  // 약관이 없음, contentUrl이 없거나 http(s)가 아님 — 전부 "불러올 수 없음".
  const contentUrl = term?.contentUrl;
  const uri = !documentType
    ? null
    : terms
      ? isValidHttpUrl(contentUrl)
        ? contentUrl
        : null
      : undefined;

  // 카드 제목은 온보딩 문구(만 14세 이상 확인 및 개인정보 수집·이용 동의 등)에
  // 서버 required로 [필수]/[선택]을 붙인다. 응답 전에는 접두어 없이 문서명만.
  const documentTitle = documentType
    ? getOnboardingDocumentTitle(documentType)
    : null;
  const cardTitle = term
    ? formatOnboardingTermLabel(getOnboardingTermTitle(term), term.required)
    : (documentTitle ?? "약관 상세");

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      <OnboardingHeader onBack={handleBack} title="회원가입" />

      {/* 카드 안 WebView가 본문을 스크롤하므로 바깥에 ScrollView를 두지 않고
          카드가 남은 높이를 채운다. */}
      <OnboardingContent style={styles.content}>
        <LegalDocumentCard
          fetchError={loadError}
          metaText={formatLegalDocumentMeta()}
          onRetryFetch={retry}
          title={cardTitle}
          uri={uri}
        />
      </OnboardingContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: signupColors.white,
    flex: 1,
  },
  // Figma 콘텐츠 top = status bar + TopNav 52 + 12 (terms-agreement와 같다).
  content: {
    flex: 1,
    paddingBottom: CONTENT_PADDING_BOTTOM,
    paddingTop: 12,
  },
});
