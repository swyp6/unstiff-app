import { Image } from "expo-image";
import { type ReactNode, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  type StyleProp,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";

import { submitMissionFeedback } from "../api";
import type { MissionFeedbackRequest } from "../types";

const COMMENT_MAX_LENGTH = 100;

// overview("오늘 미션 어땠나요?") → reason("무엇이 아쉬웠나요?") → other(기타
// 의견) 순서의 화면 계층. visible이 true가 될 때는 항상 overview부터
// 시작한다.
type Screen = "overview" | "reason" | "other";

type MissionFeedbackModalProps = {
  visible: boolean;
  // pending 상태가 없을 때(visible=false)는 null일 수 있다 — DeletePlanModal과
  // 같은 프레임(dim/dialog 구조, `if (!visible) return null` 진입부)을 그대로
  // 따른다.
  missionId: number | null;
  // feedback POST 성공 시 호출 — 부모(home.tsx)가 pending을 지우고 성공
  // toast를 띄운다. 이 모달 자신은 toast를 그리지 않는다(모달이 닫혀도
  // toast의 등장→소멸 애니메이션은 별개로 계속 재생돼야 하므로).
  onComplete: () => void;
  // "건너뛰기" — feedback POST를 보내지 않고 pending만 정리한다.
  onSkip: () => void;
};

// Figma 4513:47336(만족도 선택)/4501:31886(아쉬운 이유)/4501:32002·32118·
// 32465(기타 의견 빈 폼·입력·100자 초과) — 홈 화면 위에 뜨는 dim + 중앙
// 모달(300 고정, padding 26/20/18, 문구와 액션 사이 20). 만족도 선택만
// radius 20이고 나머지 화면은 24다.
export function MissionFeedbackModal({
  visible,
  missionId,
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

  function selectOtherOpinion() {
    if (isSubmitting) return;
    setScreen("other");
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
  // 입력을 100자에서 자르지 않는다 — 넘치면 Figma 4501:32465처럼 빨간
  // 입력창/카운터/안내 문구를 보여주고 보내기만 막는다.
  const isCommentTooLong = comment.length > COMMENT_MAX_LENGTH;
  const canSend =
    trimmedComment.length > 0 && !isCommentTooLong && !isSubmitting;

  const errorMessage = error && (
    <ThemedText style={styles.error} typography="caption-1-regular">
      {error}
    </ThemedText>
  );

  return (
    <Modal
      animationType="fade"
      // Android: 둘 다 켜야 dim이 status bar·navigation bar 뒤까지 이어진다
      // (Figma는 화면 전체를 덮는다). ConfirmModal·WorkoutLimitModal과 같은 설정.
      navigationBarTranslucent
      onRequestClose={handleRequestClose}
      statusBarTranslucent
      transparent
      visible
    >
      <KeyboardAvoidingView
        // edge-to-edge에서 adjustResize가 안 먹어 Android도 키보드가 하단
        // 요소를 덮는다. behavior="height"는 Android에서 키보드가 닫혀 있어도
        // 컨테이너 높이를 실측보다 작게 잡는 부작용이 있어 padding으로 통일한다.
        behavior="padding"
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
            <FeedbackDialog
              description="다음 미션을 더 잘 고를게요"
              descriptionTypography="body-3-regular"
              radius={20}
              title="오늘 미션 어땠나요?"
            >
              <View style={styles.overviewRow}>
                <FeedbackButton
                  disabled={isSubmitting}
                  label="아쉬웠어요"
                  onPress={selectDissatisfied}
                  style={styles.overviewButtonPressable}
                  variant="outline"
                />
                <FeedbackButton
                  disabled={isSubmitting}
                  label="좋았어요"
                  onPress={() => submitFeedback({ reason: "GOOD" })}
                  style={styles.overviewButtonPressable}
                  variant="primary"
                />
              </View>

              {errorMessage}

              <FeedbackLink
                color={primitiveColors.charcoal["5"]}
                disabled={isSubmitting}
                label="건너뛰기"
                onPress={handleSkip}
                style={styles.overviewLinkPressable}
              />
            </FeedbackDialog>
          ) : screen === "reason" ? (
            <FeedbackDialog
              description="더 잘 맞는 미션을 고를게요"
              radius={24}
              title="무엇이 아쉬웠나요?"
            >
              <FeedbackButton
                disabled={isSubmitting}
                label="너무 힘들었어요"
                onPress={() => submitFeedback({ reason: "TOO_HARD" })}
                variant="option"
              />
              <FeedbackButton
                disabled={isSubmitting}
                label="하고 싶은 운동이 아니에요"
                onPress={() => submitFeedback({ reason: "NOT_INTERESTED" })}
                variant="option"
              />
              <FeedbackButton
                disabled={isSubmitting}
                label="그 외 의견 쓰기"
                onPress={selectOtherOpinion}
                variant="option"
              />

              {errorMessage}

              <FeedbackLink
                color={primitiveColors.charcoal["3"]}
                disabled={isSubmitting}
                label="건너뛰기"
                onPress={handleSkip}
              />
            </FeedbackDialog>
          ) : (
            <FeedbackDialog
              description="짧게 남겨주셔도 좋아요"
              radius={24}
              title="어떤 점이 아쉬웠나요?"
            >
              <View style={styles.inputGroup}>
                <View
                  style={[
                    styles.inputBox,
                    isCommentTooLong && styles.inputBoxError,
                  ]}
                >
                  <TextInput
                    accessibilityLabel="기타 의견"
                    multiline
                    onChangeText={setComment}
                    placeholder="의견을 적어주세요"
                    placeholderTextColor={primitiveColors.charcoal["3"]}
                    style={styles.input}
                    value={comment}
                  />
                  <ThemedText
                    style={[
                      styles.counter,
                      comment.length > 0 && styles.counterFilled,
                      isCommentTooLong && styles.counterError,
                    ]}
                    typography="caption-2-regular"
                  >
                    {comment.length} / {COMMENT_MAX_LENGTH}
                  </ThemedText>
                </View>

                {isCommentTooLong && (
                  <View style={styles.inputErrorRow}>
                    <Image
                      contentFit="contain"
                      source={require("@/assets/signup/icon-status-error.svg")}
                      style={styles.inputErrorIcon}
                    />
                    <ThemedText
                      style={styles.inputErrorText}
                      typography="caption-1-regular"
                    >
                      {COMMENT_MAX_LENGTH}자까지 쓸 수 있어요
                    </ThemedText>
                  </View>
                )}
              </View>

              <FeedbackButton
                disabled={!canSend}
                label="보내기"
                onPress={() =>
                  submitFeedback({ reason: "OTHER", comment: trimmedComment })
                }
                variant={canSend ? "primary" : "disabled"}
              />

              {errorMessage}

              <FeedbackLink
                color={primitiveColors.charcoal["3"]}
                disabled={isSubmitting}
                label="취소하기"
                onPress={handleBackToReason}
              />
            </FeedbackDialog>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// 세 화면이 공유하는 카드 — 제목(title/3 bold)과 설명, 그 아래 액션 목록.
// 설명 크기는 만족도 선택만 13/18이고 나머지는 12/16이다.
function FeedbackDialog({
  title,
  description,
  descriptionTypography = "caption-1-regular",
  radius,
  children,
}: {
  title: string;
  description: string;
  descriptionTypography?: "body-3-regular" | "caption-1-regular";
  radius: number;
  children: ReactNode;
}) {
  return (
    <View style={[styles.dialog, { borderRadius: radius }]}>
      <View style={styles.copy}>
        <ThemedText style={styles.title} typography="title-3-bold">
          {title}
        </ThemedText>
        <ThemedText
          style={styles.description}
          typography={descriptionTypography}
        >
          {description}
        </ThemedText>
      </View>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

// primary: 좋았어요·보내기(활성) / outline: 아쉬웠어요 / option: 아쉬운 이유
// 선택지 / disabled: 보내기(비활성). 모두 높이 50 pill, body/2 bold.
type FeedbackButtonVariant = "primary" | "outline" | "option" | "disabled";

// Pressable 자체에 배경/radius를 주면 fade Modal 안에서 버튼 배경이 그려지지
// 않는 경우가 있어(WorkoutLimitModal 참고), Pressable은 터치 영역만 갖고
// 시각 스타일은 pointerEvents="none" View가 갖는다.
function FeedbackButton({
  label,
  variant,
  disabled,
  onPress,
  style,
}: {
  label: string;
  variant: FeedbackButtonVariant;
  disabled: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.buttonPressable, style]}
    >
      {({ pressed }) => (
        <View
          pointerEvents="none"
          style={[
            styles.button,
            buttonStyles[variant],
            pressed && !disabled && styles.pressed,
          ]}
        >
          <ThemedText
            style={buttonTextStyles[variant]}
            typography="body-2-bold"
          >
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

// 카드 맨 아래 보조 링크(건너뛰기·취소하기) — caption/1 bold, 위 padding 4.
function FeedbackLink({
  label,
  color,
  disabled,
  onPress,
  style,
}: {
  label: string;
  color: string;
  disabled: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.linkPressable, style]}
    >
      {({ pressed }) => (
        <View
          pointerEvents="none"
          style={pressed && !disabled && styles.pressed}
        >
          <ThemedText style={{ color }} typography="caption-1-bold">
            {label}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: primitiveColors.orange["500"],
  },
  outline: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: primitiveColors.charcoal["3"],
    borderWidth: 1,
  },
  option: {
    borderColor: primitiveColors.charcoal["2"],
    borderWidth: 1,
  },
  disabled: {
    backgroundColor: primitiveColors.charcoal["1"],
  },
});

const buttonTextStyles = StyleSheet.create({
  primary: {
    color: semanticColors["label-inverse"],
  },
  outline: {
    color: primitiveColors.charcoal["11"],
  },
  option: {
    color: primitiveColors.charcoal["11"],
  },
  disabled: {
    color: primitiveColors.charcoal["3"],
  },
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  // surface/dim — tokens.ts(auto-generated)에 없는 Figma 변수라
  // ConfirmModal·WorkoutLimitModal과 같이 직접 쓴다.
  dim: {
    alignItems: "center",
    backgroundColor: "rgba(23, 23, 25, 0.45)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialog: {
    backgroundColor: semanticColors["background-normal"],
    gap: 20,
    maxWidth: 300,
    overflow: "hidden",
    paddingBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 26,
    width: "100%",
    zIndex: 1,
  },
  copy: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: primitiveColors.charcoal["11"],
    textAlign: "center",
  },
  description: {
    color: primitiveColors.charcoal["5"],
    textAlign: "center",
  },
  actions: {
    gap: 10,
    width: "100%",
  },
  buttonPressable: {
    height: 50,
    width: "100%",
  },
  // Figma는 50 높이에 radius 42(좋았어요/아쉬웠어요)·25(나머지)지만 둘 다
  // 높이의 절반을 넘어 같은 pill로 그려진다.
  button: {
    alignItems: "center",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    overflow: "hidden",
  },
  // 만족도 선택만 "아쉬웠어요"/"좋았어요"가 한 줄에 나란히 선다(각 125,
  // gap 10 — 300 카드에서 flex:1이 정확히 125가 된다).
  overviewRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  // flex:1은 flexBasis 0이라 buttonPressable의 width:"100%"보다 우선한다.
  overviewButtonPressable: {
    flex: 1,
  },
  linkPressable: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    width: "100%",
  },
  // 만족도 선택의 "건너뛰기" 영역만 높이 30으로 고정돼 있다.
  overviewLinkPressable: {
    height: 30,
  },
  error: {
    color: "#ff6b6b",
    textAlign: "center",
  },
  inputGroup: {
    gap: 6,
  },
  // 입력창 안쪽 여백(stroke 안쪽 기준) — 문구 좌상단 12.5, 카운터 우/하
  // 12.5·11.5.
  inputBox: {
    backgroundColor: "#fafafa",
    borderColor: primitiveColors.orange["500"],
    borderRadius: 16,
    borderWidth: 1.5,
    height: 96,
    paddingBottom: 11.5,
    paddingHorizontal: 12.5,
    paddingTop: 12.5,
  },
  // 100자 초과(4501:32465) — 높이 132, stroke 1.4 neg/normal, 안쪽 여백
  // 좌우 14.6·상하 12.6(문구 폭 228).
  inputBoxError: {
    borderColor: semanticColors["status-negative-normal"],
    borderWidth: 1.4,
    height: 132,
    paddingBottom: 12.6,
    paddingHorizontal: 14.6,
    paddingTop: 12.6,
  },
  input: {
    color: primitiveColors.charcoal["11"],
    flex: 1,
    fontFamily: "Pretendard-Regular",
    fontSize: 13,
    lineHeight: 18,
    padding: 0,
    textAlignVertical: "top",
  },
  counter: {
    alignSelf: "flex-end",
    color: primitiveColors.charcoal["3"],
  },
  counterFilled: {
    color: primitiveColors.charcoal["5"],
  },
  counterError: {
    color: semanticColors["status-negative-normal"],
  },
  inputErrorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  inputErrorIcon: {
    height: 14,
    width: 14,
  },
  inputErrorText: {
    color: semanticColors["status-negative-normal"],
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
