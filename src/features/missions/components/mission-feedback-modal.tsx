import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

import { submitMissionFeedback } from "../api";
import type { MissionFeedbackRequest } from "../types";

const COMMENT_MAX_LENGTH = 100;

// overview("오늘 미션 어땠어요?") → reason("무엇이 아쉬웠나요?") → other(기타
// 의견) 순서의 화면 계층. visible이 true가 될 때는 항상 overview부터
// 시작한다.
type Screen = "overview" | "reason" | "other";

type MissionFeedbackModalProps = {
  visible: boolean;
  // pending 상태가 없을 때(visible=false)는 null일 수 있다 — DeletePlanModal/
  // RecordMethodModal과 같은 프레임(dim/dialog 구조, `if (!visible) return
  // null` 진입부)을 그대로 따른다.
  missionId: number | null;
  // overview 화면 subtitle에 표시할 실제 미션 제목. home.tsx의 mission 관련
  // local state(missionId/missionTitle 등)는 NativeTabs가 탭 화면을 항상
  // 마운트해두는 구조 덕분에 RecordEditor → RecordComplete → 홈으로
  // 돌아오는 동안에도 그대로 남아 있다 — 그래서 feedback store에 title까지
  // 복제하지 않고 이 prop 하나로 단순하게 전달한다.
  missionTitle: string;
  // feedback POST 성공 시 호출 — 부모(home.tsx)가 pending을 지우고 성공
  // toast를 띄운다. 이 모달 자신은 toast를 그리지 않는다(모달이 닫혀도
  // toast의 등장→소멸 애니메이션은 별개로 계속 재생돼야 하므로).
  onComplete: () => void;
  // "건너뛰기" — feedback POST를 보내지 않고 pending만 정리한다.
  onSkip: () => void;
};

// Figma 2414:21129(오늘 미션 어땠어요?)/2414:21157(피드백 사유 선택)/
// 2414:21372(기타 의견 입력) — 홈 화면 위에 뜨는 dim + 중앙 모달.
// RecordMethodModal(features/upload/components/record-method-modal.tsx)과
// 같은 dialog 프레임을 따른다.
export function MissionFeedbackModal({
  visible,
  missionId,
  missionTitle,
  onComplete,
  onSkip,
}: MissionFeedbackModalProps) {
  const [screen, setScreen] = useState<Screen>("overview");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!visible || missionId == null) return null;

  function resetLocalState() {
    setScreen("overview");
    setComment("");
    setError(null);
  }

  async function submitFeedback(request: MissionFeedbackRequest) {
    if (isSubmitting || missionId == null) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitMissionFeedback(missionId, request);
      resetLocalState();
      onComplete();
    } catch {
      setError("피드백을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // 제출 중에는 건너뛰기/취소/뒤로가기도 막는다 — 응답이 도착했을 때 이미
  // 다른 pending으로 넘어간 상태에서 onComplete가 뒤늦게 불리는 경쟁을 막기
  // 위함이다.
  function handleSkip() {
    if (isSubmitting) return;
    resetLocalState();
    onSkip();
  }

  function selectDissatisfied() {
    if (isSubmitting) return;
    setScreen("reason");
    setError(null);
  }

  function handleBackToOverview() {
    if (isSubmitting) return;
    setScreen("overview");
    setError(null);
  }

  function handleBackToReason() {
    if (isSubmitting) return;
    setScreen("reason");
    setComment("");
    setError(null);
  }

  // Android hardware back / Modal onRequestClose / dim 바깥 탭이 전부 같은
  // 의미를 가진다 — 화면 계층(overview → reason → other)을 한 단계씩
  // 되돌리고, 최상위(overview)에서는 건너뛰기와 동일하게 전체 flow를
  // 끝낸다. reason의 "건너뛰기" 링크만은 예외로, 이 계층을 타지 않고 항상
  // 바로 skip한다(아래 렌더 부분 참고).
  function handleRequestClose() {
    if (screen === "other") {
      handleBackToReason();
    } else if (screen === "reason") {
      handleBackToOverview();
    } else {
      handleSkip();
    }
  }

  const trimmedComment = comment.trim();
  const canSend = trimmedComment.length > 0 && !isSubmitting;

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleRequestClose}
      transparent
      visible
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <SafeAreaView style={styles.dim}>
          <Pressable
            accessibilityLabel="닫기"
            accessibilityRole="button"
            onPress={handleRequestClose}
            style={styles.backdrop}
          />

          {screen === "overview" ? (
            <View style={styles.dialog}>
              <View style={styles.copy}>
                <ThemedText style={styles.center} typography="title-3-bold">
                  오늘 미션 어땠어요?
                </ThemedText>
                <ThemedText
                  style={[styles.center, styles.description]}
                  typography="caption-1-regular"
                >
                  {missionTitle}
                </ThemedText>
              </View>

              <View style={styles.actions}>
                <View style={styles.overviewRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={() => submitFeedback({ reason: "GOOD" })}
                    style={styles.overviewButtonPressable}
                  >
                    {({ pressed }) => (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.primaryButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <ThemedText
                          style={styles.primaryText}
                          typography="body-2-bold"
                        >
                          좋았어요
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={selectDissatisfied}
                    style={styles.overviewButtonPressable}
                  >
                    {({ pressed }) => (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.outlineButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <ThemedText typography="body-2-bold">
                          아쉬웠어요
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                </View>

                {error && (
                  <ThemedText
                    style={styles.error}
                    typography="caption-1-regular"
                  >
                    {error}
                  </ThemedText>
                )}

                <Pressable
                  accessibilityRole="button"
                  onPress={handleSkip}
                  style={styles.linkPressable}
                >
                  {({ pressed }) => (
                    <View
                      pointerEvents="none"
                      style={pressed && styles.pressed}
                    >
                      <ThemedText
                        style={styles.linkText}
                        typography="caption-1-bold"
                      >
                        건너뛰기
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          ) : screen === "reason" ? (
            <View style={styles.dialog}>
              <View style={styles.copy}>
                <ThemedText style={styles.center} typography="title-3-bold">
                  무엇이 아쉬웠나요?
                </ThemedText>
                <ThemedText
                  style={[styles.center, styles.description]}
                  typography="caption-1-regular"
                >
                  더 잘 맞는 미션을 고를게요
                </ThemedText>
              </View>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => submitFeedback({ reason: "TOO_HARD" })}
                  style={styles.buttonPressable}
                >
                  {({ pressed }) => (
                    <View
                      pointerEvents="none"
                      style={[styles.fillButton, pressed && styles.pressed]}
                    >
                      <ThemedText typography="body-2-bold">
                        너무 힘들었어요
                      </ThemedText>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => submitFeedback({ reason: "NOT_INTERESTED" })}
                  style={styles.buttonPressable}
                >
                  {({ pressed }) => (
                    <View
                      pointerEvents="none"
                      style={[styles.fillButton, pressed && styles.pressed]}
                    >
                      <ThemedText typography="body-2-bold">
                        하고 싶은 운동이 아니에요
                      </ThemedText>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => setScreen("other")}
                  style={styles.buttonPressable}
                >
                  {({ pressed }) => (
                    <View
                      pointerEvents="none"
                      style={[styles.outlineButton, pressed && styles.pressed]}
                    >
                      <ThemedText typography="body-2-bold">
                        그 외 의견 쓰기
                      </ThemedText>
                    </View>
                  )}
                </Pressable>

                {error && (
                  <ThemedText
                    style={styles.error}
                    typography="caption-1-regular"
                  >
                    {error}
                  </ThemedText>
                )}

                <Pressable
                  accessibilityRole="button"
                  onPress={handleSkip}
                  style={styles.linkPressable}
                >
                  {({ pressed }) => (
                    <View
                      pointerEvents="none"
                      style={pressed && styles.pressed}
                    >
                      <ThemedText
                        style={styles.linkText}
                        typography="caption-1-bold"
                      >
                        건너뛰기
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.dialog}>
              <View style={styles.copy}>
                <ThemedText style={styles.center} typography="title-3-bold">
                  어떤 점이 아쉬웠나요?
                </ThemedText>
                <ThemedText
                  style={[styles.center, styles.description]}
                  typography="caption-1-regular"
                >
                  짧게 남겨주셔도 좋아요
                </ThemedText>
              </View>

              <View style={styles.actions}>
                <View style={styles.inputBox}>
                  <TextInput
                    accessibilityLabel="기타 의견"
                    maxLength={COMMENT_MAX_LENGTH}
                    multiline
                    onChangeText={setComment}
                    placeholder="의견을 적어주세요"
                    placeholderTextColor={semanticColors["label-disabled"]}
                    style={styles.input}
                    value={comment}
                  />
                  <ThemedText
                    style={styles.counter}
                    typography="caption-2-regular"
                  >
                    {comment.length} / {COMMENT_MAX_LENGTH}
                  </ThemedText>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSend }}
                  disabled={!canSend}
                  onPress={() =>
                    submitFeedback({ reason: "OTHER", comment: trimmedComment })
                  }
                  style={styles.buttonPressable}
                >
                  {({ pressed }) => (
                    <View
                      pointerEvents="none"
                      style={[
                        canSend ? styles.primaryButton : styles.fillButton,
                        pressed && canSend && styles.pressed,
                      ]}
                    >
                      <ThemedText
                        typography="body-2-bold"
                        style={
                          canSend ? styles.primaryText : styles.disabledText
                        }
                      >
                        보내기
                      </ThemedText>
                    </View>
                  )}
                </Pressable>

                {error && (
                  <ThemedText
                    style={styles.error}
                    typography="caption-1-regular"
                  >
                    {error}
                  </ThemedText>
                )}

                <Pressable
                  accessibilityRole="button"
                  onPress={handleBackToReason}
                  style={styles.linkPressable}
                >
                  {({ pressed }) => (
                    <View
                      pointerEvents="none"
                      style={pressed && styles.pressed}
                    >
                      <ThemedText
                        style={styles.linkText}
                        typography="caption-1-bold"
                      >
                        취소하기
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  dim: {
    alignItems: "center",
    backgroundColor: "rgba(13, 15, 20, 0.45)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialog: {
    backgroundColor: semanticColors["background-normal"],
    borderRadius: 20,
    maxWidth: 300,
    paddingBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 26,
    width: "100%",
    zIndex: 1,
  },
  copy: {
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  center: {
    textAlign: "center",
  },
  description: {
    color: semanticColors["label-subtle"],
  },
  actions: {
    gap: 10,
    width: "100%",
  },
  buttonPressable: {
    height: 50,
    width: "100%",
  },
  // overview 화면만 "좋았어요"/"아쉬웠어요"가 한 줄에 나란히 선다(Figma
  // 2414:21129 "선택" — gap 8, 각각 flex:1). 나머지 화면은 버튼이 세로로
  // 쌓이므로 기존 buttonPressable(width:"100%")을 그대로 쓴다.
  overviewRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  overviewButtonPressable: {
    flex: 1,
    height: 50,
  },
  fillButton: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
  },
  outlineButton: {
    alignItems: "center",
    borderColor: semanticColors["line-normal"],
    borderRadius: 12,
    borderWidth: 1,
    height: 50,
    justifyContent: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: semanticColors["label-normal"],
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
  },
  primaryText: {
    color: semanticColors["label-inverse"],
  },
  disabledText: {
    color: semanticColors["label-disabled"],
  },
  linkPressable: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    width: "100%",
  },
  linkText: {
    color: semanticColors["label-disabled"],
  },
  error: {
    color: "#ff6b6b",
    textAlign: "center",
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
  pressed: {
    opacity: 0.7,
  },
});
