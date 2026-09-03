import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";

type ActivityCompositionCardProps = {
  workoutPlanCount: number;
  dailyMissionCount: number;
};

export function ActivityCompositionCard({
  workoutPlanCount,
  dailyMissionCount,
}: ActivityCompositionCardProps) {
  return (
    <View style={styles.card}>
      <ThemedText typography="body-2-bold">활동 구성</ThemedText>
      <View style={styles.row}>
        <View style={styles.column}>
          <ThemedText themeColor="textSecondary" typography="caption-1-regular">
            운동 계획
          </ThemedText>
          <ThemedText style={styles.value} typography="heading-1-bold">
            {workoutPlanCount}회
          </ThemedText>
        </View>
        <View style={styles.divider} />
        <View style={styles.column}>
          <ThemedText themeColor="textSecondary" typography="caption-1-regular">
            데일리 미션
          </ThemedText>
          <ThemedText style={styles.value} typography="heading-1-bold">
            {dailyMissionCount}회
          </ThemedText>
        </View>
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
  row: {
    flexDirection: "row",
  },
  column: {
    flex: 1,
    gap: 6,
  },
  divider: {
    backgroundColor: semanticColors["line-subtle"],
    marginRight: 16,
    width: 1,
  },
  value: {
    color: semanticColors["label-normal"],
  },
});
