import type { Badge, BadgeCatalogEntry } from "./types";

// GET /api/v1/badges, GET /api/v1/badges/{code} 설명에 있는 code ↔ 뱃지
// 대응표 그대로 — 서버는 번호만 주고 이미지/문구는 앱이 들고 있는다. 번호는
// 뱃지명이 바뀌어도 그대로라고 스웨거에 명시돼 있다. description(부제)은
// "작심탈출"만 Figma에 카피가 있고 나머지 8개는 아직 없어 빈 문자열로
// 둔다(뱃지 상세 UI는 description이 없으면 그 줄을 생략한다).
export const BADGE_CATALOG: Record<number, BadgeCatalogEntry> = {
  1: {
    code: 1,
    conditionLabel: "3일 연속 운동이나 미션 완료",
    conditionSummary: "3일 연속",
    description: "이번엔 진짜 작심삼일 탈출",
    image: require("@/assets/mypage/badges/badge-jaksim-talchul.png"),
    name: "작심탈출",
  },
  2: {
    code: 2,
    conditionLabel: "루틴 3개 이상 등록",
    conditionSummary: "루틴 3개",
    description: "",
    image: require("@/assets/mypage/badges/badge-routine-collector.png"),
    name: "루틴 수집가",
  },
  3: {
    code: 3,
    conditionLabel: "데일리 디스커버리 5회 연속 완료",
    conditionSummary: "디스커버리 5회",
    description: "",
    image: require("@/assets/mypage/badges/badge-getting-to-know.png"),
    name: "서로 알아가는 중",
  },
  4: {
    code: 4,
    conditionLabel: "데일리 디스커버리 10회 연속 완료",
    conditionSummary: "디스커버리 10회",
    description: "",
    image: require("@/assets/mypage/badges/badge-pretty-close-now.png"),
    name: "이제 제법 친함",
  },
  5: {
    code: 5,
    conditionLabel: "서로 다른 운동 종류 5개 완료",
    conditionSummary: "운동 5종",
    description: "",
    image: require("@/assets/mypage/badges/badge-workout-challenger.png"),
    name: "운동 챌린저",
  },
  6: {
    code: 6,
    conditionLabel: "오늘의 미션 5회 연속 완료",
    conditionSummary: "미션 5회",
    description: "",
    image: require("@/assets/mypage/badges/badge-mission-maker.png"),
    name: "미션 메이커",
  },
  7: {
    code: 7,
    conditionLabel: "오늘의 미션 10회 연속 완료",
    conditionSummary: "미션 10회",
    description: "",
    image: require("@/assets/mypage/badges/badge-mission-master.png"),
    name: "미션 마스터",
  },
  8: {
    code: 8,
    conditionLabel: "운동 계획 없이 바로 운동 기록 5회",
    conditionSummary: "즉흥 기록 5회",
    description: "",
    image: require("@/assets/mypage/badges/badge-action-maker.png"),
    name: "액션 메이커",
  },
  9: {
    code: 9,
    conditionLabel: "사진을 첨부한 운동 기록 10회",
    conditionSummary: "사진 10장",
    description: "",
    image: require("@/assets/mypage/badges/badge-workout-cut.png"),
    name: "운동 한 컷",
  },
};

// newBadges(신규 획득 code 배열)를 축하 화면에 보여줄 Badge로 바꾼다.
// 서버는 code만 주고 획득 시각을 따로 주지 않으므로, 막 획득한 시점(지금)을
// 그대로 쓴다.
export function badgeFromCode(code: number, earnedAt: string): Badge {
  return {
    ...BADGE_CATALOG[code],
    earned: true,
    earnedAt,
    progress: null,
  };
}

// earnedAt(ISO date-time, 예: "2026-08-30T21:14:03.120+09:00")을 화면
// 표기용 "2026. 08. 30"으로. 날짜 부분(앞 10자)만 쓰고 시각은 버린다.
export function formatBadgeEarnedDate(earnedAt: string): string {
  return earnedAt.slice(0, 10).replaceAll("-", ". ");
}
