import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";

type SettingsHeaderProps = {
  title: string;
  onBack: () => void;
  // "default": 기존 헤더(회원 탈퇴·프로필 수정 등 아직 새 디자인이 없는
  // 화면). "settingsNav": Figma "Settings / Navigation Header"(4850:25845)
  // — 설정 메인·계정·알림·미션 수신 시간·앱 권한 화면에서 명시적으로 쓴다.
  variant?: "default" | "settingsNav";
};

export const SETTINGS_HEADER_HEIGHT = 72;
// 상세 화면(계정/알림/미션 수신 시간/권한)의 safe-area·헤더 배경. Figma는
// charcoal/0(#fafafa)이지만 토큰 파일에는 charcoal/1부터만 있어 여기서 정의한다.
export const SETTINGS_CHROME_BACKGROUND = "#fafafa";

// settingsNav — 72px 높이, 왼쪽 20px에 48x48 뒤로가기 터치 영역, 그 안 가운데
// 10x17 뒤로가기 glyph. 제목은 화면 전체 폭 기준 가운데(heading/1/bold,
// charcoal/11)라 오른쪽 버튼이 없어도 한쪽으로 밀리지 않도록 absolute로
// 얹는다. 뒤로가기 glyph는 온보딩 TopNav와 같은 path라
// assets/signup/icon-back.svg를 그대로 쓴다.
const BACK_TOUCH_SIZE = 48;
const BACK_TOUCH_LEFT = 20;
const BACK_ICON_WIDTH = 10;
const BACK_ICON_HEIGHT = 17;
const TITLE_LINE_HEIGHT = 24;

export function SettingsHeader({
  title,
  onBack,
  variant = "default",
}: SettingsHeaderProps) {
  if (variant === "settingsNav") {
    return (
      <View style={styles.navHeader}>
        <ThemedText
          numberOfLines={1}
          style={styles.navTitle}
          typography="heading-1-bold"
        >
          {title}
        </ThemedText>
        <Pressable
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={styles.navBackButton}
        >
          <Image
            contentFit="contain"
            source={require("@/assets/signup/icon-back.svg")}
            style={styles.navBackIcon}
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        <Pressable
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onBack}
          style={styles.backButton}
        >
          <Ionicons
            color={semanticColors["label-normal"]}
            name="chevron-back"
            size={20}
          />
        </Pressable>
      </View>
      <ThemedText typography="body-1-medium">{title}</ThemedText>
      <View style={styles.headerSide} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: SETTINGS_HEADER_HEIGHT,
    paddingHorizontal: 24,
  },
  backButton: {
    alignItems: "flex-start",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerSide: {
    flex: 1,
  },
  navHeader: {
    height: SETTINGS_HEADER_HEIGHT,
    width: "100%",
  },
  navTitle: {
    color: primitiveColors.charcoal["11"],
    left: BACK_TOUCH_LEFT + BACK_TOUCH_SIZE,
    position: "absolute",
    right: BACK_TOUCH_LEFT + BACK_TOUCH_SIZE,
    textAlign: "center",
    top: (SETTINGS_HEADER_HEIGHT - TITLE_LINE_HEIGHT) / 2,
  },
  navBackButton: {
    alignItems: "center",
    height: BACK_TOUCH_SIZE,
    justifyContent: "center",
    left: BACK_TOUCH_LEFT,
    position: "absolute",
    top: (SETTINGS_HEADER_HEIGHT - BACK_TOUCH_SIZE) / 2,
    width: BACK_TOUCH_SIZE,
  },
  navBackIcon: {
    height: BACK_ICON_HEIGHT,
    width: BACK_ICON_WIDTH,
  },
});
