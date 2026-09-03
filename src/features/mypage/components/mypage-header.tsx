import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

type MyPageHeaderProps = {
  onPressSettings: () => void;
};

// 탭 루트 화면이라 뒤로가기 버튼은 없음 — SettingsHeader와 높이/여백 컨벤션만 맞춘다.
export function MyPageHeader({ onPressSettings }: MyPageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide} />
      <ThemedText typography="body-1-medium">마이페이지</ThemedText>
      <View style={styles.headerSide}>
        <Pressable
          accessibilityLabel="설정"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onPressSettings}
          style={styles.settingsButton}
        >
          <Ionicons
            color={semanticColors["label-normal"]}
            name="settings-outline"
            size={20}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 72,
    paddingHorizontal: 24,
  },
  headerSide: {
    flex: 1,
  },
  settingsButton: {
    alignItems: "flex-end",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
});
