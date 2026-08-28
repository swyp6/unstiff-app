import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

type SettingsRowProps = {
  title: string;
  destructive?: boolean;
  onPress?: () => void;
};

export function SettingsSectionLabel({ label }: { label: string }) {
  return (
    <ThemedText
      style={styles.sectionLabel}
      themeColor="textSecondary"
      typography="caption-1-medium"
    >
      {label}
    </ThemedText>
  );
}

export function SettingsRow({
  title,
  destructive = false,
  onPress,
}: SettingsRowProps) {
  return (
    <Pressable
      accessibilityLabel={onPress ? title : undefined}
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.rowText}>
        <ThemedText
          style={destructive ? styles.destructiveText : styles.normalText}
          typography="body-2-medium"
        >
          {title}
        </ThemedText>
      </View>
      <Ionicons
        color={semanticColors["label-disabled"]}
        name="chevron-forward"
        size={20}
      />
      <View style={styles.divider} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    lineHeight: 18,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    height: 56,
    paddingHorizontal: 16,
    position: "relative",
    width: "100%",
  },
  rowText: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  normalText: {
    color: semanticColors["label-normal"],
  },
  destructiveText: {
    color: semanticColors["status-negative-normal"],
  },
  divider: {
    backgroundColor: "#E2E6EC",
    bottom: 0,
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
  },
});
