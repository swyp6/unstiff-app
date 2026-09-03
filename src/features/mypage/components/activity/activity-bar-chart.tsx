import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";
import { WEEKDAY_LABELS } from "@/features/mypage/mock-data";

const PERIODS = ["주", "달", "년"] as const;
type Period = (typeof PERIODS)[number];

type ActivityBarChartProps = {
  totalDays: number;
  deltaLabel: string;
  weekly: readonly number[];
};

const BAR_AREA_HEIGHT = 96;

export function ActivityBarChart({
  totalDays,
  deltaLabel,
  weekly,
}: ActivityBarChartProps) {
  const maxValue = Math.max(...weekly, 1);
  const peakIndex = weekly.indexOf(Math.max(...weekly));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText typography="body-2-bold">활동 요약</ThemedText>
        <PeriodSelector />
      </View>

      <View style={styles.totalsRow}>
        <View>
          <ThemedText themeColor="textSecondary" typography="caption-1-regular">
            총 활동
          </ThemedText>
          <ThemedText style={styles.totalDays} typography="title-3-bold">
            {totalDays}일
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary" typography="caption-1-regular">
          {deltaLabel}
        </ThemedText>
      </View>

      <View style={styles.chartRow}>
        {weekly.map((value, index) => {
          const height = Math.max((value / maxValue) * BAR_AREA_HEIGHT, 4);
          const isPeak = index === peakIndex && value > 0;
          return (
            <View key={index} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height },
                    isPeak ? styles.barPeak : styles.barNormal,
                  ]}
                />
              </View>
              <ThemedText
                themeColor="textSecondary"
                typography="caption-1-regular"
              >
                {WEEKDAY_LABELS[index]}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function PeriodSelector() {
  // Only weekly mock data exists so far — 달/년 are shown but not wired up.
  const selected: Period = PERIODS[0];

  return (
    <View style={styles.periodSelector}>
      {PERIODS.map((period) => (
        <Pressable
          accessibilityLabel={period}
          accessibilityRole="button"
          accessibilityState={{ selected: period === selected }}
          key={period}
          style={[
            styles.periodButton,
            period === selected && styles.periodButtonActive,
          ]}
        >
          <ThemedText
            themeColor={period === selected ? "text" : "textSecondary"}
            typography={
              period === selected ? "caption-1-bold" : "caption-1-regular"
            }
          >
            {period}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-subtle"],
    borderRadius: radius.default * 2,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  periodSelector: {
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: 8,
    flexDirection: "row",
    padding: 2,
  },
  periodButton: {
    alignItems: "center",
    borderRadius: 6,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  periodButtonActive: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-normal"],
    borderWidth: 1,
  },
  totalsRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalDays: {
    color: semanticColors["label-normal"],
    marginTop: 4,
  },
  chartRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  barTrack: {
    height: BAR_AREA_HEIGHT,
    justifyContent: "flex-end",
    width: "100%",
  },
  bar: {
    alignSelf: "center",
    borderRadius: 4,
    width: 22,
  },
  barNormal: {
    backgroundColor: semanticColors["fill-strong"],
  },
  barPeak: {
    backgroundColor: semanticColors["primary-strong"],
  },
});
