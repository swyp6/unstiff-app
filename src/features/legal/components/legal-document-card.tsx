import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, radius, semanticColors } from "@/constants/tokens";

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
const EMBEDDED_STYLE_ID = "unstiff-legal-embedded-style";
const EMBEDDED_META_ID = "unstiff-legal-embedded-meta";
const EMBEDDED_READY_MESSAGE = "unstiff-legal-embedded-ready";
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
#${EMBEDDED_META_ID} {
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

// 문서 파싱 시작 시점(injectedJavaScriptBeforeContentLoaded)과 로드 완료 시점
// (injectedJavaScript)에 같은 스크립트를 넣는다. style은 id로 한 번만 붙고,
// meta 한 줄은 .legal-document-body가 생긴 뒤(로드 완료)에만, 역시 한 번만
// 끼운다. 끝나면 postMessage로 알려 그때 WebView를 드러낸다 — onLoadEnd보다
// 늦게 style이 적용되는 순간의 원본 layout flicker를 피하기 위해서다.
function buildEmbedScript(metaText: string) {
  return `
(function () {
  try {
    if (!document.getElementById(${JSON.stringify(EMBEDDED_STYLE_ID)})) {
      var style = document.createElement("style");
      style.id = ${JSON.stringify(EMBEDDED_STYLE_ID)};
      style.textContent = ${JSON.stringify(EMBEDDED_CSS)};
      (document.head || document.documentElement).appendChild(style);
    }
    var body = document.querySelector(".legal-document-body");
    if (body && !document.getElementById(${JSON.stringify(EMBEDDED_META_ID)})) {
      var meta = document.createElement("div");
      meta.id = ${JSON.stringify(EMBEDDED_META_ID)};
      meta.textContent = ${JSON.stringify(metaText)};
      body.parentNode.insertBefore(meta, body);
    }
  } finally {
    if (document.readyState !== "loading" && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(${JSON.stringify(EMBEDDED_READY_MESSAGE)});
    }
  }
})();
true;
`;
}

function getOrigin(url: string) {
  const match = /^[a-z][a-z0-9+.-]*:\/\/[^/]+/i.exec(url);
  return match ? match[0].toLowerCase() : null;
}

export function LegalDocumentCard({
  title,
  metaText,
  uri,
  fetchError = false,
  onRetryFetch,
}: LegalDocumentCardProps) {
  // WebView 자체의 로드 상태. reloadKey를 올리면 WebView를 다시 마운트해
  // 처음부터 다시 연다.
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageError, setPageError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const embedScript = useMemo(() => buildEmbedScript(metaText), [metaText]);

  function clearRevealTimer() {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }

  useEffect(() => clearRevealTimer, []);

  function reveal() {
    clearRevealTimer();
    setIsPageLoading(false);
  }

  function retryPage() {
    clearRevealTimer();
    setPageError(false);
    setIsPageLoading(true);
    setReloadKey((key) => key + 1);
  }

  function renderBody() {
    if (fetchError) {
      return (
        <BodyMessage
          message="문서를 불러오지 못했습니다."
          onRetry={onRetryFetch}
        />
      );
    }
    if (uri === undefined) {
      return (
        <View style={styles.bodyCenter}>
          <ActivityIndicator color={semanticColors["label-normal"]} />
        </View>
      );
    }
    if (uri === null) {
      return <BodyMessage message="문서를 불러올 수 없습니다." />;
    }
    if (pageError) {
      return (
        <BodyMessage
          message="문서를 불러오지 못했습니다."
          onRetry={retryPage}
        />
      );
    }

    const documentOrigin = getOrigin(uri);
    return (
      <>
        <WebView
          key={reloadKey}
          allowsBackForwardNavigationGestures={false}
          injectedJavaScript={embedScript}
          injectedJavaScriptBeforeContentLoaded={embedScript}
          onError={() => {
            clearRevealTimer();
            setIsPageLoading(false);
            setPageError(true);
          }}
          onHttpError={() => {
            clearRevealTimer();
            setIsPageLoading(false);
            setPageError(true);
          }}
          // 정상 경로는 주입 스크립트의 ready 메시지에서 드러낸다. 메시지가
          // 오지 않는 경우(스크립트 실패 등)에도 페이지가 영영 숨겨지지
          // 않도록 onLoadEnd 뒤 잠시 기다렸다가 드러낸다.
          onLoadEnd={() => {
            clearRevealTimer();
            revealTimerRef.current = setTimeout(reveal, 400);
          }}
          onMessage={(event) => {
            if (event.nativeEvent.data === EMBEDDED_READY_MESSAGE) reveal();
          }}
          // 약관 도메인 안의 문서만 WebView에서 연다. mailto: 같은 다른
          // scheme이나 다른 도메인 링크는 OS 기본 앱으로 넘기고 WebView는
          // 그 자리에 머문다.
          onShouldStartLoadWithRequest={(request) => {
            if (documentOrigin && getOrigin(request.url) === documentOrigin) {
              return true;
            }
            void Linking.openURL(request.url).catch(() => {});
            return false;
          }}
          setSupportMultipleWindows={false}
          source={{ uri }}
          style={[styles.webView, isPageLoading && styles.webViewLoading]}
        />
        {isPageLoading && (
          <View pointerEvents="none" style={styles.loadingOverlay}>
            <ActivityIndicator color={semanticColors["label-normal"]} />
          </View>
        )}
      </>
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

function BodyMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.bodyCenter}>
      <ThemedText
        style={styles.messageText}
        themeColor="textSecondary"
        typography="body-2-medium"
      >
        {message}
      </ThemedText>
      {onRetry && (
        <Pressable
          accessibilityLabel="다시 시도"
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retryButton}
        >
          <ThemedText style={styles.retryButtonText} typography="body-1-medium">
            다시 시도
          </ThemedText>
        </Pressable>
      )}
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
  bodyCenter: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
  },
  messageText: {
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
  webView: {
    backgroundColor: semanticColors["background-normal"],
    flex: 1,
  },
  webViewLoading: {
    opacity: 0,
  },
  loadingOverlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
