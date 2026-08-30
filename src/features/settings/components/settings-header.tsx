import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

type SettingsHeaderProps = {
  title: string;
  onBack: () => void;
};

export function SettingsHeader({ title, onBack }: SettingsHeaderProps) {
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
    height: 72,
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
});
