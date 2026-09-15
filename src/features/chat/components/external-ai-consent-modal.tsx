import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import type { Term } from "@/features/auth/types";
import {
  LEGAL_EMBED_INFO_ID,
  LegalDocumentBodyLoading,
  LegalDocumentBodyMessage,
  LegalDocumentWebView,
} from "@/features/legal/components/legal-document-webview";

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

// 약관 본문은 GET /terms의 EXTERNAL_AI.contentUrl(원격 HTML)이 source of
// truth라 앱에 문구를 두지 않고 WebView로 연다. 원격 문서 구조는
// .legal-document-body > p(도입부) + ul > li(strong 라벨 + br + 값) + p(안내)
// 이고, Figma 동의서 카드(4939:26726)는 도입부 11/15 Regular charcoal-5,
// 그 아래 회색(charcoal-50) 박스(radius 8, padding 12/23/12/8) 안에 항목
// 라벨 11/15 Bold charcoal/12 · 값 11/15 Regular charcoal-5 · 항목/안내 사이
// 16이다. 박스는 도입부 뒤 요소를 #LEGAL_EMBED_INFO_ID로 감싸 만든다.
// HTML 안이라 토큰을 못 쓰므로 같은 토큰의 hex를 그대로 적는다.
const CONSENT_EMBEDDED_CSS = `
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  background: #ffffff !important;
}
.legal-page, .legal-document {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  max-width: none !important;
}
.legal-document-header h1 { display: none !important; }
.legal-document-body {
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
  color: #8c8c92 !important;
  font-size: 11px !important;
  font-weight: 400 !important;
  line-height: 15px !important;
}
.legal-document-body > p:first-child { margin: 0 0 8px !important; }
#${LEGAL_EMBED_INFO_ID} {
  box-sizing: border-box !important;
  margin: 0 !important;
  padding: ${INFO_BOX_PADDING.vertical}px ${INFO_BOX_PADDING.right}px ${INFO_BOX_PADDING.vertical}px ${INFO_BOX_PADDING.left}px !important;
  border-radius: 8px !important;
  background: ${INFO_BOX_BACKGROUND} !important;
}
#${LEGAL_EMBED_INFO_ID} ul,
#${LEGAL_EMBED_INFO_ID} ol {
  margin: 0 !important;
  padding: 0 !important;
  list-style: none !important;
}
#${LEGAL_EMBED_INFO_ID} li,
#${LEGAL_EMBED_INFO_ID} p { margin: 0 !important; }
#${LEGAL_EMBED_INFO_ID} li + li,
#${LEGAL_EMBED_INFO_ID} ul + p,
#${LEGAL_EMBED_INFO_ID} p + p { margin-top: 16px !important; }
#${LEGAL_EMBED_INFO_ID} li strong {
  display: block !important;
  font-weight: 700 !important;
  color: #171719 !important;
}
#${LEGAL_EMBED_INFO_ID} li strong::before { content: "\\2022\\00a0"; }
#${LEGAL_EMBED_INFO_ID} li br { display: none !important; }
.legal-document-body a { color: #525257 !important; }
`;

type ExternalAiConsentModalProps = {
  visible: boolean;
  // GET /terms의 EXTERNAL_AI 약관. undefined: 조회 중, null: 서버에 없음.
  term: Term | null | undefined;
  termError: boolean;
  onRetryTerm: () => void;
  // 동의 요청이 서버에서 처리되는 동안 true — CTA 잠금.
  isSubmitting: boolean;
  onAgree: () => void;
  onDecline: () => void;
};

export function ExternalAiConsentModal({
  visible,
  term,
  termError,
  onRetryTerm,
  isSubmitting,
  onAgree,
  onDecline,
}: ExternalAiConsentModalProps) {
  const [checked, setChecked] = useState(false);
  // 약관 문서가 실제로 화면에 떠 있을 때만 체크/동의할 수 있다 — contentUrl이
  // 없거나 조회/로드에 실패한 채로 동의 POST가 나가는 구조를 막는다.
  const [documentReady, setDocumentReady] = useState(false);
  // 닫혔다가 다시 열리면 Figma "체크 전"부터 시작한다 — 렌더 중 prop 변화를
  // 감지해 state를 되돌리는 React 권장 패턴(effect 안 setState 대신).
  const [wasVisible, setWasVisible] = useState(visible);
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (!visible) {
      setChecked(false);
      setDocumentReady(false);
    }
  }

  const contentUrl = term?.contentUrl ?? null;
  const documentShown = !termError && term !== undefined && contentUrl !== null;
  const canCheck = documentShown && documentReady && !isSubmitting;
  const canAgree = checked && canCheck;

  function renderDocument() {
    if (termError) {
      return (
        <LegalDocumentBodyMessage
          message="문서를 불러오지 못했습니다."
          onRetry={onRetryTerm}
        />
      );
    }
    if (term === undefined) return <LegalDocumentBodyLoading />;
    if (contentUrl === null) {
      return <LegalDocumentBodyMessage message="문서를 불러올 수 없습니다." />;
    }
    return (
      <LegalDocumentWebView
        css={CONSENT_EMBEDDED_CSS}
        onReadyChange={setDocumentReady}
        uri={contentUrl}
        wrapAfterIntro
      />
    );
  }

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
            <View style={styles.documentBody}>{renderDocument()}</View>
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: !canCheck }}
              disabled={!canCheck}
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
  documentBody: {
    flex: 1,
    paddingRight: CONSENT_BODY_GUTTER_RIGHT,
    position: "relative",
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
