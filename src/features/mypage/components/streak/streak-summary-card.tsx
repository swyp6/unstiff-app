import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";

type StreakSummaryCardProps = {
  currentStreakDays: number;
};

export function StreakSummaryCard({
  currentStreakDays,
}: StreakSummaryCardProps) {
  return (
    <View style={styles.card}>
      <View>
        <ThemedText themeColor="textSecondary" typography="caption-1-regular">
          현재 연속 기록
        </ThemedText>
        <ThemedText style={styles.days} typography="title-3-bold">
          {currentStreakDays}일
        </ThemedText>
      </View>

      <View style={styles.iconBadge}>
        <Ionicons
          color={semanticColors["primary-normal"]}
          name="flame"
          size={22}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-subtle"],
    borderRadius: radius.default * 2,
    borderWidth: 1,
    flexDirection: "row",
    height: 88,
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },
  days: {
    color: semanticColors["label-normal"],
    marginTop: 4,
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-strong"],
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
});
