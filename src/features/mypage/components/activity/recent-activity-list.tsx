import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";

type RecentActivityItem = {
  date: string;
  type: string;
  detail: string;
};

type RecentActivityListProps = {
  items: readonly RecentActivityItem[];
};

export function RecentActivityList({ items }: RecentActivityListProps) {
  return (
    <View style={styles.card}>
      <ThemedText typography="body-2-bold">최근 활동</ThemedText>
      <View style={styles.list}>
        {items.map((item) => (
          <View key={`${item.date}-${item.type}`} style={styles.row}>
            <ThemedText style={styles.date} typography="caption-1-regular">
              {item.date}
            </ThemedText>
            <View style={styles.rowDivider} />
            <ThemedText style={styles.rowText} typography="caption-1-regular">
              {item.type}
            </ThemedText>
            <View style={styles.rowDivider} />
            <ThemedText style={styles.rowText} typography="caption-1-regular">
              {item.detail}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-subtle"],
    borderRadius: radius.default * 2,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  list: {
    gap: 8,
  },
  row: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-subtle"],
    borderColor: semanticColors["line-normal"],
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    height: 32,
    paddingHorizontal: 12,
  },
  date: {
    color: semanticColors["label-disabled"],
  },
  rowDivider: {
    backgroundColor: semanticColors["line-normal"],
    height: 12,
    width: 1,
  },
  rowText: {
    color: semanticColors["label-subtle"],
  },
});
