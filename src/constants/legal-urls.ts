// swyp6/unstiff-static repo의 terms/ 에서 관리하고 Cloudflare Workers로 배포되는
// 법적 문서 4종. 설정 화면은 이 URL을 직접 열고, 온보딩은 GET /api/v1/terms의
// contentUrl이 source of truth라 여기 URL을 쓰지 않는다 — 대신 문서명(title)만
// 공유해서 온보딩/설정 간 표기가 갈라지지 않게 한다.
// 파일명(*-1.0.html)은 서버 contentUrl과 같은 URL contract라 임의로 바꾸지 않는다.
const LEGAL_BASE_URL = "https://terms.swyp-8team.workers.dev";

export const LEGAL_URLS = {
  privacy: `${LEGAL_BASE_URL}/privacy-1.0.html`,
  terms: `${LEGAL_BASE_URL}/service-1.0.html`,
  sensitive: `${LEGAL_BASE_URL}/sensitive-1.0.html`,
  ai: `${LEGAL_BASE_URL}/ai-1.0.html`,
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
