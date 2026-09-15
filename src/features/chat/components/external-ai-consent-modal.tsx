import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";

// Figma "Modal / AI 개인정보 처리 동의" (4939:26757) — 최초 채팅 진입 시
// 외부 AI 개인정보 처리 동의 팝업. 화면 4923:57384(체크 전 / 버튼 비활성)와
// 4923:57425(체크 완료)는 같은 컴포넌트의 variant라 체크박스·CTA 상태만
// 다르다. 375 캔버스에서 모달은 x20 w335 y141 h530 = 좌우 20 inset, 세로
// 가운데(위아래 141)이므로 폭은 화면 기준으로 늘어나고 세로는 중앙 정렬.
// 간격은 px 값으로 쓴다(NativeWind rem=14).
//
// 아래 색은 Figma 변수는 있지만 프로젝트 tokens.ts(auto-generated)에 없어
// 여기서만 쓴다: charcoal-950(dim), charcoal-50(처리 정보 박스),
// charcoal-300(거부하기 문구).
const DIM_COLOR = "#131315"; // charcoal-950
const DIM_OPACITY = 0.55;
const INFO_BOX_BACKGROUND = "#f7f7f8"; // charcoal-50
const DECLINE_TEXT_COLOR = "#c4c4c7"; // charcoal-300

// 동의서 카드 안 텍스트 폭(375 기준 264)은 카드 px 8에 7.5씩 더 들어간 값이고,
// 본문(246)은 오른쪽 18을 스크롤 인디케이터 자리로 비운다. 처리 정보 텍스트
// 폭 215 = 박스 246 − 왼쪽 8 − 오른쪽 23.
const CONSENT_CARD_HEIGHT = 336;
const CONSENT_CARD_PADDING_TOP = 12;
const CONSENT_CARD_PADDING_HORIZONTAL = 8 + 7.5;
const CONSENT_BODY_GUTTER_RIGHT = 18;
const INFO_BOX_PADDING = { left: 8, right: 23, vertical: 12 };
const CHECKBOX_SIZE = 20;
const CHECKBOX_BORDER_WIDTH = 1.5;
const CHECKBOX_RADIUS = 6;
const ROW_HEIGHT = 48;

const CONSENT_TITLE = "외부 AI를 통한 개인정보 처리 동의";
const CONSENT_INTRO =
  "8% 운영팀은 이용자가 AI 기반 개인화 미션 기능 이용에 동의한 경우 아래와 같이 외부 AI를 통해 개인정보를 처리합니다.";
const CONSENT_ITEMS: { label: string; value: string }[] = [
  { label: "• 외부 AI 사업자", value: "OpenAI, L.L.C." },
  {
    label: "• 전송 정보",
    value:
      "운동 취향 및 생활습관 관련 대화 내용, 운동 기록 요약 정보, 개인화 미션 생성에 필요한 운동 관련 정보",
  },
  {
    label: "• 이용 목적",
    value: "AI 기반 운동 대화, 개인화된 운동 미션 및 운동 관련 안내 제공",
  },
  { label: "• 전송 국가", value: "미국" },
  {
    label: "• 보유 및 이용 기간",
    value:
      "AI 기능 제공에 필요한 기간 동안 처리하며, 서비스 내 보유 정보는 회원 탈퇴 또는 처리 목적 달성 시 삭제합니다.",
  },
];
const CONSENT_NOTES = [
  "이 동의는 선택 사항이며, 동의하지 않아도 운동 계획 및 운동 기록 등 기본 서비스는 이용할 수 있습니다. 다만, AI 기반 개인화 미션 기능은 이용할 수 없습니다.",
  "이용자는 설정 화면에서 언제든지 동의를 철회할 수 있습니다.",
];

type ExternalAiConsentModalProps = {
  visible: boolean;
  // 동의 요청이 서버에서 처리되는 동안 true — CTA 잠금.
  isSubmitting: boolean;
  onAgree: () => void;
  onDecline: () => void;
};

export function ExternalAiConsentModal({
  visible,
  isSubmitting,
  onAgree,
  onDecline,
}: ExternalAiConsentModalProps) {
  const [checked, setChecked] = useState(false);
  // 닫혔다가 다시 열리면 Figma "체크 전"부터 시작한다 — 렌더 중 prop 변화를
  // 감지해 state를 되돌리는 React 권장 패턴(effect 안 setState 대신).
  const [wasVisible, setWasVisible] = useState(visible);
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (!visible) setChecked(false);
  }

  const canAgree = checked && !isSubmitting;

  return (
    <Modal
      animationType="fade"
      // Android 뒤로가기 = "거부하기". 동의 없이 우회되는 게 아니라 채팅
      // 이용 불가 상태로 닫힐 뿐이고, 다음 진입 때 서버 상태로 다시 뜬다.
      onRequestClose={onDecline}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <View style={[StyleSheet.absoluteFill, styles.dim]} />
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.consentCard}>
            <ThemedText
              style={{ color: primitiveColors.charcoal["12"] }}
              typography="body-3-bold"
            >
              {CONSENT_TITLE}
            </ThemedText>
            <View style={styles.titleDivider} />
            <ScrollView
              contentContainerStyle={styles.consentBody}
              indicatorStyle="black"
              style={styles.consentScroll}
            >
              <ThemedText
                style={{ color: primitiveColors.charcoal["5"] }}
                typography="caption-2-regular"
              >
                {CONSENT_INTRO}
              </ThemedText>
              <View style={styles.infoBox}>
                {CONSENT_ITEMS.map((item) => (
                  <View key={item.label}>
                    <ThemedText
                      style={{ color: primitiveColors.charcoal["12"] }}
                      typography="caption-2-bold"
                    >
                      {item.label}
                    </ThemedText>
                    <ThemedText
                      style={{ color: primitiveColors.charcoal["5"] }}
                      typography="caption-2-regular"
                    >
                      {item.value}
                    </ThemedText>
                  </View>
                ))}
                {CONSENT_NOTES.map((note) => (
                  <ThemedText
                    key={note}
                    style={{ color: primitiveColors.charcoal["5"] }}
                    typography="caption-2-regular"
                  >
                    {note}
                  </ThemedText>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={() => setChecked((value) => !value)}
              style={styles.checkboxRow}
            >
              {checked ? (
                <Image
                  contentFit="contain"
                  source={require("@/assets/chat/checkbox-checked.svg")}
                  style={styles.checkbox}
                />
              ) : (
                <View style={[styles.checkbox, styles.checkboxUnchecked]} />
              )}
              <ThemedText
                style={[
                  styles.checkboxLabel,
                  { color: primitiveColors.charcoal["12"] },
                ]}
                typography="body-3-regular"
              >
                [선택] 위 내용을 확인하고 동의합니다.
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canAgree }}
              disabled={!canAgree}
              onPress={onAgree}
              style={[
                styles.cta,
                {
                  backgroundColor: canAgree
                    ? primitiveColors.charcoal["11"]
                    : primitiveColors.charcoal["1"],
                },
              ]}
            >
              <ThemedText
                style={{
                  color: canAgree
                    ? semanticColors["label-inverse"]
                    : primitiveColors.charcoal["5"],
                }}
                typography="body-1-medium"
              >
                동의하고 시작하기
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={onDecline}
            >
              <ThemedText style={styles.decline} typography="body-3-regular">
                거부하기(채팅서비스 이용불가)
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  dim: {
    backgroundColor: DIM_COLOR,
    opacity: DIM_OPACITY,
  },
  card: {
    alignItems: "stretch",
    backgroundColor: semanticColors["background-normal"],
    borderRadius: 16,
    gap: 16,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  consentCard: {
    borderColor: primitiveColors.charcoal["1"],
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    height: CONSENT_CARD_HEIGHT,
    overflow: "hidden",
    paddingHorizontal: CONSENT_CARD_PADDING_HORIZONTAL,
    paddingTop: CONSENT_CARD_PADDING_TOP,
  },
  titleDivider: {
    backgroundColor: primitiveColors.neutral["200"],
    height: 1,
  },
  consentScroll: {
    flex: 1,
  },
  consentBody: {
    gap: 8,
    paddingRight: CONSENT_BODY_GUTTER_RIGHT,
  },
  infoBox: {
    backgroundColor: INFO_BOX_BACKGROUND,
    borderRadius: 8,
    gap: 16,
    paddingLeft: INFO_BOX_PADDING.left,
    paddingRight: INFO_BOX_PADDING.right,
    paddingVertical: INFO_BOX_PADDING.vertical,
  },
  footer: {
    gap: 8,
  },
  checkboxRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    height: ROW_HEIGHT,
  },
  checkbox: {
    height: CHECKBOX_SIZE,
    width: CHECKBOX_SIZE,
  },
  checkboxUnchecked: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: primitiveColors.charcoal["3"],
    borderRadius: CHECKBOX_RADIUS,
    borderWidth: CHECKBOX_BORDER_WIDTH,
  },
  checkboxLabel: {
    flex: 1,
  },
  // Figma CTA는 h48에 py16이지만 RN은 고정 height 안에 padding까지 넣어
  // 22px 텍스트가 들어갈 16px만 남기고 위아래를 잘라내므로, 세로 padding
  // 없이 48 높이에서 가운데 정렬만 한다(최종 geometry 동일).
  cta: {
    alignItems: "center",
    borderRadius: 999,
    height: ROW_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  decline: {
    color: DECLINE_TEXT_COLOR,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
