import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ActionButton } from "@/components/ui/action-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { semanticColors } from "@/constants/tokens";

import { reportAiContent } from "../api";
import type { AiContentReportRefType, AiContentReportReason } from "../types";

const REASON_TEXT_MAX_LENGTH = 100;

// Notion "[Android] AI 생성 콘텐츠 신고 기능" 스펙 2-1의 사유 문구 그대로.
const REASON_OPTIONS: { value: AiContentReportReason; label: string }[] = [
  { value: "HARMFUL_CONTENT", label: "유해하거나 부적절한 내용" },
  { value: "DANGEROUS_EXERCISE_INFO", label: "잘못되거나 위험한 운동 정보" },
  { value: "PERSONAL_INFO", label: "개인정보가 포함된 내용" },
  { value: "OTHER", label: "기타" },
];

// Google Play AI 생성 콘텐츠 정책의 인앱 신고 요건 대응. 오늘의 미션/AI 캐릭터
// 답변의 `⋮` → "AI 콘텐츠 신고" 메뉴에서 뜬다. POST /api/v1/complaints/ai-content.
// 접수 성공/실패와 무관하게 시트는 바로 닫히고(스펙 6-1), 완료 토스트는
// onReported를 받은 화면(chat.tsx/home.tsx)이 띄운다.
export function AiContentReportSheet({
  visible,
  refType,
  refId,
  onClose,
  onReported,
}: {
  visible: boolean;
  refType: AiContentReportRefType;
  refId: number;
  onClose: () => void;
  onReported: () => void;
}) {
  const [reason, setReason] = useState<AiContentReportReason | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetAndClose() {
    if (isSubmitting) return;
    onClose();
    setReason(null);
    setReasonText("");
    setError(null);
  }

  const trimmedReasonText = reasonText.trim();
  const canSubmit =
    !isSubmitting &&
    !!reason &&
    (reason !== "OTHER" || trimmedReasonText.length > 0);

  async function handleSubmit() {
    if (!canSubmit || !reason) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await reportAiContent({
        refType,
        refId,
        detail: {
          reason,
          reasonText: reason === "OTHER" ? trimmedReasonText : null,
        },
      });
      setIsSubmitting(false);
      resetAndClose();
      onReported();
    } catch {
      setIsSubmitting(false);
      setError("신고를 접수하지 못했어요. 다시 시도해 주세요.");
    }
  }

  return (
    <BottomSheet
      onClose={resetAndClose}
      title="이 답변을 신고할게요"
      visible={visible}
    >
      <View style={styles.body}>
        <View style={styles.options}>
          {REASON_OPTIONS.map((option) => {
            const isSelected = option.value === reason;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                disabled={isSubmitting}
                key={option.value}
                onPress={() => setReason(option.value)}
                style={styles.optionPressable}
              >
                {({ pressed }) => (
                  <View
                    pointerEvents="none"
                    style={[styles.option, pressed && styles.pressed]}
                  >
                    <ThemedText typography="body-1-medium">
                      {option.label}
                    </ThemedText>
                    <View
                      style={[styles.radio, isSelected && styles.selectedRadio]}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {reason === "OTHER" && (
          <View style={styles.inputBox}>
            <TextInput
              accessibilityLabel="신고 사유"
              maxLength={REASON_TEXT_MAX_LENGTH}
              multiline
              onChangeText={setReasonText}
              placeholder="어떤 점이 문제였는지 알려주세요"
              placeholderTextColor={semanticColors["label-disabled"]}
              style={styles.input}
              value={reasonText}
            />
            <ThemedText style={styles.counter} typography="caption-2-regular">
              {reasonText.length} / {REASON_TEXT_MAX_LENGTH}
            </ThemedText>
          </View>
        )}

        {error && (
          <ThemedText style={styles.error} typography="caption-1-regular">
            {error}
          </ThemedText>
        )}

        <ActionButton
          disabled={!canSubmit}
          label="신고하기"
          onPress={handleSubmit}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting }}
          disabled={isSubmitting}
          onPress={resetAndClose}
          style={styles.cancelPressable}
        >
          {({ pressed }) => (
            <View
              pointerEvents="none"
              style={pressed && !isSubmitting && styles.pressed}
            >
              <ThemedText style={styles.cancelText} typography="body-2-bold">
                취소
              </ThemedText>
            </View>
          )}
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 16,
  },
  options: {
    gap: 10,
  },
  optionPressable: {
    width: "100%",
  },
  option: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-subtle"],
    borderRadius: 12,
    flexDirection: "row",
    height: 52,
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  radio: {
    borderColor: semanticColors["line-strong"],
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    width: 18,
  },
  selectedRadio: {
    backgroundColor: semanticColors["label-normal"],
    borderColor: semanticColors["label-normal"],
  },
  pressed: {
    opacity: 0.7,
  },
  inputBox: {
    backgroundColor: semanticColors["fill-normal"],
    borderColor: semanticColors["line-normal"],
    borderRadius: 12,
    borderWidth: 1,
    height: 96,
    paddingHorizontal: 13,
    paddingVertical: 13,
  },
  input: {
    color: semanticColors["label-normal"],
    flex: 1,
    fontFamily: "Pretendard-Regular",
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: "top",
  },
  counter: {
    alignSelf: "flex-end",
    color: semanticColors["label-disabled"],
  },
  error: {
    color: "#ff6b6b",
  },
  cancelPressable: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    width: "100%",
  },
  cancelText: {
    color: semanticColors["label-disabled"],
  },
});
