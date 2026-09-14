// legal/ 정적 사이트(Cloudflare Workers)에 배포된 법적 문서 4종.
// 설정 화면은 이 URL을 직접 열고, 온보딩은 GET /api/v1/terms의 contentUrl이
// source of truth라 여기 URL을 쓰지 않는다 — 대신 문서명(title)만 공유해서
// 온보딩/설정 간 표기가 갈라지지 않게 한다.
const LEGAL_BASE_URL = "https://unstiff-legal.unstiff.workers.dev";

export const LEGAL_URLS = {
  privacy: `${LEGAL_BASE_URL}/privacy/`,
  terms: `${LEGAL_BASE_URL}/terms/`,
  sensitive: `${LEGAL_BASE_URL}/sensitive/`,
  ai: `${LEGAL_BASE_URL}/ai/`,
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
  { title: "외부 AI를 통한 개인정보 처리 동의", url: LEGAL_URLS.ai },
] as const;
