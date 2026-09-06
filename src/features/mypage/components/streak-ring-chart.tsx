import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";

const SIZE = 140;
const TICK_COUNT = 60;

// ponytail: react-native-svg needs a native rebuild to link into the dev
// client (confirmed live in the simulator — it renders as "Unimplemented
// component"), so this ring is a dial of rotated tick marks instead of a
// true arc. Good enough at this size; swap for an SvgPolyline arc once the
// app next goes through a native rebuild anyway.
function TickRing({
  size,
  strokeWidth,
  percent,
  color,
  trackColor,
}: {
  size: number;
  strokeWidth: number;
  percent: number;
  color: string;
  trackColor: string;
}) {
  const filledCount = Math.round((Math.min(percent, 100) / 100) * TICK_COUNT);

  return (
    <View
      className="absolute items-center justify-center"
      style={{
        height: size,
        width: size,
        top: (SIZE - size) / 2,
        left: (SIZE - size) / 2,
      }}
    >
      {Array.from({ length: TICK_COUNT }, (_, index) => (
        <View
          key={index}
          style={{
            position: "absolute",
            height: size,
            width: size,
            alignItems: "center",
            transform: [{ rotate: `${(index * 360) / TICK_COUNT}deg` }],
          }}
        >
          <View
            style={{
              width: 3,
              height: strokeWidth,
              borderRadius: 2,
              backgroundColor: index < filledCount ? color : trackColor,
            }}
          />
        </View>
      ))}
    </View>
  );
}

type StreakRingChartProps = {
  thisMonthPercent: number;
  lastMonthPercent: number;
};

export function StreakRingChart({
  thisMonthPercent,
  lastMonthPercent,
}: StreakRingChartProps) {
  return (
    <View
      className="items-center justify-center"
      style={{ height: SIZE, width: SIZE }}
    >
      <TickRing
        color="#191f28"
        percent={thisMonthPercent}
        size={SIZE}
        strokeWidth={10}
        trackColor="#f2f4f6"
      />
      <TickRing
        color="#d1d6db"
        percent={lastMonthPercent}
        size={SIZE - 48}
        strokeWidth={8}
        trackColor="#f2f4f6"
      />
      <View className="absolute items-center">
        <ThemedText themeColor="textSecondary" typography="caption-2-regular">
          이번 달
        </ThemedText>
        <ThemedText typography="title-3-bold">{thisMonthPercent}%</ThemedText>
      </View>
    </View>
  );
}
