import { LegalDocumentScreen } from "@/features/settings/components/legal-document-screen";

const PRIVACY_ARTICLES = [
  {
    title: "수집하는 개인정보",
    body: "로그인과 서비스 제공을 위해 필요한 최소 정보를 수집합니다.",
  },
  {
    title: "개인정보 이용 목적",
    body: "계정 관리, 서비스 제공과 사용자 문의 응대에 이용합니다.",
  },
  {
    title: "보관 및 파기",
    body: "보관 기간 종료 또는 회원 탈퇴 시 정책에 따라 파기합니다.",
  },
  {
    title: "사용자 권리",
    body: "개인정보 열람·수정·삭제와 처리 정지를 요청할 수 있습니다.",
  },
] as const;

export default function PrivacyScreen() {
  return (
    <LegalDocumentScreen
      articles={PRIVACY_ARTICLES}
      title="개인정보 처리방침"
      version="v1.0 · 2026.08.28 시행"
    />
  );
}
