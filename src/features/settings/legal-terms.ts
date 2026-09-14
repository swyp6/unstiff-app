import type { Term, TermsType } from "@/features/auth/types";

// 설정 > 약관 및 개인정보(Figma 4953:59928 / 4953:59750)와 문서 상세
// (4953:59947 / 4953:59769 / 4953:59986)의 표시 계층. 약관 상태(id·agreed·
// agreedAt·contentUrl)는 전부 GET /api/v1/terms가 source of truth이고, 여기는
// 화면 문맥마다 다른 문구만 담당한다 — 같은 PRIVACY 약관도 동의 내역에서는
// "만 14세 이상 확인 및 개인정보 수집·이용 동의", 상시 조회/상세에서는
// "개인정보 처리방침"으로 부른다.

// 상세(WebView) 화면이 있는 문서. SENSITIVE는 동의 내역에만 보이고 상세 진입
// row가 없다.
export const LEGAL_DOCUMENT_TYPES = [
  "SERVICE",
  "PRIVACY",
  "EXTERNAL_AI",
] as const;

export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];

export function isLegalDocumentType(
  value: unknown,
): value is LegalDocumentType {
  return LEGAL_DOCUMENT_TYPES.some((type) => type === value);
}

export const LEGAL_DOCUMENT_COPY: Record<
  LegalDocumentType,
  { headerTitle: string; cardTitle: string }
> = {
  SERVICE: {
    headerTitle: "찌뿌두둥 서비스 이용약관",
    cardTitle: "[필수] 찌뿌두둥 서비스 이용약관",
  },
  PRIVACY: {
    headerTitle: "개인정보 처리방침",
    cardTitle: "[필수] 개인정보 처리방침",
  },
  EXTERNAL_AI: {
    headerTitle: "AI 개인화 기능 이용 동의",
    cardTitle: "[선택] AI 개인화 기능 이용 동의",
  },
};

// 상시 조회 섹션 — 노출 순서 그대로.
export const LEGAL_BROWSE_ROWS: { type: LegalDocumentType; title: string }[] = [
  { type: "SERVICE", title: "찌뿌두둥 서비스 이용약관" },
  { type: "PRIVACY", title: "개인정보 처리방침" },
];

// 동의 내역 섹션 — 노출 순서 그대로(서버 응답 순서와 같다).
export const LEGAL_AGREEMENT_HISTORY_ROWS: {
  type: TermsType;
  title: string;
}[] = [
  { type: "PRIVACY", title: "만 14세 이상 확인 및 개인정보 수집·이용 동의" },
  { type: "SERVICE", title: "서비스 이용약관" },
  { type: "SENSITIVE", title: "민감정보 수집·이용" },
  { type: "EXTERNAL_AI", title: "AI 개인화 기능 이용 동의" },
];

// 선택 약관(AI) 섹션의 canonical 문구. Figma ON node(4953:59928)는 "AI 개인화
// 개인정보 처리 동의"라고 적혀 있지만 toggle 상태에 따라 약관 이름이 바뀌면
// 안 되므로 법적 문서명으로 통일한다.
export const EXTERNAL_AI_CONSENT_TITLE = "AI 개인화 기능 이용 동의";
export const EXTERNAL_AI_CONSENT_DESCRIPTION =
  "미동의 시, 개인형 맞춤 미션·AI 대화를 이용할 수 없습니다";

// 문서 상세 WebView 첫 줄 meta(Figma 4953:59947 "시행일 2026.09.12 · 운영 주체
// 8% 운영팀"). GET /terms에도 static HTML에도 시행일이 없어 Figma 값을 한 곳의
// 상수로 둔다 — 문서별 시행일이 갈리면 type별 map으로 바꾼다.
export const LEGAL_DOCUMENT_META = {
  effectiveDate: "2026.09.12",
  operator: "8% 운영팀",
} as const;

export function formatLegalDocumentMeta() {
  return `시행일 ${LEGAL_DOCUMENT_META.effectiveDate} · 운영 주체 ${LEGAL_DOCUMENT_META.operator}`;
}

export function findTerm(terms: readonly Term[], type: TermsType) {
  return terms.find((term) => term.type === type) ?? null;
}

// 서버 agreedAt은 timezone 없는 LocalDateTime("2026-09-12T13:20:00")이라
// Date로 파싱하면 기기 timezone에 따라 날짜가 하루 밀릴 수 있다. 날짜 부분만
// 그대로 잘라 "YYYY.MM.DD"로 만든다. 형식이 다르면 null.
export function formatAgreedDate(agreedAt: string | null): string | null {
  if (!agreedAt) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(agreedAt);
  if (!match) return null;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

// GET /terms에는 version 필드가 없고 contentUrl 파일명이 "service-1.0.html"처럼
// versioned라 basename의 "-<version>.html"에서 뽑는다. 패턴이 다르면 null.
export function extractTermsVersion(contentUrl: string | null): string | null {
  if (!contentUrl) return null;
  const path = contentUrl.split(/[?#]/)[0];
  const basename = path.slice(path.lastIndexOf("/") + 1);
  const match = /-(\d+(?:\.\d+)*)\.html$/i.exec(basename);
  return match ? match[1] : null;
}

// 동의 내역 row description — Figma "동의일 YYYY.MM.DD · 버전 —". 값이 없으면
// 날조하지 않고 "—".
export function formatAgreementDescription(term: Term | null): string {
  const date = term ? formatAgreedDate(term.agreedAt) : null;
  const version = term ? extractTermsVersion(term.contentUrl) : null;
  return `동의일 ${date ?? "—"} · 버전 ${version ?? "—"}`;
}
