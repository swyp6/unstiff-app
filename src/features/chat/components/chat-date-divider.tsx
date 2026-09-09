import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";

type ChatDateDividerProps = {
  label: string;
};

export function ChatDateDivider({ label }: ChatDateDividerProps) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <ThemedText style={styles.label} typography="caption-2-regular">
        {label}
      </ThemedText>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    height: 49,
    paddingHorizontal: 20,
  },
  line: {
    backgroundColor: semanticColors["line-normal"],
    flex: 1,
    height: 1,
  },
  label: {
    color: primitiveColors.charcoal["4"],
  },
});
