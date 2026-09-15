import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import {
  LEGAL_EMBED_META_ID,
  LegalDocumentBodyLoading,
  LegalDocumentBodyMessage,
  LegalDocumentWebView,
} from "@/features/legal/components/legal-document-webview";

type LegalDocumentCardProps = {
  title: string;
  // WebView 첫 줄에 끼우는 "시행일 … · 운영 주체 …" 문구.
  metaText: string;
  // undefined: 아직 GET /terms 응답 전. null: 서버가 전문(contentUrl)을 안 줌.
  uri: string | null | undefined;
  // GET /terms 자체가 실패한 상태 — 본문 영역에 다시 시도를 보여준다.
  fetchError?: boolean;
  onRetryFetch?: () => void;
};

// Figma "웹뷰 / 문서" (4953:59949 등) — 카드는 네이티브 View(335 폭, border 1
// charcoal/1, radius 12, padding top 16 / 좌우 16)이고 그 안에 네이티브 제목,
// 1px neutral/200 구분선, 그리고 원격 약관 HTML을 그대로 여는 WebView 본문이
// 순서대로 놓인다. WebView는 카드 본문일 뿐 border/radius를 갖지 않는다.
const CARD_RADIUS = 12;
const CARD_PADDING = 16;
const CARD_GAP = 12;
// Figma "웹 콘텐츠 / 내부 스크롤"은 오른쪽 8을 scroll indicator 자리로 비운다.
const BODY_PADDING_RIGHT = 8;

// 원격 문서(swyp6/unstiff-static terms/*.html + styles/site.css)는 단독 페이지용
// flat editorial layout이라 .legal-page 여백(28/20px), h1 제목, 본문 margin-top
// 22, 15px 조항 제목·1.6 행간을 갖는다. embedded 모드에서는 그 outer layout을
// 전부 걷어내고 본문(.legal-document-body)을 Figma 4953:59947의 charcoal/50
// 카드(radius 12, padding 16/12, 조항 14 Bold charcoal/12, 본문 14 Regular
// charcoal/5, 조항 사이 16, 제목→본문 4)로 만든다. site.css는 <link>라 우리
// <style>보다 늦게 적용될 수 있어 동일 specificity로는 덮이므로 규칙마다
// !important를 쓴다. selector는 site.css에 실제로 있는 것만 쓴다.
const EMBEDDED_CSS = `
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
#${LEGAL_EMBED_META_ID} {
  margin: 0 0 12px !important;
  font-size: 12px !important;
  font-weight: 400 !important;
  line-height: 16px !important;
  color: #8c8c92 !important;
}
.legal-document-body {
  box-sizing: border-box !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 16px 12px !important;
  border-radius: 12px !important;
  background: #f7f7f8 !important;
  color: #8c8c92 !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  line-height: 19px !important;
}
.legal-document-body h2 {
  margin: 0 !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  line-height: 19px !important;
  color: #171719 !important;
}
.legal-document-body h2:not(:first-child) { margin-top: 16px !important; }
.legal-document-body p,
.legal-document-body ol,
.legal-document-body ul { margin: 0 !important; }
.legal-document-body h2 + p,
.legal-document-body h2 + ol,
.legal-document-body h2 + ul { margin-top: 4px !important; }
.legal-document-body p + p,
.legal-document-body p + ol,
.legal-document-body p + ul,
.legal-document-body ol + p,
.legal-document-body ul + p { margin-top: 19px !important; }
.legal-document-body ol,
.legal-document-body ul {
  padding-left: 0 !important;
  list-style-position: inside !important;
}
.legal-document-body li { margin: 0 !important; }
.legal-document-body li::marker { color: #8c8c92 !important; }
.legal-document-body li strong {
  font-weight: 700 !important;
  color: #171719 !important;
}
.legal-document-body li:has(> strong) + li { margin-top: 19px !important; }
.legal-document-body a { color: #525257 !important; }
`;

export function LegalDocumentCard({
  title,
  metaText,
  uri,
  fetchError = false,
  onRetryFetch,
}: LegalDocumentCardProps) {
  function renderBody() {
    if (fetchError) {
      return (
        <LegalDocumentBodyMessage
          message="문서를 불러오지 못했습니다."
          onRetry={onRetryFetch}
        />
      );
    }
    if (uri === undefined) return <LegalDocumentBodyLoading />;
    if (uri === null) {
      return <LegalDocumentBodyMessage message="문서를 불러올 수 없습니다." />;
    }
    return (
      <LegalDocumentWebView css={EMBEDDED_CSS} metaText={metaText} uri={uri} />
    );
  }

  return (
    <View style={styles.card}>
      <ThemedText style={styles.title} typography="body-1-bold">
        {title}
      </ThemedText>
      <View style={styles.headerDivider} />
      <View style={styles.body}>{renderBody()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: primitiveColors.charcoal["1"],
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    flex: 1,
    gap: CARD_GAP,
    overflow: "hidden",
    paddingHorizontal: CARD_PADDING,
    paddingTop: CARD_PADDING,
    width: "100%",
  },
  title: {
    color: primitiveColors.charcoal["12"],
  },
  headerDivider: {
    backgroundColor: semanticColors["line-normal"],
    height: 1,
    width: "100%",
  },
  body: {
    flex: 1,
    paddingRight: BODY_PADDING_RIGHT,
    position: "relative",
  },
});
