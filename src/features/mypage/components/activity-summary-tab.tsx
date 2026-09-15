import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
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
  nextPeriod,
  parseCalendarDate,
  periodLabel,
  periodOf,
  previousPeriod,
  todayCalendarDate,
} from "@/features/mypage/activity-report-period";

// 활동 리포트 탭 — Figma 4573:35652 "컨텐츠 영역". 기간 선택(주간/월간/연간)과
// 기간 이동(가입일이 속한 기간 ~ 오늘이 속한 기간)만 동작하고, 카드는 아직
// 통계 API 연동 전이라 Empty 상태 정적 UI다. 간격/크기는 px 값으로 쓴다 —
// NativeWind rem=14라 rem 클래스는 Figma px의 0.875배로 렌더된다.

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
        <ActivityReportEmptyCard />
      </View>
    </View>
  );
}
