export const AI_NAME = "찌뿌둥";

export const INITIAL_GREETING =
  "안녕! 나는 찌뿌둥이야. 오늘 몸 상태는 좀 어때? 편하게 얘기해줘 🙂";

// 백엔드 채팅 API가 아직 없어서, 실제 응답을 흉내내는 목업 답장 풀 — API 연동 시
// chat-store.ts의 sendMessage 구현만 교체하면 된다.
export const MOCK_REPLIES = [
  "오 그렇구나! 조금씩 몸을 풀어주는 게 좋을 것 같아.",
  "요즘 스트레칭은 잘 챙기고 있어?",
  "무리하지 말고 천천히 해보자, 내가 옆에서 챙겨줄게.",
  "좋아! 그 페이스 그대로 유지해보자.",
  "혹시 어깨나 목이 뻐근하지는 않아?",
  "잘하고 있어! 오늘도 화이팅이야 💪",
  "음... 조금 더 자세히 얘기해줄 수 있어?",
];

export const TYPING_DELAY_MIN_MS = 800;
export const TYPING_DELAY_MAX_MS = 1600;
