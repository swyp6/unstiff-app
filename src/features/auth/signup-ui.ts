import { primitiveColors, semanticColors } from "@/constants/tokens";

// Figma 회원가입/프로필 설정 화면(4501:44638 ~ 4501:44986)이 쓰는 색을 현재
// 토큰에 매핑한 것. Figma 변수명(charcoal/11 등)이 semanticColors의 label-*
// 값(#191f28 계열)과 달라서 primitive charcoal 팔레트로 직접 잇는다.
export const signupColors = {
  // charcoal/11
  text: primitiveColors.charcoal["11"],
  // charcoal/5
  textSubtle: primitiveColors.charcoal["5"],
  // charcoal/9 — Field 포커스 테두리
  fieldFocusBorder: primitiveColors.charcoal["9"],
  // charcoal/3 — Circle / 미완료 테두리, 등록 완료 아바타 placeholder
  circleBorder: primitiveColors.charcoal["3"],
  // charcoal/1 — divider, 비활성 CTA, 아바타 배경, 사진 셀
  fill: primitiveColors.charcoal["1"],
  // charcoal/0 — Field 배경. tokens.ts(자동 생성)에는 charcoal 팔레트가 1부터
  // 시작해 이 값이 없어 sync 전까지 여기서만 들고 있는다.
  fieldBackground: "#fafafa",
  // brand/primary
  primary: primitiveColors.orange["500"],
  positive: semanticColors["status-positive-normal"],
  negative: semanticColors["status-negative-normal"],
  white: semanticColors["background-normal"],
} as const;

// Figma 375x812 / 402x874 두 프레임에서 콘텐츠·CTA 폭이 모두 335로 고정돼
// 있다(375: 좌우 20, 402: 좌우 33~34). 좌우 20 padding을 포함한 최대 폭을
// 375로 잡고 가운데 정렬하면 두 프레임 모두 Figma 위치와 같아진다.
export const SIGNUP_CONTENT_MAX_WIDTH = 335;
export const SIGNUP_HORIZONTAL_PADDING = 20;
export const SIGNUP_CONTAINER_MAX_WIDTH =
  SIGNUP_CONTENT_MAX_WIDTH + SIGNUP_HORIZONTAL_PADDING * 2;

// WF/Signup/TopNav — status bar 아래 52px.
export const SIGNUP_HEADER_HEIGHT = 52;

// Button / CTA — py 16 + lineHeight 22 = 54.
export const SIGNUP_CTA_HEIGHT = 54;
// Figma의 CTA bottom 52는 34px home indicator를 포함한 값이라, 실제 bottom
// safe inset 위로는 18px이 남는다.
export const SIGNUP_CTA_BOTTOM_GAP = 18;

// Figma 402 프레임(iPhone 17)과 375 프레임(AC-02-02-i)이 프로필 아바타 블록을
// 서로 다른 크기(152 / 120)로 그린다. 두 프레임 사이 어디서 갈릴지는 Figma에
// 없어서 402에 가까운 390(iPhone 14/15/16 기본 폭)부터 큰 쪽을 쓴다.
export const SIGNUP_WIDE_LAYOUT_MIN_WIDTH = 390;

export function isSignupWideLayout(windowWidth: number) {
  return windowWidth >= SIGNUP_WIDE_LAYOUT_MIN_WIDTH;
}
