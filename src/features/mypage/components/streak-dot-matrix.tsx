import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { DayCell, WeekDots } from "@/features/mypage/mock-data";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function Dot({ recorded }: { recorded: DayCell }) {
  if (recorded === null) return <View className="size-3" />;
  return (
    <View
      className={`size-3 rounded-full ${recorded ? "bg-primary-strong" : "bg-fill-normal"}`}
    />
  );
}

type StreakDotMatrixProps = {
  weeks: WeekDots[];
};

export function StreakDotMatrix({ weeks }: StreakDotMatrixProps) {
  return (
    <View className="gap-3">
      <View className="flex-row">
        <View style={{ width: 44 }} />
        {WEEKDAY_LABELS.map((label) => (
          <ThemedText
            className="flex-1 text-center"
            key={label}
            themeColor="textSecondary"
            typography="caption-2-medium"
          >
            {label}
          </ThemedText>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View className="flex-row items-center" key={weekIndex}>
          <ThemedText
            style={{ width: 44 }}
            themeColor="textSecondary"
            typography="caption-2-medium"
          >
            {weekIndex + 1}주차
          </ThemedText>
          {week.map((recorded, dayIndex) => (
            <View className="flex-1 items-center" key={dayIndex}>
              <Dot recorded={recorded} />
            </View>
          ))}
        </View>
      ))}

      <View className="flex-row justify-end gap-4">
        <View className="flex-row items-center gap-1.5">
          <View className="size-2 rounded-full bg-primary-strong" />
          <ThemedText themeColor="textSecondary" typography="caption-2-medium">
            기록
          </ThemedText>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="size-2 rounded-full bg-fill-normal" />
          <ThemedText themeColor="textSecondary" typography="caption-2-medium">
            미기록
          </ThemedText>
        </View>
      </View>
    </View>
  );
}
