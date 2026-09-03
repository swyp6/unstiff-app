import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, radius, semanticColors } from "@/constants/tokens";

const SIZE = 140;
const STROKE = 10;
const CENTER = SIZE / 2;
const OUTER_RADIUS = CENTER - STROKE / 2;
const INNER_RADIUS = OUTER_RADIUS - STROKE - 4;

const THIS_MONTH_COLOR = semanticColors["primary-strong"];
const LAST_MONTH_COLOR = primitiveColors.neutral["400"];

type StreakRingGraphProps = {
  monthLabel: string;
  thisMonthRate: number;
  lastMonthRate: number;
};

function RingProgress({
  radius: ringRadius,
  percent,
  color,
}: {
  radius: number;
  percent: number;
  color: string;
}) {
  const circumference = 2 * Math.PI * ringRadius;
  const offset = circumference * (1 - percent / 100);

  return (
    <>
      <Circle
        cx={CENTER}
        cy={CENTER}
        fill="none"
        r={ringRadius}
        stroke={semanticColors["fill-normal"]}
        strokeWidth={STROKE}
      />
      <Circle
        cx={CENTER}
        cy={CENTER}
        fill="none"
        r={ringRadius}
        stroke={color}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        strokeWidth={STROKE}
      />
    </>
  );
}

export function StreakRingGraph({
  monthLabel,
  thisMonthRate,
  lastMonthRate,
}: StreakRingGraphProps) {
  return (
    <View style={styles.card}>
      <View style={styles.monthNav}>
        {/* Only one month of mock data exists yet, so navigation is a no-op for now. */}
        <Ionicons
          color={semanticColors["label-disabled"]}
          name="chevron-back"
          size={16}
        />
        <ThemedText typography="body-2-bold">{monthLabel}</ThemedText>
        <Ionicons
          color={semanticColors["label-disabled"]}
          name="chevron-forward"
          size={16}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.ringWrap}>
        <Svg height={SIZE} style={styles.ringRotate} width={SIZE}>
          <RingProgress
            color={THIS_MONTH_COLOR}
            percent={thisMonthRate}
            radius={OUTER_RADIUS}
          />
          <RingProgress
            color={LAST_MONTH_COLOR}
            percent={lastMonthRate}
            radius={INNER_RADIUS}
          />
        </Svg>

        <View style={styles.ringCenter} pointerEvents="none">
          <ThemedText themeColor="textSecondary" typography="caption-2-regular">
            이번 달
          </ThemedText>
          <ThemedText style={styles.ringPercent} typography="title-3-bold">
            {thisMonthRate}%
          </ThemedText>
          <ThemedText themeColor="textSecondary" typography="caption-2-regular">
            기록률
          </ThemedText>
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: THIS_MONTH_COLOR }]}
          />
          <ThemedText themeColor="textSecondary" typography="caption-2-regular">
            이번달 {thisMonthRate}%
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: LAST_MONTH_COLOR }]}
          />
          <ThemedText themeColor="textSecondary" typography="caption-2-regular">
            지난달 {lastMonthRate}%
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
    paddingBottom: 20,
    paddingTop: 16,
  },
  monthNav: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  divider: {
    backgroundColor: semanticColors["line-subtle"],
    height: 1,
    marginTop: 16,
    width: "100%",
  },
  ringWrap: {
    alignItems: "center",
    alignSelf: "center",
    height: SIZE,
    justifyContent: "center",
    marginTop: 16,
    width: SIZE,
  },
  ringRotate: {
    transform: [{ rotate: "-90deg" }],
  },
  ringCenter: {
    alignItems: "center",
    position: "absolute",
  },
  ringPercent: {
    color: semanticColors["label-normal"],
    marginVertical: 2,
  },
  legend: {
    flexDirection: "row",
    gap: 24,
    justifyContent: "center",
    marginTop: 16,
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  legendDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
});
