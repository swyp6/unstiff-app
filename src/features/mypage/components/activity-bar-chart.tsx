import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";

const CHART_HEIGHT = 100;

function Bar({ value, active }: { value: number; active: boolean }) {
  return (
    <View
      className={`w-[51px] rounded-t-sm ${active ? "bg-primary-strong" : "bg-fill-strong"}`}
      style={{ height: (Math.min(value, 100) / 100) * CHART_HEIGHT }}
    />
  );
}

type ActivityBarChartProps = {
  previousValue: number;
  currentValue: number;
};

export function ActivityBarChart({
  previousValue,
  currentValue,
}: ActivityBarChartProps) {
  const steps = [100, 80, 60, 40, 20, 0];

  return (
    <View className="flex-row" style={{ height: CHART_HEIGHT }}>
      <View
        className="justify-between pr-2"
        style={{ width: 28, height: CHART_HEIGHT }}
      >
        {steps.map((step) => (
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
      <View className="flex-1 flex-row items-end justify-center gap-6">
        <Bar active={false} value={previousValue} />
        <Bar active value={currentValue} />
      </View>
    </View>
  );
}
