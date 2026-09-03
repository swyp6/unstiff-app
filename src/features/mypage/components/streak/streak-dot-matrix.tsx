import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";
import { WEEKDAY_LABELS } from "@/features/mypage/mock-data";

type StreakWeek = {
  label: string;
  recorded: readonly boolean[];
};

type StreakDotMatrixProps = {
  weeks: readonly StreakWeek[];
};

function Dot({ recorded }: { recorded: boolean }) {
  return (
    <View style={styles.dotCell}>
      <View
        style={[styles.dot, recorded ? styles.dotRecorded : styles.dotEmpty]}
      />
    </View>
  );
}

export function StreakDotMatrix({ weeks }: StreakDotMatrixProps) {
  return (
    <View style={styles.card}>
      <ThemedText typography="body-2-bold">이번달 기록</ThemedText>

      <View style={styles.weekdayRow}>
        <View style={styles.weekLabelSpacer} />
        {WEEKDAY_LABELS.map((weekday) => (
          <View key={weekday} style={styles.dotCell}>
            <ThemedText
              themeColor="textSecondary"
              typography="caption-2-medium"
            >
              {weekday}
            </ThemedText>
          </View>
        ))}
      </View>

      {weeks.map((week) => (
        <View key={week.label} style={styles.weekRow}>
          <View style={styles.weekLabelSpacer}>
            <ThemedText
              themeColor="textSecondary"
              typography="caption-2-medium"
            >
              {week.label}
            </ThemedText>
          </View>
          {week.recorded.map((recorded, index) => (
            <Dot key={index} recorded={recorded} />
          ))}
        </View>
      ))}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.dotRecorded]} />
          <ThemedText themeColor="textSecondary" typography="caption-2-medium">
            기록
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.dotEmpty]} />
          <ThemedText themeColor="textSecondary" typography="caption-2-medium">
            미기록
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const CELL_SIZE = 24;

const styles = StyleSheet.create({
  card: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-subtle"],
    borderRadius: radius.default * 2,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  weekdayRow: {
    flexDirection: "row",
  },
  weekRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  weekLabelSpacer: {
    justifyContent: "center",
    width: 44,
  },
  dotCell: {
    alignItems: "center",
    justifyContent: "center",
    width: CELL_SIZE,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dotRecorded: {
    backgroundColor: semanticColors["primary-strong"],
  },
  dotEmpty: {
    backgroundColor: semanticColors["fill-strong"],
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "flex-end",
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
});
