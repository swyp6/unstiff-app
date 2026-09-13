import { Image } from "expo-image";
import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import {
  type DayCell,
  MOCK_RECENT_ACTIVITY,
  getStreakDataForMonth,
} from "@/features/mypage/mock-data";

const STREAK_MASCOT_ACTIVE = require("@/assets/mypage/streak-mascot-active.png");
const STREAK_MASCOT_IDLE = require("@/assets/mypage/streak-mascot-idle.png");
const RECENT_ACTIVITY_ICON = require("@/assets/mypage/recent-activity-icon.png");

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const CARD_SHADOW = "shadow-[0px_4px_12px_0px_rgba(0,0,0,0.04)]";

// The exported mascot/icon PNGs are full illustration sheets, not
// single cropped assets — Figma displays only a small window of each via
// an oversized, offset <img> inside an overflow-hidden box. These mirror
// that same crop (computed from Figma's own offset/scale percentages)
// instead of showing the whole sheet.
const MASCOT_BOX = { height: 84, width: 90 };
const MASCOT_CROP = {
  height: MASCOT_BOX.height * 8.503,
  left: MASCOT_BOX.width * -4.9689,
  top: MASCOT_BOX.height * -3.2869,
  width: MASCOT_BOX.width * 11.7752,
};
const RECENT_ICON_CROP = { height: 84, left: -45, top: 0, width: 247 };

// Figma's heatmap only pins levels 1/2/3/5 to specific Orange shades (see
// HeatmapLevel in mock-data.ts) — level 4 reuses level 3's shade since no
// distinct swatch was specified between orange-400 and orange-500.
const HEATMAP_LEVEL_CLASSES: Record<number, string> = {
  0: "bg-charcoal-1",
  1: "bg-orange-50",
  2: "bg-orange-100",
  3: "bg-orange-400",
  4: "bg-orange-400",
  5: "bg-orange-500",
};

function HeatmapCell({ level }: { level: DayCell }) {
  if (level === null) return <View className="size-6" />;
  return (
    <View className={`size-6 rounded-full ${HEATMAP_LEVEL_CLASSES[level]}`} />
  );
}

function StreakCard({
  currentStreakDays,
  bestStreakDays,
}: {
  currentStreakDays: number;
  bestStreakDays: number;
}) {
  const active = currentStreakDays > 0;
  return (
    <View
      className={`flex-row items-center gap-3 overflow-hidden rounded-[24px] py-5 pl-5 pr-4 ${
        active ? "bg-background-normal" : "bg-charcoal-1"
      }`}
    >
      <View className="flex-1 gap-1">
        <ThemedText
          style={{
            color: active
              ? primitiveColors.orange["500"]
              : primitiveColors.charcoal["5"],
          }}
          typography="caption-1-bold"
        >
          연속 기록
        </ThemedText>
        <ThemedText typography="title-3-bold">
          {active
            ? `${currentStreakDays}일째 이어가는 중`
            : "오늘 기록이 없어요"}
        </ThemedText>
        <View className="flex-row gap-1 pt-1">
          <ThemedText themeColor="textSecondary" typography="caption-1-regular">
            최고 기록
          </ThemedText>
          <ThemedText typography="caption-1-bold">
            {bestStreakDays}일
          </ThemedText>
        </View>
      </View>
      <View
        style={{
          height: MASCOT_BOX.height,
          overflow: "hidden",
          width: MASCOT_BOX.width,
        }}
      >
        <Image
          contentFit="fill"
          source={active ? STREAK_MASCOT_ACTIVE : STREAK_MASCOT_IDLE}
          style={{ position: "absolute", ...MASCOT_CROP }}
        />
      </View>
    </View>
  );
}

function MonthlyRecordCard({
  recordedDaysThisMonth,
  weeks,
}: {
  recordedDaysThisMonth: number;
  weeks: DayCell[][];
}) {
  const hasRecord = recordedDaysThisMonth > 0;
  return (
    <View
      className={`gap-4 rounded-[24px] bg-background-normal px-4 pb-4 pt-5 ${CARD_SHADOW}`}
    >
      <View className="gap-0.5">
        <ThemedText themeColor="textSecondary" typography="caption-1-medium">
          이번 달 얼마나 기록했을까요?
        </ThemedText>
        <ThemedText typography="title-3-bold">
          {hasRecord
            ? `${recordedDaysThisMonth}일 기록했어요`
            : "아직 기록이 없어요"}
        </ThemedText>
      </View>
      <View className="gap-2">
        <View className="flex-row">
          {WEEKDAY_LABELS.map((label, index) => (
            <View className="flex-1 items-center" key={label}>
              <ThemedText
                style={{
                  color:
                    index === 0
                      ? semanticColors["status-negative-normal"]
                      : index === 6
                        ? "#1b64da"
                        : semanticColors["label-disabled"],
                }}
                typography="caption-2-bold"
              >
                {label}
              </ThemedText>
            </View>
          ))}
        </View>
        {weeks.map((week, weekIndex) => (
          <View className="flex-row" key={weekIndex}>
            {week.map((level, dayIndex) => (
              <View className="flex-1 items-center" key={dayIndex}>
                <HeatmapCell level={level} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function RecentActivityCard() {
  return (
    <View
      className={`gap-4 rounded-[20px] bg-background-normal p-6 ${CARD_SHADOW}`}
    >
      <View className="gap-0.5">
        <ThemedText themeColor="textSecondary" typography="caption-1-medium">
          최근 활동
        </ThemedText>
        <ThemedText typography="title-3-bold">
          최근 기록한 활동을 모아봤어요
        </ThemedText>
      </View>
      <View className="gap-3">
        {MOCK_RECENT_ACTIVITY.map((row, index) => (
          <View
            className={`h-[76px] flex-row items-center gap-4 rounded-[20px] bg-fill-subtle px-4 ${CARD_SHADOW}`}
            key={index}
          >
            <View className="size-[52px] overflow-hidden rounded-full bg-background-normal">
              <Image
                contentFit="fill"
                source={RECENT_ACTIVITY_ICON}
                style={{ position: "absolute", ...RECENT_ICON_CROP }}
              />
            </View>
            <View className="flex-1 gap-0.5">
              <ThemedText typography="body-1-bold">{row.category}</ThemedText>
              <ThemedText
                style={{ color: primitiveColors.charcoal["5"] }}
                typography="body-1-bold"
              >
                {row.detail}
              </ThemedText>
            </View>
            <View className="rounded-xl border border-[#c9e2ff] bg-background-normal px-2.5 py-1">
              <ThemedText typography="caption-1-medium">{row.date}</ThemedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function StreakTab() {
  const now = new Date();
  const { currentStreakDays, bestStreakDays, recordedDaysThisMonth, weeks } =
    getStreakDataForMonth(now.getFullYear(), now.getMonth() + 1);

  return (
    <View className="gap-5">
      <StreakCard
        bestStreakDays={bestStreakDays}
        currentStreakDays={currentStreakDays}
      />
      <MonthlyRecordCard
        recordedDaysThisMonth={recordedDaysThisMonth}
        weeks={weeks}
      />
      <RecentActivityCard />
    </View>
  );
}
