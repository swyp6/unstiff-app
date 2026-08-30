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
import type { Term } from "@/features/auth/types";
import { NotificationToggle } from "@/features/settings/components/notification-toggle";
import { SETTINGS_DIVIDER_COLOR } from "@/features/settings/components/settings-list";

type TermsRowProps = {
  term: Term;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function TermsRow({ term, value, onValueChange }: TermsRowProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={`${term.title} 보기`}
        accessibilityRole="button"
        onPress={() => WebBrowser.openBrowserAsync(term.contentUrl)}
        style={styles.rowTitle}
      >
        <ThemedText style={styles.rowText} typography="body-2-medium">
          {term.required ? "[필수] " : "[선택] "}
          {term.title}
        </ThemedText>
        <Ionicons
          color={semanticColors["label-disabled"]}
          name="chevron-forward"
          size={16}
        />
      </Pressable>
      <NotificationToggle
        accessibilityLabel={term.title}
        onValueChange={onValueChange}
        value={value}
      />
      <View style={styles.divider} />
    </View>
  );
}

export default function TermsAgreementScreen() {
  const [terms, setTerms] = useState<Term[] | null>(null);
  const [agreements, setAgreements] = useState<Record<number, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getTerms()
      .then((result) => {
        setTerms(result.terms);
        setAgreements(
          Object.fromEntries(
            result.terms.map((term) => [term.id, term.agreed]),
          ),
        );
      })
      .catch(() => {
        Alert.alert("오류", "약관 정보를 불러오지 못했습니다.");
      });
  }, []);

  const allAgreed = useMemo(
    () => terms !== null && terms.every((term) => agreements[term.id]),
    [terms, agreements],
  );

  const requiredAgreed = useMemo(
    () =>
      terms !== null &&
      terms
        .filter((term) => term.required)
        .every((term) => agreements[term.id]),
    [terms, agreements],
  );

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
      router.replace("/home");
    } catch {
      Alert.alert("오류", "약관 동의 처리 중 문제가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!terms) {
    return (
      <SafeAreaView style={[styles.screen, styles.loadingScreen]}>
        <ActivityIndicator color={semanticColors["label-normal"]} />
      </SafeAreaView>
    );
  }

  const canSubmit = requiredAgreed && !isSubmitting;

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      <View style={styles.content}>
        <View style={styles.intro}>
          <ThemedText typography="title-3-bold">
            서비스 이용을 위해{"\n"}약관에 동의해 주세요
          </ThemedText>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowTitle}>
              <ThemedText style={styles.allRowText} typography="body-1-bold">
                전체 동의
              </ThemedText>
            </View>
            <NotificationToggle
              accessibilityLabel="전체 동의"
              onValueChange={toggleAll}
              value={allAgreed}
            />
            <View style={styles.divider} />
          </View>

          {terms.map((term) => (
            <TermsRow
              key={term.id}
              onValueChange={(value) =>
                setAgreements((current) => ({ ...current, [term.id]: value }))
              }
              term={term}
              value={agreements[term.id] ?? false}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityLabel="동의하고 시작하기"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={[
            styles.continueButton,
            !canSubmit && styles.continueButtonDisabled,
          ]}
        >
          <ThemedText
            style={styles.continueButtonText}
            typography="body-1-medium"
          >
            동의하고 시작하기
          </ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: semanticColors["background-normal"],
    flex: 1,
  },
  loadingScreen: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  intro: {
    marginBottom: 32,
  },
  section: {
    gap: 8,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    height: 56,
    paddingHorizontal: 16,
    position: "relative",
    width: "100%",
  },
  rowTitle: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 4,
    minWidth: 0,
  },
  rowText: {
    color: semanticColors["label-normal"],
  },
  allRowText: {
    color: semanticColors["label-normal"],
  },
  divider: {
    backgroundColor: SETTINGS_DIVIDER_COLOR,
    bottom: 0,
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
  },
  footer: {
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  continueButton: {
    alignItems: "center",
    backgroundColor: semanticColors["primary-normal"],
    borderRadius: radius.default,
    height: 52,
    justifyContent: "center",
    width: "100%",
  },
  continueButtonDisabled: {
    opacity: 0.35,
  },
  continueButtonText: {
    color: semanticColors["primary-on"],
  },
});
