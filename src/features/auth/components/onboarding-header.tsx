import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { SIGNUP_HEADER_HEIGHT, signupColors } from "@/features/auth/signup-ui";

type OnboardingHeaderProps = {
  title: string;
  // Omit for a screen with no back path (e.g. signup-complete, which Figma
  // gives no back button — it's the end of the flow).
  onBack?: () => void;
};

// Figma WF/Signup/TopNav (예: 4501:44640) — 52px 높이, 왼쪽 8px에 48x48
// BackTouch(top 2), 그 안 (19, 15.5)에 10x17 Icon/Back, 제목은 화면 가운데
// heading/1/bold(18/24)로 top 15. 화면 폭(375/402)과 무관하게 동일하다.
const BACK_TOUCH_SIZE = 48;
const BACK_ICON_WIDTH = 10;
const BACK_ICON_HEIGHT = 17;
const TITLE_TOP = 15;
const TITLE_LINE_HEIGHT = 24;

export function OnboardingHeader({ title, onBack }: OnboardingHeaderProps) {
  return (
    <View style={styles.header}>
      <ThemedText
        numberOfLines={1}
        style={styles.headerTitle}
        typography="heading-1-bold"
      >
        {title}
      </ThemedText>
      {onBack && (
        <Pressable
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          onPress={onBack}
          style={styles.backButton}
        >
          <Image
            contentFit="contain"
            source={require("@/assets/signup/icon-back.svg")}
            style={styles.backIcon}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: SIGNUP_HEADER_HEIGHT,
    width: "100%",
  },
  // 제목을 화면 전체 폭 기준으로 가운데 두고(BackTouch 폭에 영향받지 않게)
  // 그 위에 back 버튼을 absolute로 얹는다.
  headerTitle: {
    color: signupColors.text,
    left: BACK_TOUCH_SIZE + 8,
    position: "absolute",
    right: BACK_TOUCH_SIZE + 8,
    textAlign: "center",
    top: TITLE_TOP,
    lineHeight: TITLE_LINE_HEIGHT,
  },
  backButton: {
    alignItems: "center",
    height: BACK_TOUCH_SIZE,
    justifyContent: "center",
    left: 8,
    position: "absolute",
    top: (SIGNUP_HEADER_HEIGHT - BACK_TOUCH_SIZE) / 2,
    width: BACK_TOUCH_SIZE,
  },
  backIcon: {
    height: BACK_ICON_HEIGHT,
    width: BACK_ICON_WIDTH,
  },
});
