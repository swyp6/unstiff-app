import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import {
  SIGNUP_CONTAINER_MAX_WIDTH,
  SIGNUP_CTA_BOTTOM_GAP,
  SIGNUP_HORIZONTAL_PADDING,
} from "@/features/auth/signup-ui";

type OnboardingContentProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Figma 375 프레임은 콘텐츠를 좌우 20으로, 402 프레임은 335 폭으로 가운데
// 둔다 — 둘 다 "20 padding 포함 최대 375, 가운데 정렬"로 같은 결과가 나온다.
export function OnboardingContent({ children, style }: OnboardingContentProps) {
  return <View style={[styles.content, style]}>{children}</View>;
}

// Bottom CTA 영역. Figma의 CTA bottom 52는 34px home indicator를 포함한
// 값이라 bottom safe inset(SafeAreaView edges에 bottom 포함) 위로 18을 둔다.
// gap을 줄 때(사진 앨범 화면의 pb 50 → 16)는 bottomGap으로 덮어쓴다.
type OnboardingFooterProps = OnboardingContentProps & {
  bottomGap?: number;
};

export function OnboardingFooter({
  children,
  style,
  bottomGap = SIGNUP_CTA_BOTTOM_GAP,
}: OnboardingFooterProps) {
  return (
    <View style={[styles.content, { paddingBottom: bottomGap }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    maxWidth: SIGNUP_CONTAINER_MAX_WIDTH,
    paddingHorizontal: SIGNUP_HORIZONTAL_PADDING,
    width: "100%",
  },
});
