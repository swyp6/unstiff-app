import { LegalDocumentScreen } from "@/features/settings/components/legal-document-screen";

const TERMS_ARTICLES = [
  {
    title: "제1조 목적",
    body: "서비스 이용에 필요한 기본 조건과 사용자·운영자의 권리 및 의무를 안내합니다.",
  },
  {
    title: "제2조 서비스 이용",
    body: "오늘의 질문, 미션과 운동 기록 기능의 이용 기준을 안내합니다.",
  },
  {
    title: "제3조 사용자 의무",
    body: "계정과 서비스 이용 시 사용자가 지켜야 할 사항을 안내합니다.",
  },
  {
    title: "제4조 책임 제한",
    body: "서비스 이용 및 외부 연동과 관련된 책임 범위를 안내합니다.",
  },
] as const;

export default function TermsScreen() {
  return (
    <LegalDocumentScreen
      articles={TERMS_ARTICLES}
      title="이용약관"
      version="v1.0 · 2026.08.28 시행"
    />
  );
}
