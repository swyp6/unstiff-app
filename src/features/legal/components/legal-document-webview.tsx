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
import { radius, semanticColors } from "@/constants/tokens";

// 원격 약관 문서(swyp6/unstiff-static terms/*.html, GET /terms의 contentUrl)를
// 카드 본문 안에 끼워 넣는 WebView. 설정 > 약관 상세(LegalDocumentCard)와
// 채팅 외부 AI 동의 모달이 같이 쓴다 — 로딩/에러/재시도, 주입 CSS lifecycle,
// 문서 도메인 밖 링크 처리는 여기 한 벌뿐이고, 각 화면은 자기 디자인에 맞는
// embedded CSS만 넘긴다.
//
// 원격 문서는 단독 페이지용 flat editorial layout(.legal-page 여백, h1 제목
// 등)이라 embedded 모드에서는 그 outer layout을 걷어내야 한다. site.css는
// <link>라 우리 <style>보다 늦게 적용될 수 있어 동일 specificity로는 덮이므로
// 규칙마다 !important를 쓴다. selector는 site.css에 실제로 있는 것만 쓴다.
export type LegalDocumentEmbedOptions = {
  // 문서 파싱 시작/로드 완료 시점에 <style>로 주입할 CSS.
  css: string;
  // .legal-document-body 앞에 한 줄로 끼우는 "시행일 … · 운영 주체 …" 문구.
  metaText?: string;
  // .legal-document-body의 첫 문단(도입부) 뒤 나머지(항목 목록·안내문)를
  // #LEGAL_EMBED_INFO_ID div로 감싼다 — 동의 모달의 회색 "처리 정보" 박스용.
  wrapAfterIntro?: boolean;
};

const EMBEDDED_STYLE_ID = "unstiff-legal-embedded-style";
export const LEGAL_EMBED_META_ID = "unstiff-legal-embedded-meta";
export const LEGAL_EMBED_INFO_ID = "unstiff-legal-embedded-info";
const EMBEDDED_READY_MESSAGE = "unstiff-legal-embedded-ready";

// 문서 파싱 시작 시점(injectedJavaScriptBeforeContentLoaded)과 로드 완료 시점
// (injectedJavaScript)에 같은 스크립트를 넣는다. style은 id로 한 번만 붙고,
// meta 한 줄/info 래핑은 .legal-document-body가 생긴 뒤(로드 완료)에만, 역시
// 한 번만 적용한다. 끝나면 postMessage로 알려 그때 WebView를 드러낸다 —
// onLoadEnd보다 늦게 style이 적용되는 순간의 원본 layout flicker를 피하기
// 위해서다.
function buildEmbedScript({
  css,
  metaText,
  wrapAfterIntro,
}: LegalDocumentEmbedOptions) {
  return `
(function () {
  try {
    if (!document.getElementById(${JSON.stringify(EMBEDDED_STYLE_ID)})) {
      var style = document.createElement("style");
      style.id = ${JSON.stringify(EMBEDDED_STYLE_ID)};
      style.textContent = ${JSON.stringify(css)};
      (document.head || document.documentElement).appendChild(style);
    }
    var body = document.querySelector(".legal-document-body");
    var metaText = ${JSON.stringify(metaText ?? null)};
    if (body && metaText !== null && !document.getElementById(${JSON.stringify(LEGAL_EMBED_META_ID)})) {
      var meta = document.createElement("div");
      meta.id = ${JSON.stringify(LEGAL_EMBED_META_ID)};
      meta.textContent = metaText;
      body.parentNode.insertBefore(meta, body);
    }
    var wrapAfterIntro = ${JSON.stringify(Boolean(wrapAfterIntro))};
    if (body && wrapAfterIntro && !document.getElementById(${JSON.stringify(LEGAL_EMBED_INFO_ID)})) {
      var info = document.createElement("div");
      info.id = ${JSON.stringify(LEGAL_EMBED_INFO_ID)};
      var intro = body.firstElementChild;
      var node = intro ? intro.nextSibling : body.firstChild;
      while (node) {
        var next = node.nextSibling;
        info.appendChild(node);
        node = next;
      }
      body.appendChild(info);
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

type LegalDocumentWebViewProps = LegalDocumentEmbedOptions & {
  uri: string;
  // 문서가 실제로 보이는 상태인지(로드 완료 & 에러 없음) — 동의 모달이
  // "약관을 본 뒤에만 동의" 정책에 쓴다.
  onReadyChange?: (ready: boolean) => void;
};

export function LegalDocumentWebView({
  uri,
  css,
  metaText,
  wrapAfterIntro,
  onReadyChange,
}: LegalDocumentWebViewProps) {
  // WebView 자체의 로드 상태. reloadKey를 올리면 WebView를 다시 마운트해
  // 처음부터 다시 연다.
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageError, setPageError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const embedScript = useMemo(
    () => buildEmbedScript({ css, metaText, wrapAfterIntro }),
    [css, metaText, wrapAfterIntro],
  );

  const ready = !isPageLoading && !pageError;
  useEffect(() => {
    onReadyChange?.(ready);
  }, [onReadyChange, ready]);

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

  if (pageError) {
    return (
      <LegalDocumentBodyMessage
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

// 본문 자리에 놓는 로딩 스피너 — GET /terms 응답을 기다릴 때.
export function LegalDocumentBodyLoading() {
  return (
    <View style={styles.bodyCenter}>
      <ActivityIndicator color={semanticColors["label-normal"]} />
    </View>
  );
}

// 본문 자리에 놓는 안내 문구(+ 다시 시도) — GET /terms 실패, contentUrl 없음,
// WebView 로드 실패 공용.
export function LegalDocumentBodyMessage({
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
