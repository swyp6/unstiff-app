import type { Badge } from "./types";

// #220 — 백엔드 뱃지 API가 아직 없어 UI 먼저 만들기 위한 mock. 실제 연동
// 시 이 파일 대신 api.ts의 GET 응답을 Badge[]로 매핑해 쓰고, 이 파일은
// 지운다. name/conditionSummary/conditionLabel/이미지는 Figma
// (node-id=6041-17997 등)에 있는 값 그대로다 — description(부제)은
// "작심탈출"만 Figma에 있고 나머지 8개는 아직 카피가 없어 빈 문자열로
// 둔다(뱃지 상세 UI는 description이 없으면 그 줄을 생략한다).
export const MOCK_BADGES: Badge[] = [
  {
    // 획득 전 → 축하 화면 → 획득 후 플로우를 눈으로 확인하려고 이 하나만
    // 미획득 + 조건 충족(3/3)으로 둔다. image는 잠금 상태에선 안 쓰이지만
    // (earned가 false면 항상 잠금 아이콘) badges-store.earnBadge()가 획득
    // 처리할 때 그대로 쓸 수 있게 미리 채워둔다.
    conditionLabel: "3일 연속 운동이나 미션 완료",
    conditionSummary: "3일 연속",
    description: "이번엔 진짜 작심삼일 탈출",
    earned: false,
    earnedAt: null,
    id: "jaksim-talchul",
    image: require("@/assets/mypage/badges/badge-jaksim-talchul.png"),
    name: "작심탈출",
    progress: { current: 3, target: 3 },
  },
  {
    conditionLabel: "운동 사진 10장 기록",
    conditionSummary: "사진 10장",
    description: "",
    earned: true,
    earnedAt: "2026-09-12",
    id: "workout-cut",
    image: require("@/assets/mypage/badges/badge-workout-cut.png"),
    name: "운동 한 컷",
    progress: null,
  },
  {
    conditionLabel: "루틴 3개 만들기",
    conditionSummary: "루틴 3개",
    description: "",
    earned: false,
    earnedAt: null,
    id: "routine-collector",
    image: require("@/assets/mypage/badges/badge-routine-collector.png"),
    name: "루틴 수집가",
    progress: { current: 1, target: 3 },
  },
  {
    conditionLabel: "대화 5회 나누기",
    conditionSummary: "대화 5회",
    description: "",
    earned: false,
    earnedAt: null,
    id: "getting-to-know",
    image: require("@/assets/mypage/badges/badge-getting-to-know.png"),
    name: "서로 알아가는 중",
    progress: null,
  },
  {
    conditionLabel: "대화 10회 나누기",
    conditionSummary: "대화 10회",
    description: "",
    earned: false,
    earnedAt: null,
    id: "pretty-close-now",
    image: require("@/assets/mypage/badges/badge-pretty-close-now.png"),
    name: "이제 제법 친함",
    progress: null,
  },
  {
    conditionLabel: "운동 5종 기록",
    conditionSummary: "운동 5종",
    description: "",
    earned: false,
    earnedAt: null,
    id: "workout-challenger",
    image: require("@/assets/mypage/badges/badge-workout-challenger.png"),
    name: "운동 챌린저",
    progress: null,
  },
  {
    conditionLabel: "미션 5회 완료",
    conditionSummary: "미션 5회",
    description: "",
    earned: false,
    earnedAt: null,
    id: "mission-maker",
    image: require("@/assets/mypage/badges/badge-mission-maker.png"),
    name: "미션 메이커",
    progress: null,
  },
  {
    conditionLabel: "루틴 5회 수행",
    conditionSummary: "루틴 5회",
    description: "",
    earned: false,
    earnedAt: null,
    // 디자이너가 넘겨준 원본 파일명은 "미션 마스터.png" — 이 뱃지(루틴 장착)
    // 말고는 대응하는 슬롯이 없어 여기 배정했다. 이름이 안 맞으면 확인 필요.
    id: "routine-equipped",
    image: require("@/assets/mypage/badges/badge-routine-equipped.png"),
    name: "루틴 장착",
    progress: null,
  },
  {
    conditionLabel: "즉흥 기록 5회",
    conditionSummary: "즉흥 5회",
    description: "",
    earned: false,
    earnedAt: null,
    id: "action-maker",
    image: require("@/assets/mypage/badges/badge-action-maker.png"),
    name: "액션 메이커",
    progress: null,
  },
];
