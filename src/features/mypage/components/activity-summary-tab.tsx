import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import {
  type ActivityPeriod,
  type ActivityPeriodMode,
  comparePeriod,
  effectivePeriodRange,
  nextPeriod,
  parseCalendarDate,
  periodLabel,
  periodOf,
  previousPeriod,
  todayCalendarDate,
} from "@/features/mypage/activity-report-period";
import type {
  WorkoutReportBucket,
  WorkoutReportResponse,
} from "@/features/mypage/types";
import { useWorkoutReport } from "@/features/mypage/use-workout-report";
import { formatMeasureValue } from "@/features/workout-history/model";
import type { ExerciseMeasuresDto } from "@/features/workout-plan/types";

// 활동 리포트 탭 — Figma 4573:35652 "컨텐츠 영역". 기간 선택(주간/월간/연간)과
// 기간 이동(가입일이 속한 기간 ~ 오늘이 속한 기간), 그리고 GET
// /api/v1/workouts/report 연동 차트/상세가 동작한다. 간격/크기는 px 값으로
// 쓴다 — NativeWind rem=14라 rem 클래스는 Figma px의 0.875배로 렌더된다.

// 이 화면의 모션 언어 — "부드럽게 미끄러지고, 텍스트가 약간 늦게 따라오며,
// 상태 변화는 천천히 fade". ease-out(cubic/quad) 두 곡선만 쓰고 spring·
// scale·bounce는 쓰지 않는다. 카드는 anchor라 절대 움직이지 않는다.
const EASE_OUT_CUBIC = Easing.out(Easing.cubic);
const EASE_OUT_QUAD = Easing.out(Easing.quad);
const PILL_SLIDE_MS = 280;
const LABEL_FADE_MS = 200;
const LABEL_SELECTED_FROM_OPACITY = 0.55;
const LABEL_UNSELECTED_DIP_OPACITY = 0.7;
const TITLE_TRANSITION_MS = 220;
const TITLE_TRANSITION_OFFSET = 8;
// mode 변경은 pill이 먼저 출발하고 제목이 살짝 늦게 따라온다. 그동안 제목
// 자리가 완전히 비어 보이지 않도록 새 제목은 0이 아니라 0.25에서 시작한다.
const TITLE_MODE_CHANGE_DELAY_MS = 40;
const TITLE_MODE_CHANGE_FROM_OPACITY = 0.25;
const ARROW_STATE_MS = 180;
const ARROW_PRESS_MS = 110;
const ARROW_DISABLED_OPACITY = 0.28;
const ARROW_PRESSED_OPACITY = 0.65;

const PERIOD_OPTIONS: { key: ActivityPeriodMode; label: string }[] = [
  { key: "week", label: "주간" },
  { key: "month", label: "월간" },
  { key: "year", label: "연간" },
];

// Figma "Control / 기간 탭" (4272:17464) — 240 wrapper에 p 12, 안쪽 216×32
// charcoal/1 pill(p 2, radius 999). 선택 탭은 charcoal/11 pill + Bold white,
// 비선택은 Regular charcoal/4. 선택 pill은 absolute Animated.View 하나가
// 3등분 칸(212/3) 사이를 translateX로 미끄러지고, 라벨 3개는 그 위에 고정.
const SELECTOR_INNER_WIDTH = 216;
const SELECTOR_PADDING = 2;
const SELECTOR_SEGMENT_WIDTH =
  (SELECTOR_INNER_WIDTH - SELECTOR_PADDING * 2) / PERIOD_OPTIONS.length;

// 라벨은 자리·typography 그대로 두고 opacity만 살짝 눌렀다 돌아온다 —
// 선택되는 쪽은 0.55→1, 풀리는 쪽은 0.7→1. pill(280ms)보다 먼저 끝난다.
function PeriodSelectorLabel({
  label,
  selected,
}: {
  label: string;
  selected: boolean;
}) {
  const opacity = useSharedValue(1);
  const previousSelectedRef = useRef(selected);
  useEffect(() => {
    if (previousSelectedRef.current === selected) return;
    previousSelectedRef.current = selected;
    opacity.value = selected
      ? LABEL_SELECTED_FROM_OPACITY
      : LABEL_UNSELECTED_DIP_OPACITY;
    opacity.value = withTiming(1, {
      duration: LABEL_FADE_MS,
      easing: EASE_OUT_QUAD,
    });
  }, [opacity, selected]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={style}>
      <ThemedText
        style={{
          color: selected
            ? semanticColors["label-inverse"]
            : primitiveColors.charcoal["4"],
        }}
        typography={selected ? "body-3-bold" : "body-3-regular"}
      >
        {label}
      </ThemedText>
    </Animated.View>
  );
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: ActivityPeriodMode;
  onChange: (mode: ActivityPeriodMode) => void;
}) {
  const selectedIndex = PERIOD_OPTIONS.findIndex(
    (option) => option.key === value,
  );
  const reducedMotion = useReducedMotion();
  const pillX = useSharedValue(selectedIndex * SELECTOR_SEGMENT_WIDTH);
  useEffect(() => {
    // reduce motion이면 미끄러지지 않고 바로 자리 잡는다.
    pillX.value = withTiming(selectedIndex * SELECTOR_SEGMENT_WIDTH, {
      duration: reducedMotion ? 0 : PILL_SLIDE_MS,
      easing: EASE_OUT_CUBIC,
    });
  }, [pillX, reducedMotion, selectedIndex]);
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  return (
    <View className="w-[240px] p-[12px]">
      <View className="h-[32px] flex-row overflow-hidden rounded-full bg-charcoal-1 p-[2px]">
        <Animated.View
          className="absolute rounded-full bg-charcoal-11"
          style={[
            {
              height: 32 - SELECTOR_PADDING * 2,
              left: SELECTOR_PADDING,
              top: SELECTOR_PADDING,
              width: SELECTOR_SEGMENT_WIDTH,
            },
            pillStyle,
          ]}
        />
        {PERIOD_OPTIONS.map((option) => {
          const selected = option.key === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className="h-full flex-1 items-center justify-center"
              key={option.key}
              onPress={() => onChange(option.key)}
            >
              <PeriodSelectorLabel label={option.label} selected={selected} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Figma "Control / 기간 이동" (4272:17496) — [이전 28×48][제목 20/27 Bold
// charcoal/12][다음 28×48]. 아이콘 20×20은 터치 안에서 세로 중앙, 이전은
// left 0 / 다음은 left 8. 너비는 제목 길이에 따라 자연스럽게 달라진다.
// 화살표는 이동할 수 없어도 자리를 지키고(제목 중앙 정렬 유지) 흐려지기만
// 한다 — Figma에 disabled variant가 없어 opacity로만 구분.
const PERIOD_TOUCH_WIDTH = 28;
const PERIOD_TOUCH_HEIGHT = 48;
const PERIOD_ICON_SIZE = 20;
const PERIOD_NEXT_ICON_LEFT = 8;

type NavigationDirection = "previous" | "next" | "reset";

function PeriodArrow({
  direction,
  disabled,
  onPress,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onPress: () => void;
}) {
  const isNext = direction === "next";
  // NativeWind가 감싼 Pressable은 함수형 style(({pressed}) => …)을 버리므로
  // pressed 상태를 직접 들고, opacity는 안쪽 Animated.View에서 timing으로
  // 바꾼다 — enabled↔disabled는 180ms, press in/out은 110ms.
  const [pressed, setPressed] = useState(false);
  const opacity = useSharedValue(disabled ? ARROW_DISABLED_OPACITY : 1);
  const previousDisabledRef = useRef(disabled);
  useEffect(() => {
    const disabledChanged = previousDisabledRef.current !== disabled;
    previousDisabledRef.current = disabled;
    opacity.value = withTiming(
      disabled ? ARROW_DISABLED_OPACITY : pressed ? ARROW_PRESSED_OPACITY : 1,
      {
        duration: disabledChanged ? ARROW_STATE_MS : ARROW_PRESS_MS,
        easing: EASE_OUT_QUAD,
      },
    );
  }, [disabled, opacity, pressed]);
  const iconStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Pressable
      accessibilityLabel={isNext ? "다음 기간" : "이전 기간"}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        height: PERIOD_TOUCH_HEIGHT,
        justifyContent: "center",
        paddingLeft: isNext ? PERIOD_NEXT_ICON_LEFT : 0,
        width: PERIOD_TOUCH_WIDTH,
      }}
    >
      <Animated.View style={iconStyle}>
        <Image
          contentFit="contain"
          source={
            isNext
              ? require("@/assets/mypage/icon-period-next.svg")
              : require("@/assets/mypage/icon-period-prev.svg")
          }
          style={{ height: PERIOD_ICON_SIZE, width: PERIOD_ICON_SIZE }}
        />
      </Animated.View>
    </Pressable>
  );
}

function PeriodNavigator({
  period,
  direction,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: {
  period: ActivityPeriod;
  // 이 period로 어떻게 왔는지 — 제목이 살짝 들어오는 방향을 정한다.
  direction: NavigationDirection;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const label = periodLabel(period);
  const reducedMotion = useReducedMotion();
  const titleOpacity = useSharedValue(1);
  const titleX = useSharedValue(0);
  // 첫 렌더는 그대로 두고, 제목이 바뀔 때만 fade + 살짝 slide. 이전/다음은
  // 탐색 방향에서 8px 들어오고, mode 변경(reset)은 방향이 없으니 fade만 —
  // 대신 pill이 먼저 출발하도록 60ms 늦게 시작한다. reduce motion이면
  // 항상 fade만.
  const previousLabelRef = useRef(label);
  useEffect(() => {
    if (previousLabelRef.current === label) return;
    previousLabelRef.current = label;
    const isModeChange = direction === "reset";
    const fromX =
      reducedMotion || isModeChange
        ? 0
        : direction === "previous"
          ? -TITLE_TRANSITION_OFFSET
          : TITLE_TRANSITION_OFFSET;
    const delay = isModeChange ? TITLE_MODE_CHANGE_DELAY_MS : 0;
    const timing = { duration: TITLE_TRANSITION_MS, easing: EASE_OUT_QUAD };
    titleOpacity.value = isModeChange ? TITLE_MODE_CHANGE_FROM_OPACITY : 0;
    titleX.value = fromX;
    titleOpacity.value = withDelay(delay, withTiming(1, timing));
    titleX.value = withDelay(delay, withTiming(0, timing));
  }, [direction, label, reducedMotion, titleOpacity, titleX]);
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateX: titleX.value }],
  }));

  return (
    <View className="flex-row items-center">
      <PeriodArrow
        direction="previous"
        disabled={!canGoPrevious}
        onPress={onPrevious}
      />
      <Animated.View style={titleStyle}>
        <ThemedText
          style={{ color: primitiveColors.charcoal["12"] }}
          typography="title-3-bold"
        >
          {label}
        </ThemedText>
      </Animated.View>
      <PeriodArrow direction="next" disabled={!canGoNext} onPress={onNext} />
    </View>
  );
}

// Figma "Empty State / Chart Icon" (4254:30671) — 64 원 안의 막대 3개를
// Figma rectangle 그대로 View로 그린다 (x/y/height/opacity 각각 다름).
const EMPTY_CHART_BARS = [
  { left: 20, top: 30, height: 12, opacity: 0.45 },
  { left: 29, top: 20, height: 22, opacity: 0.72 },
  { left: 38, top: 26, height: 16, opacity: 0.55 },
];

// Figma "Activity Report / Empty State" (4405:24196) — 375 캔버스에서 x24 /
// w327 = 화면 좌우 24 inset이므로 너비는 부모(활동구성 영역)를 꽉 채우고
// 높이만 320 고정. border 1 line-subtle(#F2F4F6), radius 20, shadow 0/4/12
// rgba(0,0,0,0.04). 내부 세로 좌표(32/52/119/203)와 left 23은 Figma 그대로
// absolute, 원과 설명은 카드 폭이 늘어나도 따라오도록 가로 중앙 정렬. Figma
// 좌표는 카드 바깥 프레임 기준(stroke는 안쪽)인데 RN은 absolute 자식을
// border 안쪽 기준으로 놓으므로 border 두께만큼 빼서 위치를 맞춘다.
const CARD_BORDER_WIDTH = 1;
const inCard = (figmaOffset: number) => figmaOffset - CARD_BORDER_WIDTH;

function ActivityReportEmptyCard() {
  return (
    <View
      className="h-[320px] w-full overflow-hidden rounded-[20px] border-line-subtle bg-background-normal shadow-[0px_4px_12px_0px_rgba(0,0,0,0.04)]"
      style={{ borderWidth: CARD_BORDER_WIDTH }}
    >
      <ThemedText
        className="absolute"
        style={{
          color: primitiveColors.charcoal["5"],
          left: inCard(23),
          top: inCard(32),
        }}
        typography="body-3-bold"
      >
        👟 활동 구성
      </ThemedText>
      <ThemedText
        className="absolute"
        style={{
          color: primitiveColors.charcoal["11"],
          left: inCard(23),
          top: inCard(52),
        }}
        typography="title-3-bold"
      >
        아직 쌓인 활동이 없어요
      </ThemedText>
      <View
        className="absolute left-0 right-0 items-center"
        style={{ top: inCard(119) }}
      >
        <View className="size-[64px] overflow-hidden rounded-[32px] bg-charcoal-1">
          {EMPTY_CHART_BARS.map((bar) => (
            <View
              className="absolute w-[5px] rounded-[2.5px] bg-charcoal-5"
              key={bar.left}
              style={{
                height: bar.height,
                left: bar.left,
                opacity: bar.opacity,
                top: bar.top,
              }}
            />
          ))}
        </View>
      </View>
      <ThemedText
        className="absolute text-center"
        style={{
          color: primitiveColors.charcoal["5"],
          left: -CARD_BORDER_WIDTH,
          right: -CARD_BORDER_WIDTH,
          top: inCard(203),
        }}
        typography="body-3-regular"
      >
        {"운동을 기록하면 활동을\n한눈에 확인할 수 있어요"}
      </ThemedText>
    </View>
  );
}

// ---- 여기서부터 GET /api/v1/workouts/report 연동 ----
// 색은 운동 종류 "이름"을 해시해 고정 팔레트에서 고른다 — 기간이 바뀌어
// 그 기간에 등장하는 종류 구성이 달라져도 같은 이름은 항상 같은 색이다.
const EXERCISE_COLOR_PALETTE = [
  primitiveColors.orange["500"],
  primitiveColors.sky["600"],
  primitiveColors.sprout["600"],
  primitiveColors.yellow["900"],
  primitiveColors.blue["6"],
  primitiveColors.red["6"],
  primitiveColors.green["600"],
  primitiveColors.charcoal["7"],
];

function hashExerciseType(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function colorForExerciseType(name: string): string {
  return EXERCISE_COLOR_PALETTE[
    hashExerciseType(name) % EXERCISE_COLOR_PALETTE.length
  ];
}

// 지표 탭 4개 — 축 하나만 항상 화면에 있게 해 막대 길이가 실제 값과
// 어긋나지 않게 한다. appliesTo(운동 종류별 적용 지표) 같은 구분은 두지
// 않는다 — 실제로는 어떤 운동 종류든 네 측정값 중 무엇을 기록할지 사용자가
// 그때그때 고르는 것이라 종류-지표 매핑이 고정돼 있지 않다.
const REPORT_METRICS: {
  key: keyof ExerciseMeasuresDto;
  label: string;
  unit: string;
}[] = [
  { key: "distance", label: "거리", unit: "km" },
  { key: "duration", label: "시간", unit: "분" },
  { key: "count", label: "횟수", unit: "회" },
  { key: "sets", label: "세트", unit: "세트" },
];

// Figma "Activity Type Composition Card"의 구성 도넛과 짝지어진 지표별
// 고정 색 — 운동 종류(chip/차트)와 달리 이 넷은 항상 이 색이다.
const METRIC_DOT_COLOR: Record<keyof ExerciseMeasuresDto, string> = {
  distance: primitiveColors.orange["300"],
  duration: primitiveColors.orange["500"],
  count: primitiveColors.charcoal["9"],
  sets: primitiveColors.charcoal["3"],
};

// 서버 원값(거리 m / 시간 초)을 차트에 쓰는 축약 단위(km / 분)로.
function toDisplayUnitValue(
  key: keyof ExerciseMeasuresDto,
  raw: number,
): number {
  if (key === "duration") return raw / 60;
  if (key === "distance") return raw / 1000;
  return raw;
}

// 막대 축의 "보기 좋은" 최댓값 — 1/2/5/10 × 10^n 중 값을 넘는 가장 작은 것.
function niceMax(value: number): number {
  if (value <= 0) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 기록이 없는 구간은 API 응답(buckets)에 아예 담기지 않으므로, 요일/일자
// 위치가 어긋나지 않도록 조회 범위 안의 모든 날짜를 직접 채워 순회한다.
// 문자열을 Date로 왕복하지 않고 로컬 Date 하나만 증가시켜 타임존으로
// 하루가 밀리는 걸 피한다.
function dateKeysInRange(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const cursor = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  const keys: string[] = [];
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

// 연간 모드의 구간 키("YYYY-MM"). from/to는 항상 같은 해다 — 연간 이동
// 범위 자체가 그 해를 벗어나지 않는다.
function monthKeysInRange(from: string, to: string): string[] {
  const [fy, fm] = from.split("-").map(Number);
  const [, tm] = to.split("-").map(Number);
  return Array.from(
    { length: tm - fm + 1 },
    (_, i) => `${fy}-${String(fm + i).padStart(2, "0")}`,
  );
}

function bucketKeysFor(
  mode: ActivityPeriodMode,
  from: string,
  to: string,
): string[] {
  return mode === "year"
    ? monthKeysInRange(from, to)
    : dateKeysInRange(from, to);
}

function addMeasures(
  a: ExerciseMeasuresDto,
  b: ExerciseMeasuresDto,
): ExerciseMeasuresDto {
  const sum: ExerciseMeasuresDto = { ...a };
  REPORT_METRICS.forEach(({ key }) => {
    const value = b[key];
    if (value == null) return;
    sum[key] = (sum[key] ?? 0) + value;
  });
  return sum;
}

// 연간 모드 전용 방어 로직 — 스웨거 문서는 연간이면 period가 "YYYY-MM"
// 월 단위로 묶여 온다고 되어 있지만, 실제 응답은 (문서와 달리) 일별
// "YYYY-MM-DD" 그대로 온다. 문서를 믿고 period를 월로 가정해 매칭하면
// 실제 응답과 어긋나 막대가 하나도 안 그려진다 — 여기서 앞 7글자(YYYY-MM)
// 기준으로 직접 합산해 문서/실제 응답 어느 쪽이 와도 동작하게 만든다.
function aggregateBucketsByMonth(
  buckets: WorkoutReportBucket[],
): WorkoutReportBucket[] {
  const byMonth = new Map<string, Record<string, ExerciseMeasuresDto>>();
  buckets.forEach((bucket) => {
    const monthKey = bucket.period.slice(0, 7);
    const exercises = byMonth.get(monthKey) ?? {};
    Object.entries(bucket.exercises).forEach(([type, measures]) => {
      exercises[type] = exercises[type]
        ? addMeasures(exercises[type], measures)
        : measures;
    });
    byMonth.set(monthKey, exercises);
  });
  return Array.from(byMonth.entries()).map(([period, exercises]) => ({
    period,
    exercises,
  }));
}

function tickLabelFor(
  mode: ActivityPeriodMode,
  key: string,
  index: number,
  total: number,
): string {
  if (mode === "year") return `${Number(key.split("-")[1])}월`;
  const day = Number(key.split("-")[2]);
  if (mode === "week") {
    const [y, m, d] = key.split("-").map(Number);
    return WEEKDAY_LABELS[new Date(y, m - 1, d).getDay()];
  }
  // 월간은 31칸이 다 붙으면 너무 빽빽해 처음/끝/5의 배수 날짜만 찍는다.
  if (index === 0 || index === total - 1 || day % 5 === 0) return `${day}`;
  return "";
}

function detailHeaderFor(mode: ActivityPeriodMode, key: string): string {
  if (mode === "year") return `${Number(key.split("-")[1])}월`;
  const [y, m, d] = key.split("-").map(Number);
  return `${m}월 ${d}일 (${WEEKDAY_LABELS[new Date(y, m - 1, d).getDay()]})`;
}

// Figma "Activity Type Composition Card"의 title-3-bold 헤드라인 — 빈 상태의
// "아직 쌓인 활동이 없어요"와 짝을 이루는, 데이터가 있을 때의 문구.
const ACTIVITY_HEADLINE: Record<ActivityPeriodMode, string> = {
  week: "한 주동안 쌓인 활동이에요",
  month: "한 달동안 쌓인 활동이에요",
  year: "일 년동안 쌓인 활동이에요",
};

// Figma "운동 종류 칩"에 해당 — 이 화면에선 API의 exerciseTypes(그 기간에
// 실제 기록된 종류, 가나다순)로 채운다. "전체"는 별도 항목이 아니라
// excluded가 비어 있는 상태다.
function ExerciseTypeChip({
  label,
  active,
  dotColor,
  onPress,
}: {
  label: string;
  active: boolean;
  dotColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className="flex-row items-center gap-[6px] rounded-full border px-[14px] py-[8px]"
      onPress={onPress}
      style={{
        backgroundColor: active
          ? primitiveColors.charcoal["11"]
          : semanticColors["background-normal"],
        borderColor: active
          ? primitiveColors.charcoal["11"]
          : semanticColors["line-normal"],
      }}
    >
      {dotColor && (
        <View
          className="size-[7px] rounded-[2px]"
          style={{ backgroundColor: dotColor, opacity: active ? 1 : 0.5 }}
        />
      )}
      <ThemedText
        style={{
          color: active
            ? semanticColors["label-inverse"]
            : primitiveColors.charcoal["5"],
        }}
        typography="body-3-bold"
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ExerciseTypeChips({
  types,
  excluded,
  onToggleAll,
  onToggle,
}: {
  types: string[];
  excluded: Set<string>;
  onToggleAll: () => void;
  onToggle: (type: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-[6px]">
        <ExerciseTypeChip
          active={excluded.size === 0}
          label="전체"
          onPress={onToggleAll}
        />
        {types.map((type) => (
          <ExerciseTypeChip
            active={!excluded.has(type)}
            dotColor={colorForExerciseType(type)}
            key={type}
            label={type}
            onPress={() => onToggle(type)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function MetricTabs({
  value,
  onChange,
}: {
  value: keyof ExerciseMeasuresDto;
  onChange: (key: keyof ExerciseMeasuresDto) => void;
}) {
  return (
    <View className="flex-row border-b border-line-normal">
      {REPORT_METRICS.map((metric) => {
        const selected = metric.key === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className="flex-1 items-center pb-[10px]"
            key={metric.key}
            onPress={() => onChange(metric.key)}
            style={
              selected && {
                borderBottomColor: primitiveColors.charcoal["11"],
                borderBottomWidth: 2,
              }
            }
          >
            <ThemedText
              style={{
                color: selected
                  ? primitiveColors.charcoal["11"]
                  : primitiveColors.charcoal["4"],
              }}
              typography={selected ? "body-3-bold" : "body-3-medium"}
            >
              {`${metric.label} (${metric.unit})`}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

// 막대 그래프 영역 높이. 월간(최대 31칸)만 칸이 좁아 터치하기 어려워지므로
// 가로 스크롤 + 고정 칸 너비를 쓰고, 주간/연간(최대 12칸)은 카드 폭에 맞춰
// 균등하게 나눈다 — svg 없이 View만으로 그린다.
const CHART_HEIGHT = 140;
const MONTH_SLOT_WIDTH = 28;

function ReportChart({
  mode,
  keys,
  bucketMap,
  metricKey,
  selectedTypes,
  maxValue,
  selectedKey,
  onSelect,
}: {
  mode: ActivityPeriodMode;
  keys: string[];
  bucketMap: Map<string, WorkoutReportBucket>;
  metricKey: keyof ExerciseMeasuresDto;
  selectedTypes: string[];
  maxValue: number;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const columns = keys.map((key, index) => {
    const bucket = bucketMap.get(key);
    const bars = selectedTypes
      .map((type) => {
        const raw = bucket?.exercises[type]?.[metricKey];
        if (raw == null) return null;
        return { type, value: toDisplayUnitValue(metricKey, raw) };
      })
      .filter((bar): bar is { type: string; value: number } => bar !== null);
    const selected = key === selectedKey;
    return (
      <Pressable
        className="items-center justify-end"
        key={key}
        onPress={() => onSelect(key)}
        style={mode === "month" ? { width: MONTH_SLOT_WIDTH } : { flex: 1 }}
      >
        <View
          className="w-full flex-row items-end justify-center gap-[2px]"
          style={{ height: CHART_HEIGHT }}
        >
          {bars.map((bar) => (
            <View
              className="w-[6px] rounded-t-[2px]"
              key={bar.type}
              style={{
                backgroundColor: colorForExerciseType(bar.type),
                height: `${Math.max(3, (bar.value / maxValue) * 100)}%`,
                opacity: selectedKey === null || selected ? 1 : 0.45,
              }}
            />
          ))}
        </View>
        <ThemedText
          style={{
            color: selected
              ? primitiveColors.charcoal["11"]
              : primitiveColors.charcoal["4"],
          }}
          typography="caption-2-medium"
        >
          {tickLabelFor(mode, key, index, keys.length)}
        </ThemedText>
      </Pressable>
    );
  });

  if (mode === "month") {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row items-end gap-[2px]">{columns}</View>
      </ScrollView>
    );
  }
  return <View className="flex-row items-end">{columns}</View>;
}

// Figma "Metric / 활동 구성" (4273:22261) — dot(7px) + label(caption-1-bold)
// 한 줄, 그 아래 값(heading-1-bold) 한 줄. rounded-10 charcoal/0(#fafafa)
// 타일. 폭이 고정된 Figma와 달리 2열로 감싸 카드 폭에 맞춰 늘어나게 한다.
function MetricTile({
  metricKey,
  value,
}: {
  metricKey: keyof ExerciseMeasuresDto;
  value: number;
}) {
  const metric = REPORT_METRICS.find((m) => m.key === metricKey)!;
  return (
    <View className="h-[52px] grow basis-[48%] justify-center gap-[7px] rounded-[10px] bg-[#fafafa] px-[16px]">
      <View className="flex-row items-center gap-[4px]">
        <View
          className="size-[7px] rounded-[2px]"
          style={{ backgroundColor: METRIC_DOT_COLOR[metricKey] }}
        />
        <ThemedText
          style={{ color: primitiveColors.charcoal["11"] }}
          typography="caption-1-bold"
        >
          {metric.label}
        </ThemedText>
      </View>
      <ThemedText
        style={{ color: primitiveColors.charcoal["11"] }}
        typography="heading-1-bold"
      >
        {formatMeasureValue(metricKey, value)}
      </ThemedText>
    </View>
  );
}

// 날짜 상세 — 탭한 구간의 실제 기록을 지표와 무관하게 통째로 보여준다.
// 리포트 API가 이미 구간별 합계(Totals)를 다 갖고 있어 별도 조회 없이
// 그 값을 그대로 쓴다.
function ReportDetailCard({
  mode,
  bucket,
  bucketKey,
  types,
}: {
  mode: ActivityPeriodMode;
  bucket: WorkoutReportBucket | undefined;
  bucketKey: string;
  types: string[];
}) {
  const measuresByType = bucket?.exercises ?? {};
  const entries = types.filter((type) => measuresByType[type]);
  return (
    <View
      className="gap-[14px] rounded-[20px] border-line-subtle bg-background-normal px-[20px] py-[16px] shadow-[0px_4px_12px_0px_rgba(0,0,0,0.04)]"
      style={{ borderWidth: CARD_BORDER_WIDTH }}
    >
      <ThemedText
        style={{ color: primitiveColors.charcoal["11"] }}
        typography="body-3-bold"
      >
        {detailHeaderFor(mode, bucketKey)}
      </ThemedText>
      {entries.length === 0 ? (
        <ThemedText
          style={{ color: primitiveColors.charcoal["5"] }}
          typography="body-3-regular"
        >
          이 구간엔 선택한 운동 기록이 없어요.
        </ThemedText>
      ) : (
        entries.map((type, index) => {
          const measures = measuresByType[type];
          const measureKeys = REPORT_METRICS.map((m) => m.key).filter(
            (key) => measures[key] != null,
          );
          return (
            <View
              className={`gap-[8px] pt-[10px] ${
                index === 0 ? "" : "border-t border-line-normal"
              }`}
              key={type}
            >
              <ThemedText
                style={{ color: colorForExerciseType(type) }}
                typography="body-3-bold"
              >
                {type}
              </ThemedText>
              <View className="flex-row flex-wrap gap-[8px]">
                {measureKeys.map((key) => (
                  <MetricTile
                    key={key}
                    metricKey={key}
                    value={measures[key]!}
                  />
                ))}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

// signupDate를 아직 못 받았을 때의 대체값 — effectivePeriodRange가 항상
// "period 시작"보다 이르게 잡히도록 아주 오래전 날짜를 쓴다. 이 경우
// canGoPrevious가 false라 화면은 어차피 현재 기간에 머문다.
const EARLIEST_SIGNUP_FALLBACK = { year: 2000, month: 1, day: 1 };

type ActivitySummaryTabProps = {
  // GET /users/me의 createdAt(서버 LocalDateTime 문자열). 아직 못 받았거나
  // 실패했으면 null — 그동안은 현재 기간만 보여주고 양쪽 화살표를 잠근다.
  createdAt: string | null;
};

export function ActivitySummaryTab({ createdAt }: ActivitySummaryTabProps) {
  const today = todayCalendarDate();
  const signupDate = useMemo(
    () => (createdAt ? parseCalendarDate(createdAt) : null),
    [createdAt],
  );
  // 보고 있는 기간 하나와, 거기로 온 방향(제목 transition용)만 상태로 둔다.
  // mode를 바꾸면 그 mode의 "오늘이 속한 기간"으로 항상 리셋한다.
  const [navigation, setNavigation] = useState<{
    period: ActivityPeriod;
    direction: NavigationDirection;
  }>(() => ({ period: periodOf("week", today), direction: "reset" }));
  const { period, direction } = navigation;
  const mode = period.mode;

  // 이동 범위: 가입일이 속한 기간 ~ 오늘이 속한 기간. 미래 기간은 없다.
  const currentPeriod = periodOf(mode, today);
  const earliestPeriod = signupDate ? periodOf(mode, signupDate) : null;
  const canGoPrevious =
    earliestPeriod !== null && comparePeriod(period, earliestPeriod) > 0;
  const canGoNext = comparePeriod(period, currentPeriod) < 0;

  function selectMode(nextMode: ActivityPeriodMode) {
    if (nextMode === mode) return;
    setNavigation({ period: periodOf(nextMode, today), direction: "reset" });
  }

  const { from, to } = effectivePeriodRange(
    period,
    signupDate ?? EARLIEST_SIGNUP_FALLBACK,
    today,
  );

  // 운동 종류 필터는 기간을 넘나들며 유지한다(draft와 동일). 마지막 하나는
  // 끌 수 없다 — toggleExerciseType에서 막는다. exerciseTypesParam은 직전
  // 렌더까지 알던 report(= previousReport state)의 종류 목록을 기준으로
  // 계산한다 — 훅이 이번에 반환할 값을 그 훅의 입력으로 되먹이는 순환이
  // 아니라 "마지막으로 알던 값으로 다음 조회 파라미터를 만드는" 흐름이다.
  const [excludedTypes, setExcludedTypes] = useState<Set<string>>(new Set());
  const [previousReport, setPreviousReport] =
    useState<WorkoutReportResponse | null>(null);
  const exerciseTypesParam =
    excludedTypes.size === 0
      ? undefined
      : (previousReport?.exerciseTypes.filter(
          (type) => !excludedTypes.has(type),
        ) ?? []);

  const { report, loadError } = useWorkoutReport(from, to, exerciseTypesParam);

  const [metricKey, setMetricKey] =
    useState<keyof ExerciseMeasuresDto>("duration");
  const [selectedBucketKey, setSelectedBucketKey] = useState<string | null>(
    null,
  );
  // 연간 모드는 응답이 문서(월별)와 다르게 일별로 와도 동작하도록 항상
  // 월 단위로 다시 합친 버킷을 쓴다 — aggregateBucketsByMonth 주석 참고.
  const displayBuckets = report
    ? mode === "year"
      ? aggregateBucketsByMonth(report.buckets)
      : report.buckets
    : [];

  // report가 바뀔 때마다 종류 필터 기준값과 날짜 상세 선택(그 기간의 마지막
  // 구간)을 함께 리셋한다. 렌더 중 조건부 setState(React "Adjusting state
  // when a prop changes")는 dev의 StrictMode 이중 렌더와 만나면 report가
  // 바뀌는 도중의 "직전 렌더" 스냅샷을 기준으로 previousReport가 먼저
  // 갱신돼버려 선택이 실제 report보다 한 걸음 앞서는 버킷 키로 고정되는
  // 경우가 있었다(예: 오늘 버킷이 없는데도 선택은 오늘로 남음). 커밋 이후
  // 정확히 한 번 실행되는 effect로 옮겨 고쳤다.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviousReport(report);
    const buckets = report
      ? mode === "year"
        ? aggregateBucketsByMonth(report.buckets)
        : report.buckets
      : [];
    setSelectedBucketKey(
      buckets.length > 0 ? buckets[buckets.length - 1].period : null,
    );
  }, [report, mode]);

  function toggleExerciseType(type: string) {
    setExcludedTypes((prev) => {
      const availableCount = report?.exerciseTypes.length ?? 0;
      if (prev.has(type)) {
        const next = new Set(prev);
        next.delete(type);
        return next;
      }
      // 마지막 하나는 끌 수 없다.
      if (availableCount - prev.size <= 1) return prev;
      return new Set(prev).add(type);
    });
  }

  const availableTypes = report?.exerciseTypes ?? [];
  const selectedTypes = availableTypes.filter(
    (type) => !excludedTypes.has(type),
  );
  const bucketMap = new Map(
    displayBuckets.map((bucket) => [bucket.period, bucket] as const),
  );
  const bucketKeys = bucketKeysFor(mode, from, to);
  const maxValue = niceMax(
    Math.max(
      0,
      ...bucketKeys.flatMap((key) =>
        selectedTypes.map((type) => {
          const raw = bucketMap.get(key)?.exercises[type]?.[metricKey];
          return raw == null ? 0 : toDisplayUnitValue(metricKey, raw);
        }),
      ),
    ),
  );
  const metricConfig = REPORT_METRICS.find((m) => m.key === metricKey)!;
  const hasData = (report?.buckets.length ?? 0) > 0;

  return (
    <View className="items-center gap-[20px]">
      <PeriodSelector onChange={selectMode} value={mode} />
      {/* Figma "활동구성 영역" (4573:35654) — 375 캔버스에서 x24/w327, 즉 컨텐츠
          영역(px 20) 안에서 좌우 4씩 더 들어간 폭. 고정 327이 아니라 부모를
          채우고 mx 4로 표현해야 넓은 기기에서도 카드가 화면 좌우 24 inset을
          유지한다. 세로: 헤더 48 + gap 8 + 카드 320. */}
      <View className="mx-[4px] items-center gap-[8px] self-stretch">
        <PeriodNavigator
          canGoNext={canGoNext}
          canGoPrevious={canGoPrevious}
          direction={direction}
          onNext={() =>
            setNavigation({ period: nextPeriod(period), direction: "next" })
          }
          onPrevious={() =>
            setNavigation({
              period: previousPeriod(period),
              direction: "previous",
            })
          }
          period={period}
        />

        {!report &&
          (loadError ? (
            <View className="h-[320px] w-full items-center justify-center">
              <ThemedText
                style={{ color: primitiveColors.charcoal["5"] }}
                typography="caption-1-medium"
              >
                활동 리포트를 불러오지 못했어요
              </ThemedText>
            </View>
          ) : (
            <View className="h-[320px] w-full items-center justify-center">
              <ActivityIndicator color={semanticColors["label-normal"]} />
            </View>
          ))}

        {report && !hasData && <ActivityReportEmptyCard />}

        {report && hasData && (
          <View className="w-full gap-[16px]">
            {/* Figma "Activity Type Composition Card" (4391:23402) — 흰 카드
                rounded-20 + shadow(0/4/12 rgba(0,0,0,0.04)) + border-line-subtle,
                안쪽 24px 인셋. 헤더는 이모지 + charcoal-5 body-3-bold "👟 활동
                구성" 패턴을 그대로 쓴다. */}
            <View
              className="w-full gap-[16px] rounded-[20px] border-line-subtle bg-background-normal px-[20px] pb-[20px] pt-[20px] shadow-[0px_4px_12px_0px_rgba(0,0,0,0.04)]"
              style={{ borderWidth: CARD_BORDER_WIDTH }}
            >
              <View className="gap-[6px]">
                <ThemedText
                  style={{ color: primitiveColors.charcoal["5"] }}
                  typography="body-3-bold"
                >
                  {"👟 활동 구성"}
                </ThemedText>
                <ThemedText
                  style={{ color: primitiveColors.charcoal["11"] }}
                  typography="title-3-bold"
                >
                  {ACTIVITY_HEADLINE[mode]}
                </ThemedText>
                <ThemedText
                  style={{ color: primitiveColors.charcoal["5"] }}
                  typography="caption-1-medium"
                >
                  {`활동한 ${report.summary.activeDays}일 · 기록한 운동 ${report.summary.recordCount}건 · 기록 항목 ${report.summary.measureCount}개`}
                </ThemedText>
              </View>

              <ExerciseTypeChips
                excluded={excludedTypes}
                onToggle={toggleExerciseType}
                onToggleAll={() => setExcludedTypes(new Set())}
                types={availableTypes}
              />

              <View className="gap-[12px]">
                <MetricTabs onChange={setMetricKey} value={metricKey} />
                <ReportChart
                  bucketMap={bucketMap}
                  keys={bucketKeys}
                  maxValue={maxValue}
                  metricKey={metricKey}
                  mode={mode}
                  onSelect={setSelectedBucketKey}
                  selectedKey={selectedBucketKey}
                  selectedTypes={selectedTypes}
                />
                <ThemedText
                  className="text-right"
                  style={{ color: primitiveColors.charcoal["4"] }}
                  typography="caption-2-regular"
                >
                  {`표시 범위 0–${Number.isInteger(maxValue) ? maxValue : maxValue.toFixed(1)}${metricConfig.unit}`}
                </ThemedText>
              </View>

              <View className="flex-row flex-wrap gap-[12px]">
                {selectedTypes.map((type) => (
                  <View className="flex-row items-center gap-[6px]" key={type}>
                    <View
                      className="size-[7px] rounded-[2px]"
                      style={{ backgroundColor: colorForExerciseType(type) }}
                    />
                    <ThemedText
                      style={{ color: primitiveColors.charcoal["5"] }}
                      typography="caption-2-medium"
                    >
                      {type}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>

            {selectedBucketKey && (
              <ReportDetailCard
                bucket={bucketMap.get(selectedBucketKey)}
                bucketKey={selectedBucketKey}
                mode={mode}
                types={selectedTypes}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}
