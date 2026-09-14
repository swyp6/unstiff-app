// 문서 상세 WebView 첫 줄 meta(Figma 4953:59947 "시행일 2026.09.12 · 운영 주체
// 8% 운영팀"). GET /terms에도 static HTML에도 시행일이 없어 Figma 값을 한 곳의
// 상수로 둔다 — 문서별 시행일이 갈리면 type별 map으로 바꾼다. 설정 > 약관 및
// 개인정보 상세와 온보딩 약관 상세(terms-document/[type])가 같은 문서를 열므로
// 둘 다 이 meta를 쓴다.
export const LEGAL_DOCUMENT_META = {
  effectiveDate: "2026.09.12",
  operator: "8% 운영팀",
} as const;

export function formatLegalDocumentMeta() {
  return `시행일 ${LEGAL_DOCUMENT_META.effectiveDate} · 운영 주체 ${LEGAL_DOCUMENT_META.operator}`;
}
