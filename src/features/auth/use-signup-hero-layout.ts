import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SIGNUP_HEADER_HEIGHT, isSignupWideLayout } from "./signup-ui";

// profile-photo / signup-complete의 가운데 콘텐츠(아바타 + 문구) 배치.
// Figma는 이 블록을 화면 전체 높이 기준 `50% - offset`에 세로 중심을 두는데
// (4501:44992: top calc(50% - 54px) + translateY(-50%)), 실제 화면에서는
// status bar·TopNav 아래 flex 영역 안에 그리므로 그 영역의 시작점을 빼서
// marginTop으로 환산한다 — 기기 높이가 달라져도 Figma와 같은 비율 위치가 된다.
export function useSignupHeroLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const areaTop = insets.top + SIGNUP_HEADER_HEIGHT;

  return {
    isWide: isSignupWideLayout(width),
    heroMarginTop: (contentHeight: number, centerOffset: number) =>
      Math.max(0, height / 2 - centerOffset - contentHeight / 2 - areaTop),
  };
}
