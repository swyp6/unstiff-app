import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useIsFocused } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { semanticColors } from "@/constants/tokens";
import {
  MissionCard,
  type MissionStatus,
  TodayWorkoutCard,
  type TodayWorkoutInstance,
} from "@/features/workout-plan/components/home-workout-cards";
import { WorkoutPlanDetailBottomSheet } from "@/features/workout-plan/components/workout-plan-detail-bottom-sheet";
import { WorkoutPlanEditSheet } from "@/features/workout-plan/components/workout-plan-edit-sheet";
import {
  createBlankWorkoutPlanDraft,
  createMockWorkoutPlan,
  getWorkoutPlanSummary,
  type WorkoutPlanDraft,
} from "@/features/workout-plan/model";
import { RecordMethodModal } from "@/features/upload/components/record-method-modal";
import { useDailyPhotoStore } from "@/features/upload/daily-photo-store";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";
import { useTheme } from "@/hooks/use-theme";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_SWIPE_THRESHOLD = 60;

// 캘린더 날짜 셀(43x60pt) 표시 크기의 2배(레티나 기준)로 요청 — 프리셋
// (w200_h200 등)은 정사각형 프로필용이라 이 좁고 긴 셀 비율에 맞지 않는다.
const CALENDAR_DAY_THUMBNAIL_SIZE = { width: 86, height: 120 };

// Mock history for the current month — no records API exists yet, so this
// stands in for "days with a photo" and "days with more than one photo"
// until real data is wired up. Matches the Figma "계획됨"/"완료" examples.
const MOCK_PHOTO_DAYS = new Set([4, 5, 6, 8, 10, 11, 12, 13, 14, 17, 18]);
const MOCK_MULTI_PHOTO_DAYS = new Set([6, 11]);

// Matches the mission title MissionCard renders for its "revealed"/"accepted"
// states — no missions API exists yet, so both are the same mock literal.
const MISSION_TITLE = "15분 걷기";
// Sentinel planItemId so the shared daily-photo-store result can be routed
// to the mission's completion instead of a todayWorkouts entry — distinct
// from the `today-${Date.now()}-${counter}` ids createTodayWorkoutInstance
// generates.
const MISSION_PLAN_ITEM_ID = "daily-mission";

const INITIAL_SAVED_WORKOUT_PLANS: WorkoutPlanDraft[] = [
  createMockWorkoutPlan("saved-plan-1", "15분 가볍게 뛰기"),
  {
    ...createMockWorkoutPlan("saved-plan-2", "퇴근 후 러닝"),
    selectedGoalTypes: ["distance"],
    goalValues: {
      time: 30,
      distance: 3,
      reps: 10,
      sets: 3,
    },
    memo: "퇴근 후 가볍게 달리기",
  },
];

type DayRecord = {
  missionTitle: string;
  workouts: { title: string; subtitle: string }[];
};

// 오늘이 아닌 날을 탭했을 때 보여줄 목데이터. MOCK_PHOTO_DAYS/MOCK_MULTI_PHOTO_DAYS
// (이번 달 캘린더에 사진 배경으로 이미 표시 중인 날짜)와 신호를 맞춰서, 캘린더에서
// 사진이 있는 것처럼 보이는 날을 탭하면 실제로 미션·운동 기록이 나오게 한다.
function getMockDayRecord(date: Date, today: Date): DayRecord | null {
  const isSameMonthAsToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth();
  if (!isSameMonthAsToday || !MOCK_PHOTO_DAYS.has(date.getDate())) return null;

  const workoutCount = MOCK_MULTI_PHOTO_DAYS.has(date.getDate()) ? 2 : 1;
  return {
    missionTitle: MISSION_TITLE,
    workouts: INITIAL_SAVED_WORKOUT_PLANS.slice(0, workoutCount).map(
      (plan) => ({
        title: plan.title,
        subtitle: getWorkoutPlanSummary(plan),
      }),
    ),
  };
}

let nextTodayWorkoutInstanceId = 0;

function createTodayWorkoutInstance(
  plan: WorkoutPlanDraft,
): TodayWorkoutInstance {
  nextTodayWorkoutInstanceId += 1;
  return {
    id: `today-${Date.now()}-${nextTodayWorkoutInstanceId}`,
    sourcePlanId: plan.id,
    title: plan.title,
    subtitle: getWorkoutPlanSummary(plan),
    isDone: false,
  };
}

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
      {WEEKDAY_LABELS.map((label) => (
        <View key={label} className="w-[43px] items-center">
          <ThemedText typography="caption-1-bold" themeColor="textSecondary">
            {label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

// 오늘이 아닌 날을 탭했을 때 보여주는 읽기 전용 카드. 미션 "받기"/운동 체크 같은
// 상호작용은 없다 — 그 날 완료된 미션·운동을 "지난 운동" 하나의 체크 목록으로
// 보여주기만 한다 (Figma node 2910-4400: 미션/운동을 따로 나누지 않고 완료
// 표시가 된 항목을 한 리스트로 합쳐서 보여준다).
function DayRecordCard({
  dateLabel,
  record,
  expanded,
  onToggleExpanded,
}: {
  dateLabel: string;
  record: DayRecord | null;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const entries = record
    ? [{ title: record.missionTitle, subtitle: "미션" }, ...record.workouts]
    : [];

  return (
    <View className="rounded-[20px] border border-line-normal bg-background-normal">
      <Pressable
        accessibilityRole="button"
        className="h-[60px] flex-row items-center justify-between px-5"
        onPress={onToggleExpanded}
      >
        <View className="gap-0.5">
          <ThemedText typography="body-2-bold">지난 운동</ThemedText>
          <ThemedText typography="caption-1-medium" themeColor="textSecondary">
            {dateLabel}
          </ThemedText>
        </View>
        <Ionicons
          color={semanticColors["label-subtle"]}
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
        />
      </Pressable>

      {expanded && (
        <View className="px-5 pb-5">
          <View className="h-px bg-line-subtle" />

          <View className="py-2">
            {entries.length === 0 ? (
              <View className="items-center py-6">
                <ThemedText
                  typography="body-3-medium"
                  themeColor="textSecondary"
                >
                  이 날의 기록이 없어요
                </ThemedText>
              </View>
            ) : (
              entries.map((entry, index) => (
                <View
                  key={index}
                  className="flex-row items-center gap-3 border-b border-line-subtle py-3"
                >
                  <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-label-normal">
                    <Ionicons
                      color={semanticColors["label-inverse"]}
                      name="checkmark"
                      size={16}
                    />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <ThemedText
                      typography="body-3-bold"
                      themeColor="textSecondary"
                      style={{ textDecorationLine: "line-through" }}
                    >
                      {entry.title}
                    </ThemedText>
                    <ThemedText
                      typography="caption-1-regular"
                      style={{ color: semanticColors["label-disabled"] }}
                    >
                      {entry.subtitle}
                    </ThemedText>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  // Native tabs render every tab's screen eagerly, so without this guard the
  // workout plan detail bottom sheet's Modal could stay visible over the
  // chat/mypage tabs after switching away without closing it first.
  const isFocused = useIsFocused();
  const [isTodayCardExpanded, setIsTodayCardExpanded] = useState(true);
  const [missionStatus, setMissionStatus] =
    useState<MissionStatus>("scheduled");
  const [savedWorkoutPlans, setSavedWorkoutPlans] = useState(
    INITIAL_SAVED_WORKOUT_PLANS,
  );
  // 날짜별 오늘의 운동 목록. 오늘뿐 아니라 미래 날짜에 담아둔 운동도 그 날짜의
  // 캘린더 점 표시(hasScheduledWorkout)에 반영해야 해서 날짜 문자열로 나눠
  // 저장한다.
  const [workoutsByDate, setWorkoutsByDate] = useState<
    Record<string, TodayWorkoutInstance[]>
  >({});

  function getWorkoutsForDate(date: Date): TodayWorkoutInstance[] {
    return workoutsByDate[date.toDateString()] ?? [];
  }

  function updateWorkoutsForDate(
    date: Date,
    updater: (workouts: TodayWorkoutInstance[]) => TodayWorkoutInstance[],
  ) {
    const key = date.toDateString();
    setWorkoutsByDate((current) => ({
      ...current,
      [key]: updater(current[key] ?? []),
    }));
  }
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  // "신규 운동 계획 추가"로 연 빈 계획 초안. null이면 시트가 안 보인다.
  const [newPlanDraft, setNewPlanDraft] = useState<WorkoutPlanDraft | null>(
    null,
  );
  const [isRecordMethodModalVisible, setIsRecordMethodModalVisible] =
    useState(false);
  // 체크 탭 즉시 완료 상태를 낙관적으로 바꾸지만, 기록 방식(사진 촬영/앨범/
  // 사진 없이)이 아직 확정되지 않은 동안에는 어떤 항목(미션 또는 특정 오늘의
  // 운동 instance)이 대기 중인지 이 id로 남겨둔다 — 확정 없이 홈으로
  // 돌아오면 이 값을 보고 rollback한다. null이면 대기 중인 항목이 없다.
  const [pendingRecordPlanItemId, setPendingRecordPlanItemId] = useState<
    string | null
  >(null);
  const [recordModalTitle, setRecordModalTitle] = useState(MISSION_TITLE);
  const [viewedMonth, setViewedMonth] = useState(() => new Date());
  // 캘린더에서 탭한 날짜. 오늘이면 실제 미션/오늘의 운동(상호작용 가능)을 보여주고,
  // 다른 날이면 그날의 미션·운동 목데이터를 읽기 전용으로 보여준다 — 미션 "받기"는
  // 오늘 날짜에만 가능하므로 다른 날엔 그 UI 자체를 노출하지 않는다.
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(
    () => new Date(),
  );

  // 카메라 화면(/camera)은 라우트 파라미터로 결과를 돌려줄 수 없어 이 스토어를
  // 거쳐 전달한다 — planItemId가 미션이면 미션을, 아니면 해당 today workout
  // instance를 완료 처리하고 사진 URL을 붙인다.
  useEffect(() => {
    return useDailyPhotoStore.subscribe((state) => {
      if (!state.result) return;
      const { planItemId, secureUrl } = state.result;
      if (planItemId === MISSION_PLAN_ITEM_ID) {
        setMissionStatus("completed");
      } else {
        updateWorkoutsForDate(new Date(), (workouts) =>
          workouts.map((workout) =>
            workout.id === planItemId
              ? { ...workout, isDone: true, photoUrl: secureUrl }
              : workout,
          ),
        );
      }
      setPendingRecordPlanItemId(null);
      useDailyPhotoStore.getState().clearResult();
    });
  }, []);

  // 카메라 close, 앨범 선택 취소 후 이탈, 업로드 실패 등 기록을 확정하지
  // 못한 채(=pendingRecordPlanItemId가 여전히 남은 채) 홈 탭으로 다시
  // 포커스가 돌아오면 낙관적으로 켰던 체크를 되돌린다. isFocused가 마운트
  // 시점부터 이미 true이므로 "false→true 전환"만 감지해야 한다.
  const wasFocusedRef = useRef(isFocused);
  useEffect(() => {
    const wasFocused = wasFocusedRef.current;
    wasFocusedRef.current = isFocused;
    const regainedFocusWithPending =
      !wasFocused && isFocused && pendingRecordPlanItemId !== null;

    if (
      regainedFocusWithPending &&
      pendingRecordPlanItemId === MISSION_PLAN_ITEM_ID
    ) {
      setMissionStatus("accepted");
    }
    if (
      regainedFocusWithPending &&
      pendingRecordPlanItemId !== MISSION_PLAN_ITEM_ID
    ) {
      updateWorkoutsForDate(new Date(), (workouts) =>
        workouts.map((workout) =>
          workout.id === pendingRecordPlanItemId
            ? { ...workout, isDone: false }
            : workout,
        ),
      );
    }
    if (regainedFocusWithPending) {
      setPendingRecordPlanItemId(null);
    }
  }, [isFocused, pendingRecordPlanItemId]);

  const today = new Date();
  const todayWorkouts = getWorkoutsForDate(today);
  const selectedDateWorkouts = getWorkoutsForDate(selectedCalendarDate);
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
  const monthLabel = `${viewedMonth.getFullYear()}년 ${viewedMonth.getMonth() + 1}월`;
  const todayLabel = `${today.getMonth() + 1}월 ${today.getDate()}일`;
  const doneCount = todayWorkouts.filter((workout) => workout.isDone).length;
  const hasCompletedTodayWorkout = todayWorkouts.some(
    (workout) => workout.isDone,
  );
  const isTodayRecorded = doneCount > 0;
  const todayPhotoUrl = todayWorkouts.find(
    (workout) => workout.photoUrl,
  )?.photoUrl;
  const isSelectedDateToday =
    selectedCalendarDate.toDateString() === today.toDateString();
  // 오늘 이후(미래) 날짜는 아직 안 지난 날이라 "운동 추가"는 계속 가능해야
  // 하고, 미션 "받기"만 오늘에만 되는 것이므로 제외한다. isSelectedDateToday를
  // 먼저 걸러낸 뒤 비교하므로 시각(time-of-day) 차이는 결과에 영향 없다.
  const isSelectedDateFuture =
    !isSelectedDateToday && selectedCalendarDate > today;
  const selectedDateLabel = `${selectedCalendarDate.getMonth() + 1}월 ${selectedCalendarDate.getDate()}일`;
  const selectedDayRecord =
    isSelectedDateToday || isSelectedDateFuture
      ? null
      : getMockDayRecord(selectedCalendarDate, today);

  // 드래그 중엔 캘린더가 손가락을 그대로 따라가다가(dragX), 손을 떼면 임계값을
  // 넘었는지에 따라 다음/이전 달 패널 쪽으로 마저 넘어가거나(withTiming) 제자리로
  // 되돌아온다(withSpring). calendarWidth는 실제 달(가운데 패널) 기준 오프셋이다.
  const dragX = useSharedValue(0);
  const [calendarWidth, setCalendarWidth] = useState(0);

  const commitMonthChange = useCallback((delta: 1 | -1) => {
    setViewedMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() + delta, 1),
    );
  }, []);

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
          const hasPhoto =
            (isThisMonth && MOCK_PHOTO_DAYS.has(day)) ||
            (isToday && isTodayRecorded);
          const hasMultiplePhotos =
            isThisMonth && MOCK_MULTI_PHOTO_DAYS.has(day);
          const cellDate = new Date(
            monthDate.getFullYear(),
            monthDate.getMonth(),
            day,
          );
          const isFutureDay =
            cellDate >
            new Date(today.getFullYear(), today.getMonth(), today.getDate());
          // 미래 날짜에 이미 담아둔 운동이 있으면 점으로 표시한다(Figma node
          // 2918-4983의 31일 셀). 사진 배경(hasPhoto)은 지난 날짜 전용이라
          // 미래 날짜와 겹칠 일이 없다.
          const hasScheduledWorkout =
            isFutureDay && getWorkoutsForDate(cellDate).length > 0;

          const textColor =
            isToday && todayPhotoUrl
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
              onPress={() => setSelectedCalendarDate(cellDate)}
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
                {isToday && todayPhotoUrl && (
                  <>
                    <Image
                      source={{
                        uri: getOptimizedImageUrl(todayPhotoUrl, {
                          ...CALENDAR_DAY_THUMBNAIL_SIZE,
                          crop: "fill",
                        }),
                      }}
                      style={{ position: "absolute", inset: 0 }}
                      contentFit="cover"
                    />
                    <View
                      className="absolute inset-0"
                      style={{ backgroundColor: "rgba(0,0,0,0.28)" }}
                    />
                  </>
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

  const selectedPlan =
    savedWorkoutPlans.find((plan) => plan.id === selectedPlanId) ?? null;

  function addSavedPlanToDate(plan: WorkoutPlanDraft, date: Date) {
    updateWorkoutsForDate(date, (workouts) => [
      ...workouts,
      createTodayWorkoutInstance(plan),
    ]);
  }

  function openNewPlanSheet() {
    setNewPlanDraft(createBlankWorkoutPlanDraft(`saved-plan-${Date.now()}`));
  }

  function saveNewPlan(plan: WorkoutPlanDraft, addToToday: boolean) {
    // 새 루틴은 항상 저장된 운동 계획에 들어간다. "오늘만 할래요"가 켜져
    // 있을 때만 오늘의 운동에도 같이 추가한다(기본값은 꺼짐).
    setSavedWorkoutPlans((plans) => [...plans, plan]);
    if (addToToday) {
      addSavedPlanToDate(plan, today);
    }
    setNewPlanDraft(null);
  }

  // 오늘의 미션 체크와 동일한 패턴: 빈 체크를 탭하면 즉시 낙관적으로 완료
  // 처리하는 동시에 같은 이벤트에서 기록 방식 선택 모달을 연다. 이미 완료된
  // 항목을 다시 누르면(완료 취소) 모달 없이 즉시 되돌린다.
  function toggleTodayWorkoutDone(instanceId: string) {
    const workout = todayWorkouts.find((item) => item.id === instanceId);
    if (!workout) return;

    if (workout.isDone) {
      updateWorkoutsForDate(today, (workouts) =>
        workouts.map((item) =>
          item.id === instanceId ? { ...item, isDone: false } : item,
        ),
      );
      return;
    }

    updateWorkoutsForDate(today, (workouts) =>
      workouts.map((item) =>
        item.id === instanceId ? { ...item, isDone: true } : item,
      ),
    );
    openRecordMethodModal(instanceId, workout.title);
  }

  function updateSavedPlan(updatedPlan: WorkoutPlanDraft) {
    setSavedWorkoutPlans((plans) =>
      plans.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan)),
    );
  }

  function deleteSavedPlan(planId: string) {
    setSavedWorkoutPlans((plans) => plans.filter((plan) => plan.id !== planId));
    setSelectedPlanId(null);
  }

  // 빈 체크를 탭하면 즉시(optimistic) 체크 UI를 켜는 동시에 같은 이벤트에서
  // 기록 방식 선택 모달을 연다 — 모달 결과를 기다렸다가 그때 체크하지 않는다.
  // 이미 체크된 상태를 다시 누르면(완료 취소) 기존처럼 즉시 되돌린다.
  function openRecordMethodModal(planItemId: string, title: string) {
    setPendingRecordPlanItemId(planItemId);
    setRecordModalTitle(title);
    setIsRecordMethodModalVisible(true);
  }

  function handleMissionCompletePress() {
    if (missionStatus === "completed") {
      setMissionStatus("accepted");
      return;
    }
    setMissionStatus("completed");
    openRecordMethodModal(MISSION_PLAN_ITEM_ID, MISSION_TITLE);
  }

  // 기록 방식 모달을 고르지 않고 닫으면(백드롭 탭) 낙관적으로 켰던 체크를
  // 되돌린다 — 카메라로 넘어가거나 "사진 없이 기록하기"를 고르는 경우는
  // 각자 별도 핸들러가 모달을 닫으므로 여기로 오지 않는다.
  function dismissRecordMethodModal() {
    setIsRecordMethodModalVisible(false);
    if (!pendingRecordPlanItemId) return;
    if (pendingRecordPlanItemId === MISSION_PLAN_ITEM_ID) {
      setMissionStatus("accepted");
    } else {
      updateWorkoutsForDate(today, (workouts) =>
        workouts.map((workout) =>
          workout.id === pendingRecordPlanItemId
            ? { ...workout, isDone: false }
            : workout,
        ),
      );
    }
    setPendingRecordPlanItemId(null);
  }

  function completeRecordWithoutPhoto() {
    setIsRecordMethodModalVisible(false);
    setPendingRecordPlanItemId(null);
  }

  function startRecordPhotoCapture() {
    setIsRecordMethodModalVisible(false);
    router.push({
      pathname: "/camera",
      params: {
        title: recordModalTitle,
        planItemId: pendingRecordPlanItemId ?? MISSION_PLAN_ITEM_ID,
      },
    });
  }

  function startRecordLibraryPick() {
    setIsRecordMethodModalVisible(false);
    router.push({
      pathname: "/camera",
      params: {
        title: recordModalTitle,
        planItemId: pendingRecordPlanItemId ?? MISSION_PLAN_ITEM_ID,
        source: "library",
      },
    });
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.three,
            paddingBottom: Spacing.four,
            gap: Spacing.four,
          }}
        >
          <View className="h-10 flex-row items-center justify-between">
            <ThemedText typography="title-2-bold">LOGO</ThemedText>
            <Pressable
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="알림"
              onPress={() => console.log("notifications pressed")}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color={theme.text}
              />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1">
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="이전 달"
                onPress={goToPreviousMonth}
              >
                <Ionicons name="caret-back" size={10} color={theme.text} />
              </Pressable>
              <ThemedText typography="title-3-bold">{monthLabel}</ThemedText>
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="다음 달"
                onPress={goToNextMonth}
              >
                <Ionicons name="caret-forward" size={10} color={theme.text} />
              </Pressable>
            </View>

            <Pressable
              className="flex-row items-center gap-1 rounded-full bg-fill-subtle px-3 py-1.5"
              accessibilityRole="button"
              accessibilityLabel="연속 스트릭"
              onPress={() => console.log("streak badge pressed")}
            >
              <Ionicons name="flame" size={16} color={theme.text} />
              <ThemedText typography="caption-1-medium">연속 스트릭</ThemedText>
            </Pressable>
          </View>

          <GestureDetector gesture={monthSwipeGesture}>
            <View
              onLayout={(event) =>
                setCalendarWidth(event.nativeEvent.layout.width)
              }
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

          {isSelectedDateToday && (
            <MissionCard
              canDismiss={hasCompletedTodayWorkout}
              onAccept={() => setMissionStatus("accepted")}
              onDismiss={() => setMissionStatus("dismissed")}
              onReveal={() => setMissionStatus("revealed")}
              onToggleComplete={handleMissionCompletePress}
              status={missionStatus}
            />
          )}

          {isSelectedDateToday || isSelectedDateFuture ? (
            <TodayWorkoutCard
              dateLabel={isSelectedDateToday ? todayLabel : selectedDateLabel}
              emptyStateLabel={
                isSelectedDateToday
                  ? "오늘 담은 운동이 없어요"
                  : "담은 운동이 없어요"
              }
              expanded={isTodayCardExpanded}
              onAddNewPlan={openNewPlanSheet}
              onAddSavedPlan={(plan) =>
                addSavedPlanToDate(plan, selectedCalendarDate)
              }
              onOpenSavedPlan={setSelectedPlanId}
              onToggleExpanded={() =>
                setIsTodayCardExpanded((expanded) => !expanded)
              }
              onToggleTodayWorkout={toggleTodayWorkoutDone}
              readOnly={!isSelectedDateToday}
              savedWorkoutPlans={savedWorkoutPlans}
              title={isSelectedDateToday ? "오늘의 운동" : "예정된 운동"}
              todayWorkouts={selectedDateWorkouts}
            />
          ) : (
            <DayRecordCard
              dateLabel={selectedDateLabel}
              record={selectedDayRecord}
              expanded={isTodayCardExpanded}
              onToggleExpanded={() =>
                setIsTodayCardExpanded((expanded) => !expanded)
              }
            />
          )}
        </ScrollView>
      </SafeAreaView>

      {selectedPlan && isFocused && (
        <WorkoutPlanDetailBottomSheet
          key={selectedPlan.id}
          onClose={() => setSelectedPlanId(null)}
          onDelete={deleteSavedPlan}
          onUpdate={updateSavedPlan}
          plan={selectedPlan}
        />
      )}

      <RecordMethodModal
        onClose={dismissRecordMethodModal}
        onPickFromLibrary={startRecordLibraryPick}
        onSkipPhoto={completeRecordWithoutPhoto}
        onTakePhoto={startRecordPhotoCapture}
        title={recordModalTitle}
        visible={isRecordMethodModalVisible && isFocused}
      />

      {newPlanDraft && isFocused && (
        <WorkoutPlanEditSheet
          onClose={() => setNewPlanDraft(null)}
          onDelete={() => setNewPlanDraft(null)}
          onSave={saveNewPlan}
          saveLabel="루틴 추가하기"
          showDelete={false}
          showAddToTodayToggle
          title="루틴 추가"
          value={newPlanDraft}
          visible
        />
      )}
    </ThemedView>
  );
}
