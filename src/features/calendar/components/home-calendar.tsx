import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import { toDateKey } from "@/features/calendar/date";
import type { CalendarDay } from "@/features/calendar/types";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";

import { MonthPickerSheet } from "./month-picker-sheet";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
// Figma node 3502:36518 요일 헤더: 일=red/5, 토=blue/7, 나머지 charcoal/5.
// tokens.ts의 label-subtle과 값이 달라(#4e5968 vs #8c8c92) 여기서만 직접 지정한다.
const WEEKDAY_TEXT_COLORS = [
  "#ff2e5d",
  "#8c8c92",
  "#8c8c92",
  "#8c8c92",
  "#8c8c92",
  "#8c8c92",
  "#008dd8",
];
const MONTH_SWIPE_THRESHOLD = 60;

// 캘린더 날짜 셀(43x60pt) 표시 크기의 2배(레티나 기준)로 요청 — 프리셋
// (w200_h200 등)은 정사각형 프로필용이라 이 좁고 긴 셀 비율에 맞지 않는다.
const CALENDAR_DAY_THUMBNAIL_SIZE = { width: 86, height: 120 };

function buildCalendarWeeks(reference: Date): (number | null)[][] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // Sun=0..Sat=6

  const days: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (days.length % 7 !== 0) days.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

// 요일 라벨 행. 달 전환 시 날짜 그리드와 같이 슬라이드되도록 각 달 패널
// 안쪽에 렌더링한다 — 셋 다 내용은 같지만 패널마다 하나씩 필요하다.
function WeekdayHeaderRow() {
  return (
    <View className="flex-row items-center justify-between">
      {WEEKDAY_LABELS.map((label, index) => (
        <View key={label} className="w-[43px] items-center">
          <ThemedText
            typography="caption-1-bold"
            style={{ color: WEEKDAY_TEXT_COLORS[index] }}
          >
            {label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

export function HomeCalendar({
  viewedMonth,
  onViewedMonthChange,
  today,
  onSelectDate,
  onDayWithRecordPress,
  daysByDate,
  isTodayRecorded,
  hasLocalScheduledWorkout,
  streakDays,
  calendarError,
  unreadPushCount,
  onPressNotifications,
}: {
  viewedMonth: Date;
  onViewedMonthChange: (month: Date) => void;
  today: Date;
  onSelectDate: (date: Date) => void;
  // 그 날 기록이 있으면 day-record 화면으로 넘어간다(YYYY-MM-DD 키).
  onDayWithRecordPress: (dateKey: string) => void;
  // date(YYYY-MM-DD) 기준 lookup — days는 기록/예정 운동이 있는 날짜만 내려오는
  // sparse 맵이라 index로 캘린더 셀과 매칭하면 안 되고 반드시 date로 찾아야 한다.
  daysByDate: Map<string, CalendarDay>;
  isTodayRecorded: boolean;
  // 아직 백엔드에 저장 API가 없는(로컬 상태만 갱신되는) 예정 운동 표시용.
  hasLocalScheduledWorkout: (date: Date) => boolean;
  streakDays: number;
  calendarError: boolean;
  unreadPushCount: number;
  onPressNotifications: () => void;
}) {
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);

  const viewedYear = viewedMonth.getFullYear();
  const viewedMonthNumber = viewedMonth.getMonth() + 1;
  const monthLabel = `${viewedYear}년 ${viewedMonthNumber}월`;

  const weeks = buildCalendarWeeks(viewedMonth);
  const previousMonthDate = new Date(
    viewedMonth.getFullYear(),
    viewedMonth.getMonth() - 1,
    1,
  );
  const nextMonthDate = new Date(
    viewedMonth.getFullYear(),
    viewedMonth.getMonth() + 1,
    1,
  );
  const previousMonthWeeks = buildCalendarWeeks(previousMonthDate);
  const nextMonthWeeks = buildCalendarWeeks(nextMonthDate);
  // 달마다 주(week) 수가 다르므로(4~6주), 옆 달 패널의 높이에 캘린더 전체가
  // 끌려가지 않도록 현재 달 기준으로 뷰포트 높이를 고정한다. 요일 행(16px)도
  // 이제 패널 안에서 같이 슬라이드되므로 그 높이 + gap(6px)까지 더한다.
  const calendarViewportHeight =
    16 + 6 + weeks.length * 60 + (weeks.length - 1) * 6;

  // 드래그 중엔 캘린더가 손가락을 그대로 따라가다가(dragX), 손을 떼면 임계값을
  // 넘었는지에 따라 다음/이전 달 패널 쪽으로 마저 넘어가거나(withTiming) 제자리로
  // 되돌아온다(withSpring). calendarWidth는 실제 달(가운데 패널) 기준 오프셋이다.
  const dragX = useSharedValue(0);
  const [calendarWidth, setCalendarWidth] = useState(0);

  // 달력에서 달만 넘기는 것(화살표·스와이프)과 날짜를 실제로 선택하는 것
  // (날짜 셀 탭)은 별개다 — 그냥 달만 둘러보는 중에는 하단 미션/운동 패널이
  // 계속 마지막으로 선택했던 날짜를 그대로 보여준다. 여기서 selectedDate를
  // 건드리지 않는다.
  const commitMonthChange = useCallback(
    (delta: 1 | -1) => {
      onViewedMonthChange(
        new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() + delta, 1),
      );
    },
    [viewedMonth, onViewedMonthChange],
  );

  // dragX를 여기서 바로 0으로 되돌리면 패널 내용(previousMonthWeeks 등)이 새
  // viewedMonth로 다시 그려지기 전에 위치부터 가운데로 스냅돼 한 프레임 깜빡인다.
  // useLayoutEffect로 재렌더가 커밋된 뒤에 리셋해서 내용과 위치가 같이 바뀌게 한다.
  useLayoutEffect(() => {
    dragX.value = 0;
  }, [viewedMonth, dragX]);

  function goToPreviousMonth() {
    if (!calendarWidth) {
      commitMonthChange(-1);
      return;
    }
    // Reanimated shared value — .value assignment is the intended API, not
    // a mutation of a hook's return value.
    // eslint-disable-next-line react-hooks/immutability
    dragX.value = withTiming(calendarWidth, { duration: 220 }, (finished) => {
      "worklet";
      if (finished) scheduleOnRN(commitMonthChange, -1);
    });
  }

  function goToNextMonth() {
    if (!calendarWidth) {
      commitMonthChange(1);
      return;
    }
    // eslint-disable-next-line react-hooks/immutability
    dragX.value = withTiming(-calendarWidth, { duration: 220 }, (finished) => {
      "worklet";
      if (finished) scheduleOnRN(commitMonthChange, 1);
    });
  }

  // 세로 ScrollView 안에 있으므로 activeOffsetX/failOffsetY로 가로 스와이프일
  // 때만 반응하고 세로 스크롤은 그대로 통과시킨다.
  const monthSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .onUpdate((event) => {
          "worklet";
          if (!calendarWidth) return;
          // eslint-disable-next-line react-hooks/immutability
          dragX.value = Math.max(
            -calendarWidth,
            Math.min(calendarWidth, event.translationX),
          );
        })
        .onEnd((event) => {
          "worklet";
          if (!calendarWidth) return;

          if (event.translationX < -MONTH_SWIPE_THRESHOLD) {
            // eslint-disable-next-line react-hooks/immutability
            dragX.value = withTiming(
              -calendarWidth,
              { duration: 220 },
              (finished) => {
                if (finished) scheduleOnRN(commitMonthChange, 1);
              },
            );
          } else if (event.translationX > MONTH_SWIPE_THRESHOLD) {
            dragX.value = withTiming(
              calendarWidth,
              { duration: 220 },
              (finished) => {
                if (finished) scheduleOnRN(commitMonthChange, -1);
              },
            );
          } else {
            dragX.value = withSpring(0);
          }
        }),
    [calendarWidth, commitMonthChange, dragX],
  );

  const pagerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -calendarWidth + dragX.value }],
  }));

  function renderMonthGrid(monthWeeks: (number | null)[][], monthDate: Date) {
    const isThisMonth =
      monthDate.getFullYear() === today.getFullYear() &&
      monthDate.getMonth() === today.getMonth();

    return monthWeeks.map((week, weekIndex) => (
      <View key={weekIndex} className="flex-row items-center justify-between">
        {week.map((day, dayIndex) => {
          if (day === null) {
            return <View key={dayIndex} className="h-[60px] w-[43px]" />;
          }

          const isToday = isThisMonth && day === today.getDate();
          const cellDate = new Date(
            monthDate.getFullYear(),
            monthDate.getMonth(),
            day,
          );
          // daysByDate는 현재 조회된 달(viewedMonth)의 응답만 담고 있으므로,
          // 스와이프 중인 옆 달 패널의 날짜는 자연히 매칭되지 않아 하이라이트가
          // 없는 상태로 보인다 — 그 달로 넘어가 API가 다시 조회되면 채워진다.
          const dayEntry = daysByDate.get(toDateKey(cellDate));
          const dayRecordCount = dayEntry?.recordCount ?? 0;
          // hasPhoto는 "사진이 있다"는 뜻이지 "기록이 있다"는 뜻이 아니다.
          // 오늘 포함 모든 날짜가 같은 서버 값(dayEntry.imageUrl)을 쓴다 —
          // 오늘 셀만 로컬 상태에서 사진을 찾던 이전 방식은 그 필드가 실제로
          // 채워지는 경로가 없어 오늘 사진이 영영 안 뜨는 버그였다.
          const hasPhoto = dayEntry?.imageUrl != null;
          // recordCount는 "그 날 남긴 기록 수"이지 사진 수가 아니다 — API에
          // 사진 개수 필드가 없어서 이 값으로 "여러 장 사진" 스택 UI를 채우면
          // 사진이 하나도 없는 날에도 스택이 보이는 등 의미가 달라진다. 정확한
          // 사진 개수를 내려주는 필드가 생기기 전까지는 끄둔다.
          const hasMultiplePhotos = false;
          const isFutureDay =
            cellDate >
            new Date(today.getFullYear(), today.getMonth(), today.getDate());
          // 오늘 이후 날짜에 예정 운동이 있으면 점으로 표시한다(Figma node
          // 2918-4983의 31일 셀). workout-plan 기능은 아직 백엔드에 저장하는
          // API가 없어(운동 계획 추가는 로컬 상태만 갱신) 서버 hasPlan만으로는
          // 방금 이 세션에서 추가한 예정 운동이 반영되지 않는다 — 두 신호를
          // OR로 합쳐서 기존 로컬-상태 기반 표시를 유지한다.
          const hasScheduledWorkout =
            isFutureDay &&
            (dayEntry?.hasPlan === true || hasLocalScheduledWorkout(cellDate));

          const textColor =
            isToday && hasPhoto
              ? "#ffffff"
              : isToday
                ? semanticColors["label-normal"]
                : hasPhoto
                  ? semanticColors["label-normal"]
                  : isFutureDay
                    ? semanticColors["label-disabled"]
                    : semanticColors["label-subtle"];

          return (
            <Pressable
              key={dayIndex}
              accessibilityRole="button"
              accessibilityLabel={`${monthDate.getMonth() + 1}월 ${day}일`}
              onPress={() => {
                onSelectDate(cellDate);
                // 그 날 기록이 있으면 day-record 화면으로 바로 넘어간다.
                // 오늘도 포함 — 체크 가능한 TodayWorkoutCard는 계속 기본으로
                // 보이고, 이미 완료해 기록이 남은 항목은 다른 날짜와 똑같이
                // 여기서 사진과 함께 볼 수 있어야 한다. 미래만 예정 운동
                // 화면을 계속 써야 하므로 대상에서 뺀다.
                if (!isFutureDay && dayRecordCount > 0) {
                  onDayWithRecordPress(toDateKey(cellDate));
                }
              }}
              className="h-[60px] w-[43px]"
            >
              {/* 메인 카드보다 먼저 그려야 "뒤에 깔린" 것처럼 보인다 — 형제로
                  두지 않고 메인 카드 안에 넣으면 zIndex를 아무리 낮춰도 부모(=
                  메인 카드) 자신의 배경보다 뒤로는 못 가서 오히려 위에 덮인다. */}
              {hasMultiplePhotos && !isToday && (
                <View className="absolute -top-1 left-2 h-[52px] w-[35px] rounded-lg border-[1.5px] border-background-normal bg-fill-subtle" />
              )}
              <View
                className={
                  isToday
                    ? `h-[60px] w-[43px] items-start overflow-hidden rounded-lg border-2 p-1.5 ${
                        isTodayRecorded
                          ? "border-solid border-label-normal bg-fill-normal"
                          : "border-dashed border-label-normal"
                      }`
                    : hasPhoto
                      ? "h-[60px] w-[43px] items-start rounded-lg bg-fill-normal p-1.5"
                      : "h-[60px] w-[43px] items-start p-1.5"
                }
              >
                {hasPhoto && (
                  <>
                    <Image
                      source={{
                        uri: getOptimizedImageUrl(dayEntry!.imageUrl!, {
                          ...CALENDAR_DAY_THUMBNAIL_SIZE,
                          crop: "fill",
                        }),
                      }}
                      style={{ position: "absolute", inset: 0 }}
                      contentFit="cover"
                    />
                    {isToday && (
                      <View
                        className="absolute inset-0"
                        style={{ backgroundColor: "rgba(0,0,0,0.28)" }}
                      />
                    )}
                  </>
                )}
                {/* Figma 4305:34469 "장수 배지" — 그 날 기록이 여러 건일 때만
                    개수를 보여준다(1건이면 굳이 셀 필요가 없다). */}
                {!isToday && hasPhoto && (dayEntry?.recordCount ?? 0) > 1 && (
                  <View className="absolute bottom-1 right-1 h-4 w-4 items-center justify-center rounded-full bg-charcoal-12">
                    <ThemedText
                      style={{ color: semanticColors["label-inverse"] }}
                      typography="caption-2-bold"
                    >
                      {dayEntry!.recordCount}
                    </ThemedText>
                  </View>
                )}
                <ThemedText
                  typography={isToday ? "caption-1-bold" : "caption-1-regular"}
                  style={{ color: textColor }}
                >
                  {day}
                </ThemedText>
                {hasScheduledWorkout && (
                  <View className="absolute bottom-1.5 left-5 h-1 w-1 rounded-full bg-label-normal" />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    ));
  }

  return (
    <>
      {/* Figma 3502:65456 — 월 선택과 우측 액션(스트릭·알림)이 한 줄. */}
      <View className="w-full flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 달"
            onPress={goToPreviousMonth}
            className="h-12 w-7 items-start justify-center"
          >
            <Ionicons
              name="caret-back"
              size={20}
              color={primitiveColors.charcoal[12]}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="연월 직접 선택"
            onPress={() => setIsMonthPickerVisible(true)}
          >
            <ThemedText
              typography="title-3-bold"
              style={{ color: primitiveColors.charcoal[12] }}
            >
              {monthLabel}
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다음 달"
            onPress={goToNextMonth}
            className="h-12 w-7 items-start justify-center pl-2"
          >
            <Ionicons
              name="caret-forward"
              size={20}
              color={primitiveColors.charcoal[12]}
            />
          </Pressable>
        </View>

        <View className="flex-row items-center gap-1.5">
          <Pressable
            className="flex-row items-center gap-0.5 rounded-full bg-charcoal-1 py-1.5 pl-2.5 pr-3"
            accessibilityRole="button"
            accessibilityLabel="연속 스트릭"
            onPress={() => console.log("streak badge pressed")}
          >
            <Ionicons
              name="flame"
              size={24}
              color={primitiveColors.orange[500]}
            />
            <ThemedText
              typography="caption-1-bold"
              style={{ color: primitiveColors.charcoal[11] }}
            >
              {streakDays}일
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unreadPushCount > 0 ? "알림, 읽지 않은 알림 있음" : "알림"
            }
            onPress={onPressNotifications}
            className="h-12 w-12 items-center justify-center"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-charcoal-1">
              <Ionicons
                name="notifications"
                size={20}
                color={primitiveColors.charcoal[12]}
              />
              {/* 읽지 않은 알림 표시 — 개수는 노출하지 않고 점만 찍는다.
                  Figma 1375:16126: 11x11 원, brand fill에 버튼 배경색
                  2px 링(right 4 / top 5). */}
              {unreadPushCount > 0 && (
                <View className="absolute right-1 top-[5px] h-[11px] w-[11px] rounded-full border-2 border-charcoal-1 bg-orange-500" />
              )}
            </View>
          </Pressable>
        </View>
      </View>

      {calendarError && (
        <ThemedText typography="caption-1-medium" themeColor="textSecondary">
          캘린더 정보를 불러오지 못했어요
        </ThemedText>
      )}

      <GestureDetector gesture={monthSwipeGesture}>
        <View
          onLayout={(event) => setCalendarWidth(event.nativeEvent.layout.width)}
        >
          {calendarWidth > 0 && (
            <View
              style={{
                height: calendarViewportHeight,
                overflow: "hidden",
              }}
            >
              <Animated.View
                style={[
                  {
                    flexDirection: "row",
                    alignItems: "flex-start",
                    width: calendarWidth * 3,
                  },
                  pagerAnimatedStyle,
                ]}
              >
                <View style={{ width: calendarWidth, gap: 6 }}>
                  <WeekdayHeaderRow />
                  {renderMonthGrid(previousMonthWeeks, previousMonthDate)}
                </View>
                <View style={{ width: calendarWidth, gap: 6 }}>
                  <WeekdayHeaderRow />
                  {renderMonthGrid(weeks, viewedMonth)}
                </View>
                <View style={{ width: calendarWidth, gap: 6 }}>
                  <WeekdayHeaderRow />
                  {renderMonthGrid(nextMonthWeeks, nextMonthDate)}
                </View>
              </Animated.View>
            </View>
          )}
        </View>
      </GestureDetector>

      <MonthPickerSheet
        month={viewedMonthNumber}
        onClose={() => setIsMonthPickerVisible(false)}
        onSelect={(year, month) => {
          onViewedMonthChange(new Date(year, month - 1, 1));
          setIsMonthPickerVisible(false);
        }}
        visible={isMonthPickerVisible}
        year={viewedYear}
      />
    </>
  );
}
