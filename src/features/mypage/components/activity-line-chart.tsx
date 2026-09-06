import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";

const CHART_HEIGHT = 100;
const CHART_WIDTH = 280;
const Y_AXIS_STEPS = [100, 80, 60, 40, 20, 0];

function toPixelPoints(values: number[]) {
  const stepX = values.length > 1 ? CHART_WIDTH / (values.length - 1) : 0;
  return values.map((value, index) => ({
    x: index * stepX,
    y: CHART_HEIGHT - (Math.min(value, 100) / 100) * CHART_HEIGHT,
  }));
}

// ponytail: no svg linked into the dev client, so each segment is a
// rotated View "line" instead of an actual Polyline — see the note in
// streak-ring-chart.tsx.
function LineSegment({
  from,
  to,
  color,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const strokeWidth = 2;

  return (
    <View
      style={{
        position: "absolute",
        left: from.x,
        top: from.y,
        width: 0,
        height: 0,
        transform: [{ rotate: `${angle}deg` }],
      }}
    >
      <View
        style={{
          position: "absolute",
          left: 0,
          top: -strokeWidth / 2,
          width: length,
          height: strokeWidth,
          backgroundColor: color,
          borderRadius: strokeWidth / 2,
        }}
      />
    </View>
  );
}

function Series({ values, color }: { values: number[]; color: string }) {
  const points = toPixelPoints(values);
  return (
    <>
      {points.slice(1).map((point, index) => (
        <LineSegment
          color={color}
          from={points[index]}
          key={index}
          to={point}
        />
      ))}
    </>
  );
}

type ActivityLineChartProps = {
  current: number[];
  previous: number[];
};

export function ActivityLineChart({
  current,
  previous,
}: ActivityLineChartProps) {
  return (
    <View className="flex-row" style={{ height: CHART_HEIGHT }}>
      <View
        className="justify-between pr-2"
        style={{ width: 28, height: CHART_HEIGHT }}
      >
        {Y_AXIS_STEPS.map((step) => (
          <ThemedText
            key={step}
            style={{ textAlign: "right" }}
            themeColor="textDisabled"
            typography="caption-2-regular"
          >
            {step}
          </ThemedText>
        ))}
      </View>
      <View style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}>
        {Y_AXIS_STEPS.map((step) => (
          <View
            className="absolute border-t border-line-subtle"
            key={step}
            style={{
              top: CHART_HEIGHT - (step / 100) * CHART_HEIGHT,
              width: CHART_WIDTH,
            }}
          />
        ))}
        <Series color="#d1d6db" values={previous} />
        <Series color="#191f28" values={current} />
      </View>
    </View>
  );
}
