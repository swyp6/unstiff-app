import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { ActivityBarChart } from "@/features/mypage/components/activity-bar-chart";
import { ActivityLineChart } from "@/features/mypage/components/activity-line-chart";
import {
  type ActivityPeriod,
  MOCK_ACTIVITY_COMPARISON,
  MOCK_ACTIVITY_COMPOSITION,
  MOCK_ACTIVITY_SERIES,
  MOCK_RECENT_ACTIVITY,
} from "@/features/mypage/mock-data";

const PERIOD_OPTIONS: { key: ActivityPeriod; label: string }[] = [
  { key: "week", label: "주간" },
  { key: "month", label: "월간" },
  { key: "year", label: "연간" },
];

const LEGEND_LABEL: Record<ActivityPeriod, [string, string]> = {
  week: ["이번주", "저번주"],
  month: ["이번달", "저번달"],
  year: ["올해", "작년"],
};

function PeriodSelector({
  value,
  onChange,
}: {
  value: ActivityPeriod;
  onChange: (period: ActivityPeriod) => void;
}) {
  return (
    <View className="flex-row gap-0.5 rounded-lg bg-fill-normal p-0.5">
      {PERIOD_OPTIONS.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`rounded-md px-2 py-1.5 ${selected ? "bg-background-normal" : ""}`}
            key={option.key}
            onPress={() => onChange(option.key)}
          >
            <ThemedText
              themeColor={selected ? "text" : "textSecondary"}
              typography={selected ? "caption-1-medium" : "caption-1-regular"}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ActivitySummaryTab() {
  const [period, setPeriod] = useState<ActivityPeriod>("month");
  const comparison = MOCK_ACTIVITY_COMPARISON[period];
  const series = MOCK_ACTIVITY_SERIES[period];
  const [currentLabel, previousLabel] = LEGEND_LABEL[period];

  return (
    <View className="gap-4">
      <View className="rounded-[20px] border border-line-subtle bg-background-normal p-4">
        <View className="flex-row items-center justify-between">
          <ThemedText typography="body-2-bold">{comparison.title}</ThemedText>
          <PeriodSelector onChange={setPeriod} value={period} />
        </View>
        <ThemedText
          className="mt-3"
          themeColor="textSecondary"
          typography="body-3-bold"
        >
          {comparison.description}
        </ThemedText>
        <ThemedText themeColor="textSecondary" typography="caption-2-medium">
          저번보다 기록을 {comparison.diffLabel} 더 했어요!
        </ThemedText>

        <View className="mt-4">
          {period === "year" ? (
            <ActivityBarChart
              currentValue={series.current[0] ?? 0}
              previousValue={series.previous[0] ?? 0}
            />
          ) : (
            <ActivityLineChart
              current={series.current}
              previous={series.previous}
            />
          )}
        </View>

        <View className="mt-3 flex-row justify-end gap-4">
          <View className="flex-row items-center gap-1.5">
            <View className="size-2 rounded-full bg-primary-strong" />
            <ThemedText
              themeColor="textSecondary"
              typography="caption-2-medium"
            >
              {currentLabel}
            </ThemedText>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="size-2 rounded-full bg-line-strong" />
            <ThemedText
              themeColor="textSecondary"
              typography="caption-2-medium"
            >
              {previousLabel}
            </ThemedText>
          </View>
        </View>
      </View>

      <View className="flex-row rounded-[20px] border border-line-subtle bg-background-normal p-4">
        <View className="flex-1 gap-1">
          <ThemedText themeColor="textSecondary" typography="caption-1-regular">
            운동 계획
          </ThemedText>
          <ThemedText typography="body-1-bold">
            {MOCK_ACTIVITY_COMPOSITION.workoutPlanCount}회
          </ThemedText>
        </View>
        <View className="w-px bg-fill-normal" />
        <View className="flex-1 items-end gap-1">
          <ThemedText themeColor="textSecondary" typography="caption-1-regular">
            데일리 미션
          </ThemedText>
          <ThemedText typography="body-1-bold">
            {MOCK_ACTIVITY_COMPOSITION.dailyMissionCount}회
          </ThemedText>
        </View>
      </View>

      <View className="gap-3 rounded-[20px] border border-line-subtle bg-background-normal p-4">
        <ThemedText typography="body-2-bold">최근 활동</ThemedText>
        {MOCK_RECENT_ACTIVITY.map((row, index) => (
          <View
            className="flex-row items-center gap-2 rounded-lg border border-line-normal bg-fill-subtle px-2.5 py-1"
            key={index}
          >
            <ThemedText
              themeColor="textSecondary"
              typography="caption-1-regular"
            >
              {row.date}
            </ThemedText>
            <Ionicons
              color={semanticColors["fill-strong"]}
              name="ellipse"
              size={4}
            />
            <ThemedText
              themeColor="textSecondary"
              typography="caption-1-regular"
            >
              {row.category}
            </ThemedText>
            <Ionicons
              color={semanticColors["fill-strong"]}
              name="ellipse"
              size={4}
            />
            <ThemedText
              themeColor="textSecondary"
              typography="caption-1-regular"
            >
              {row.detail}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}
