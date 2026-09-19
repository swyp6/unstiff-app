// swyp6/unstiff-static repo의 terms/ 에서 관리하고 Cloudflare Workers로 배포되는
// 법적 문서. 온보딩·설정 문서 상세는 GET /api/v1/terms의 contentUrl이 source of
// truth라 여기 URL을 WebView에 직접 쓰지 않는다 — 대신 문서명(title)만 공유해서
// 온보딩/설정 간 표기가 갈라지지 않게 한다(onboarding-terms.ts가 URL을 키로
// LEGAL_DOCUMENTS의 title을 찾는다). 단 하나의 예외가 privacyPolicy — 서버
// PRIVACY contentUrl은 회원가입용 개인정보 수집·이용 동의서(privacy.html)라,
// 설정 > 개인정보 처리방침만 이 URL(privacy-policy.html)을 직접 연다.
// 파일명은 서버 contentUrl과 같은 URL contract라 임의로 바꾸지 않는다.
const LEGAL_BASE_URL = "https://terms.swyp-8team.workers.dev";

export const LEGAL_URLS = {
  privacy: `${LEGAL_BASE_URL}/privacy.html`,
  terms: `${LEGAL_BASE_URL}/service.html`,
  sensitive: `${LEGAL_BASE_URL}/sensitive.html`,
  ai: `${LEGAL_BASE_URL}/external-ai.html`,
  // 설정 전용 개인정보 처리방침. 회원가입 동의서(privacy)와 다른 문서다.
  privacyPolicy: `${LEGAL_BASE_URL}/privacy-policy.html`,
  // 설정 메인 > 고객 지원. 약관이 아니라 GET /terms·동의와 무관한 정적 페이지다.
  support: `${LEGAL_BASE_URL}/support.html`,
} as const;

// 회원가입 약관 노출 순서와 같다. title은 배포된 문서 제목에서 [필수]/[선택]
// 접두어를 뺀 것 — 온보딩은 서버 required로, 설정은 접두어 없이 표시한다.
export const LEGAL_DOCUMENTS = [
  {
    title: "만 14세 이상 확인 및 개인정보 수집·이용 동의",
    url: LEGAL_URLS.privacy,
  },
  { title: "찌뿌두둥 서비스 이용약관", url: LEGAL_URLS.terms },
  { title: "민감정보 수집·이용 동의", url: LEGAL_URLS.sensitive },
  { title: "AI 개인화 기능 이용 동의", url: LEGAL_URLS.ai },
] as const;
