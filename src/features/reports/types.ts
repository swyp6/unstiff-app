// POST /api/v1/complaints/ai-content — 오늘의 미션(MISSION)과 AI 캐릭터 답변
// (CHAT_MESSAGE) 둘 다 같은 엔드포인트를 쓴다. detail 구조는 서버가 강제하지
// 않고("앱이 정한 구조를 그대로 저장") 앱에서 정한 사유 코드 + 기타 입력이다.
export type AiContentReportRefType = "MISSION" | "CHAT_MESSAGE";

export type AiContentReportReason =
  "HARMFUL_CONTENT" | "DANGEROUS_EXERCISE_INFO" | "PERSONAL_INFO" | "OTHER";

export type AiContentComplaintRequest = {
  refType: AiContentReportRefType;
  refId: number;
  detail: { reason: AiContentReportReason; reasonText: string | null };
};
