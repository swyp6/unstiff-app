import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { StreakDotMatrix } from "@/features/mypage/components/streak-dot-matrix";
import { StreakRingChart } from "@/features/mypage/components/streak-ring-chart";
import { getStreakDataForMonth } from "@/features/mypage/mock-data";

function shiftMonth(year: number, month: number, delta: number) {
  const zeroBased = month - 1 + delta;
  const nextYear = year + Math.floor(zeroBased / 12);
  const nextMonth = ((zeroBased % 12) + 12) % 12;
  return { year: nextYear, month: nextMonth + 1 };
}

export function StreakTab() {
  const now = new Date();
  const [{ year, month }, setDate] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const { currentStreakDays, thisMonthPercent, lastMonthPercent, weeks } =
    getStreakDataForMonth(year, month);

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between rounded-[20px] border border-line-subtle bg-background-normal px-4 py-4">
        <View className="gap-1">
          <ThemedText themeColor="textSecondary" typography="caption-1-regular">
            현재 연속 기록
          </ThemedText>
          <ThemedText typography="title-1-bold">
            {currentStreakDays}일
          </ThemedText>
        </View>
        <View className="size-11 items-center justify-center rounded-full bg-fill-strong">
          <Ionicons
            color={semanticColors["primary-strong"]}
            name="flame"
            size={22}
          />
        </View>
      </View>

      <View className="rounded-[20px] border border-line-subtle bg-background-normal">
        <View className="flex-row items-center justify-between border-b border-fill-normal px-4 py-3">
          <Pressable
            accessibilityLabel="이전 달"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setDate(shiftMonth(year, month, -1))}
          >
            <Ionicons
              color={semanticColors["label-normal"]}
              name="chevron-back"
              size={16}
            />
          </Pressable>
          <ThemedText typography="body-2-bold">
            {year}년 {month}월
          </ThemedText>
          <Pressable
            accessibilityLabel="다음 달"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setDate(shiftMonth(year, month, 1))}
          >
            <Ionicons
              color={semanticColors["label-normal"]}
              name="chevron-forward"
              size={16}
            />
          </Pressable>
        </View>

        <View className="items-center gap-4 px-4 py-5">
          <StreakRingChart
            lastMonthPercent={lastMonthPercent}
            thisMonthPercent={thisMonthPercent}
          />
          <View className="flex-row gap-6">
            <View className="flex-row items-center gap-1.5">
              <View className="size-2 rounded-full bg-primary-strong" />
              <ThemedText
                themeColor="textSecondary"
                typography="caption-2-regular"
              >
                이번달 {thisMonthPercent}%
              </ThemedText>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="size-2 rounded-full bg-line-strong" />
              <ThemedText
                themeColor="textSecondary"
                typography="caption-2-regular"
              >
                저번달 {lastMonthPercent}%
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      <View className="gap-4 rounded-[20px] border border-line-subtle bg-background-normal p-4">
        <ThemedText typography="body-2-bold">이번달 기록</ThemedText>
        <StreakDotMatrix weeks={weeks} />
      </View>
    </View>
  );
}
