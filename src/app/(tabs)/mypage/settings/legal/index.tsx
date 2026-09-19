import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";
import {
  agreeToTerms,
  getTerms,
  withdrawTermsAgreement,
} from "@/features/auth/api";
import type { Term } from "@/features/auth/types";
import { LegalConsentRow } from "@/features/settings/components/legal-consent-row";
import {
  SETTINGS_CHROME_BACKGROUND,
  SettingsHeader,
} from "@/features/settings/components/settings-header";
import {
  SettingsRow,
  SettingsSectionLabel,
} from "@/features/settings/components/settings-list";
import {
  EXTERNAL_AI_CONSENT_DESCRIPTION,
  EXTERNAL_AI_CONSENT_TITLE,
  findTerm,
  formatAgreementDescription,
  LEGAL_AGREEMENT_HISTORY_ROWS,
  LEGAL_BROWSE_ROWS,
  type LegalDocumentType,
} from "@/features/settings/legal-terms";
import { goBackOrReplace } from "@/features/settings/navigation";

const CONTENT_PADDING_BOTTOM = 24;

function documentHref(type: LegalDocumentType) {
  return `/mypage/settings/legal/${type}` as const;
}

export default function LegalScreen() {
  const [terms, setTerms] = useState<Term[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isUpdatingAi, setIsUpdatingAi] = useState(false);
  // 탭바를 숨기는 화면(app-tabs.tsx)이라 홈 인디케이터 inset을 직접 더한다.
  const insets = useSafeAreaInsets();

  useEffect(() => {
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
  }, [reloadKey]);

  function retry() {
    setLoadError(false);
    setReloadKey((key) => key + 1);
  }

  function setExternalAiAgreed(agreed: boolean) {
    setTerms((prev) =>
      prev
        ? prev.map((term) =>
            term.type === "EXTERNAL_AI" ? { ...term, agreed } : term,
          )
        : prev,
    );
  }

  // 선택 약관(EXTERNAL_AI) 동의/철회. 알림 설정 toggle과 같은 optimistic +
  // rollback 구조이고, 성공하면 GET /terms를 다시 받아 agreedAt 같은 서버 값을
  // 실제 값으로 채운다(기기 시간을 동의일처럼 쓰지 않는다).
  async function handleExternalAiToggle(nextAgreed: boolean) {
    if (!terms || isUpdatingAi) return;
    const externalAiTerm = findTerm(terms, "EXTERNAL_AI");
    if (!externalAiTerm || externalAiTerm.agreed === nextAgreed) return;

    setIsUpdatingAi(true);
    setExternalAiAgreed(nextAgreed);
    try {
      if (nextAgreed) {
        await agreeToTerms([externalAiTerm.id]);
      } else {
        await withdrawTermsAgreement("EXTERNAL_AI");
      }
      // 변경 자체는 끝났으니 재조회 실패는 optimistic 상태를 그대로 두고 넘긴다.
      try {
        const refreshed = await getTerms();
        setTerms(refreshed.terms);
      } catch {
        // noop — 다음 진입 때 서버 값으로 맞춰진다.
      }
    } catch {
      setExternalAiAgreed(!nextAgreed);
      Alert.alert(
        "오류",
        "동의 상태를 변경하지 못했습니다. 다시 시도해주세요.",
      );
    } finally {
      setIsUpdatingAi(false);
    }
  }

  const externalAiTerm = terms ? findTerm(terms, "EXTERNAL_AI") : null;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <SettingsHeader
        onBack={() => goBackOrReplace("/mypage/settings")}
        title="약관 및 개인정보"
        variant="settingsNav"
      />

      {loadError ? (
        <View style={styles.centerContent}>
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
      ) : !terms ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color={semanticColors["label-normal"]} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: CONTENT_PADDING_BOTTOM + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {/* Figma 4953:59928 / 4953:59750 — 상시 조회 2종(서비스 이용약관·
              개인정보 처리방침)만 상세로 들어간다. */}
          <View style={styles.section}>
            <SettingsSectionLabel
              label="약관 및 개인정보"
              variant="subheading"
            />
            {LEGAL_BROWSE_ROWS.map((row) => (
              <SettingsRow
                key={row.type}
                onPress={() => router.push(documentHref(row.type))}
                title={row.title}
              />
            ))}
          </View>

          {/* 동의 내역 — 표시 전용(누를 수 없음). 동의일은 GET /terms의
              agreedAt에서만 만든다. */}
          <View style={[styles.section, styles.historySection]}>
            <SettingsSectionLabel label="동의 내역" variant="subheading" />
            {LEGAL_AGREEMENT_HISTORY_ROWS.map((row) => (
              <SettingsRow
                key={row.type}
                description={formatAgreementDescription(
                  findTerm(terms, row.type),
                )}
                dividerColor={semanticColors["line-subtle"]}
                title={row.title}
                trailing="none"
              />
            ))}
          </View>

          {/* 선택 약관 동의/철회 — 서버 EXTERNAL_AI 약관의 agreed가 toggle의
              source of truth. 서버 응답에 EXTERNAL_AI가 없으면 섹션을 그리지
              않는다(없는 약관에 동의 데이터를 만들지 않기 위해). */}
          {externalAiTerm && (
            <View style={[styles.section, styles.consentSection]}>
              <SettingsSectionLabel
                label="선택 약관 동의/철회"
                variant="subheading"
              />
              <LegalConsentRow
                agreed={externalAiTerm.agreed}
                description={EXTERNAL_AI_CONSENT_DESCRIPTION}
                disabled={isUpdatingAi}
                onToggle={handleExternalAiToggle}
                title={EXTERNAL_AI_CONSENT_TITLE}
              />
              <SettingsRow
                compact
                onPress={() => router.push(documentHref("EXTERNAL_AI"))}
                title="동의서 보기"
              />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: SETTINGS_CHROME_BACKGROUND,
    flex: 1,
  },
  scroll: {
    backgroundColor: semanticColors["background-normal"],
  },
  // Figma: 콘텐츠 top 12 / 좌우 20, 섹션 heading→row 4, 섹션 사이 22·30.
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  centerContent: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
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
    backgroundColor: semanticColors["primary-normal"],
    borderRadius: radius.default,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: semanticColors["primary-on"],
  },
  section: {
    gap: 4,
  },
  historySection: {
    marginTop: 22,
  },
  // Figma 4953:59750(Off)은 heading→행·행→행 8. On node(4953:59928)는 0으로
  // 그려져 있지만 toggle에 따라 간격이 바뀌면 안 되므로 8로 통일한다.
  consentSection: {
    gap: 8,
    marginTop: 30,
  },
});
