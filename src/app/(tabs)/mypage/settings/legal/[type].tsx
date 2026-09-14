import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { semanticColors } from "@/constants/tokens";
import { getTerms } from "@/features/auth/api";
import type { Term } from "@/features/auth/types";
import { LegalDocumentCard } from "@/features/settings/components/legal-document-card";
import {
  SETTINGS_CHROME_BACKGROUND,
  SettingsHeader,
} from "@/features/settings/components/settings-header";
import {
  findTerm,
  formatLegalDocumentMeta,
  isLegalDocumentType,
  LEGAL_DOCUMENT_COPY,
} from "@/features/settings/legal-terms";
import { goBackOrReplace } from "@/features/settings/navigation";

const CONTENT_PADDING_BOTTOM = 16;

// SERVICE / PRIVACY / EXTERNAL_AI 문서 상세(Figma 4953:59947 / 4953:59769 /
// 4953:59986)가 같은 shell을 쓴다. 문서 주소는 GET /terms의 contentUrl이
// source of truth라 여기서도 다시 조회하고, 앱에서 URL을 조합하지 않는다.
export default function LegalDocumentScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const documentType = isLegalDocumentType(type) ? type : null;
  // 이 화면은 탭바를 숨기므로(app-tabs.tsx) 홈 인디케이터 inset을 직접 더한다
  // — Figma처럼 카드 아래 16, 그 아래 흰 인디케이터 영역.
  const insets = useSafeAreaInsets();

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

  const copy = documentType ? LEGAL_DOCUMENT_COPY[documentType] : null;
  const term = terms && documentType ? findTerm(terms, documentType) : null;
  // 잘못된 type으로 들어오면(딥링크 등) crash 대신 "불러올 수 없음" 상태.
  const uri = !documentType
    ? null
    : terms
      ? (term?.contentUrl ?? null)
      : undefined;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <SettingsHeader
        onBack={() => goBackOrReplace("/mypage/settings/legal")}
        title={copy?.headerTitle ?? "약관 및 개인정보"}
        variant="settingsNav"
      />

      {/* 콘텐츠 top 12 / bottom 16 / 좌우 20 안에서 카드가 남은 높이를 채운다
          (Figma의 634는 812 기준 결과값). 카드 안 WebView가 본문을 스크롤하므로
          바깥에 ScrollView를 두지 않는다. */}
      <View
        style={[
          styles.content,
          { paddingBottom: CONTENT_PADDING_BOTTOM + insets.bottom },
        ]}
      >
        <LegalDocumentCard
          fetchError={loadError}
          metaText={formatLegalDocumentMeta()}
          onRetryFetch={retry}
          title={copy?.cardTitle ?? "약관 및 개인정보"}
          uri={uri}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: SETTINGS_CHROME_BACKGROUND,
    flex: 1,
  },
  content: {
    backgroundColor: semanticColors["background-normal"],
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
