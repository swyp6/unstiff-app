import { useEffect, useState } from "react";
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
import {
  getMissionSetting,
  updateMissionSetting,
} from "@/features/missions/api";
import { TimeWheelPicker } from "@/features/missions/components/time-wheel-picker";
import {
  formatOfferTime,
  parseOfferTime,
  type OfferTimeParts,
} from "@/features/missions/offer-time";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import { goBackOrReplace } from "@/features/settings/navigation";

export default function MissionTimeScreen() {
  const [draft, setDraft] = useState<OfferTimeParts | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMissionSetting()
      .then(({ offerTime }) => {
        if (!cancelled) setDraft(parseOfferTime(offerTime));
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

  async function handleSubmit() {
    if (!draft || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateMissionSetting(formatOfferTime(draft));
      goBackOrReplace("/mypage/settings/notification");
    } catch {
      Alert.alert(
        "오류",
        "미션 수신 시간을 변경하지 못했습니다. 다시 시도해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      <SettingsHeader
        onBack={() => goBackOrReplace("/mypage/settings/notification")}
        title="미션 수신 시간 설정"
      />

      {loadError ? (
        <View style={styles.centerContent}>
          <ThemedText
            style={styles.errorText}
            themeColor="textSecondary"
            typography="body-2-medium"
          >
            미션 수신 시간을 불러오지 못했습니다.
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
      ) : !draft ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color={semanticColors["label-normal"]} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.intro}>
            <ThemedText typography="body-1-bold">
              미션을 받을 시간을 선택해 주세요
            </ThemedText>
            <ThemedText
              style={styles.description}
              typography="caption-1-regular"
            >
              설정한 시간은 오늘의 미션 발급 기준으로 사용됩니다.
            </ThemedText>
          </View>

          <TimeWheelPicker onChange={setDraft} value={draft} />

          <View style={styles.spacer} />

          <Pressable
            accessibilityLabel="선택 완료"
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting }}
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={semanticColors["primary-on"]} />
            ) : (
              <ThemedText
                style={styles.submitButtonText}
                typography="body-1-bold"
              >
                선택 완료
              </ThemedText>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: semanticColors["background-normal"],
    flex: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  centerContent: {
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
    backgroundColor: semanticColors["primary-normal"],
    borderRadius: radius.default,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: semanticColors["primary-on"],
  },
  intro: {
    gap: 8,
  },
  description: {
    color: semanticColors["label-subtle"],
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: semanticColors["primary-normal"],
    borderRadius: radius.default,
    height: 52,
    justifyContent: "center",
    marginTop: 24,
    width: "100%",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: semanticColors["primary-on"],
  },
});
