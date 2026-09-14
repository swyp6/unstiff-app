import { LEGAL_DOCUMENTS, LEGAL_URLS } from "@/constants/legal-urls";
import type { Term, TermsType } from "@/features/auth/types";

// 온보딩(회원가입) 약관의 표시 계층 — 노출 대상(allowlist)·노출 순서·문구만
// 담당한다. 화면에 그려지는 약관은 전부 GET /api/v1/terms 응답이고 로컬에서
// 만들어내는 약관은 없다. id·type·required·contentUrl·agreed 같은 실제 약관
// 상태는 서버 응답이 source of truth다. 동의 state·POST는 terms-agreement.tsx가
// 그대로 들고 있고, 여기는 목록(terms-agreement)과 문서 상세
// (terms-document/[type])가 같은 정책을 보게 하려고 뽑아낸 것뿐이다.
//
// 온보딩은 PRIVACY / SERVICE / SENSITIVE 3종만 받는다. AI 개인화 기능 이용 동의
// (EXTERNAL_AI)를 비롯해 서버에 추가되는 다른 약관은 온보딩 목록에도 온보딩
// 문서 상세에도 노출하지 않는다 — 설정 > 약관 및 개인정보에서만 다루므로
// LEGAL_DOCUMENTS에는 그대로 둔다. 노출 순서 그대로.
export const ONBOARDING_TERM_TYPES = [
  "PRIVACY",
  "SERVICE",
  "SENSITIVE",
] as const satisfies readonly TermsType[];

export type OnboardingTermType = (typeof ONBOARDING_TERM_TYPES)[number];

// 딥링크 등으로 들어온 route param을 좁힌다. EXTERNAL_AI나 알 수 없는 문자열은
// 여기서 걸러져 온보딩 상세가 절대 열지 않는다.
export function isOnboardingTermType(
  value: unknown,
): value is OnboardingTermType {
  return ONBOARDING_TERM_TYPES.some((type) => type === value);
}

// 같은 PRIVACY 약관도 설정 상세에서는 "개인정보 처리방침"으로 부르지만, 온보딩은
// 배포된 문서 제목(LEGAL_DOCUMENTS)을 그대로 쓴다 — "만 14세 이상 확인 및
// 개인정보 수집·이용 동의". [필수]/[선택] 접두어는 서버 required로 붙인다.
const ONBOARDING_DOCUMENT_URLS: Record<OnboardingTermType, string> = {
  PRIVACY: LEGAL_URLS.privacy,
  SERVICE: LEGAL_URLS.terms,
  SENSITIVE: LEGAL_URLS.sensitive,
};

export type OnboardingTermDisplaySpec = {
  type: OnboardingTermType;
  title: string;
  match: (term: Term) => boolean;
};

// 서버가 "[필수] " 접두어나 "동의" 접미사를 붙여 내려주든 아니든 걸리도록 둘 다
// 떼고 비교한다.
function normalizeTermTitle(title: string) {
  return title
    .replace(/^\[(필수|선택)\]\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/\s*동의$/, "")
    .trim();
}

function byTitle(title: string) {
  const expected = normalizeTermTitle(title);
  return (term: Term) => normalizeTermTitle(term.title) === expected;
}

// 온보딩에 노출하는 문서 3종 — ONBOARDING_TERM_TYPES 순서 그대로. 목록은 이
// 배열의 title 매칭으로 문구·정렬을 정하고, 상세는 type으로 문구를 찾는다.
export const ONBOARDING_TERM_DISPLAY: readonly OnboardingTermDisplaySpec[] =
  ONBOARDING_TERM_TYPES.flatMap((type) =>
    LEGAL_DOCUMENTS.filter(
      (document) => document.url === ONBOARDING_DOCUMENT_URLS[type],
    ).map((document) => ({
      type,
      title: document.title,
      match: byTitle(document.title),
    })),
  );

// 서버 약관에 붙일 온보딩 문구. 문서명이 매칭되면 그 문구, 아니면 서버 title.
export function getOnboardingTermTitle(term: Term) {
  return (
    ONBOARDING_TERM_DISPLAY.find((spec) => spec.match(term))?.title ??
    term.title
  );
}

// 상세 route가 GET /terms 응답 전에 카드 제목으로 쓸 문구(type 기준).
export function getOnboardingDocumentTitle(type: OnboardingTermType) {
  return (
    ONBOARDING_TERM_DISPLAY.find((spec) => spec.type === type)?.title ?? null
  );
}

// 온보딩 목록·상세 카드 제목 — "[필수] 찌뿌두둥 서비스 이용약관". required는
// 하드코딩하지 않고 서버 값을 받는다.
export function formatOnboardingTermLabel(title: string, required: boolean) {
  return `${required ? "[필수]" : "[선택]"} ${title}`;
}

// "보기"/WebView는 서버 contentUrl이 실제 http(s) 주소일 때만 연다 — null이거나
// 이상한 값이면 목록은 "보기"를 숨기고 상세는 "불러올 수 없음" 상태를 보여준다.
export function isValidHttpUrl(
  value: string | null | undefined,
): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
