import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Link, router, useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { semanticColors } from "@/constants/tokens";
import { StepCountCard } from "@/features/healthkit/components/step-count-card";
import {
  MissionCard,
  type MissionStatus,
  TodayWorkoutCard,
  type TodayWorkoutInstance,
} from "@/features/workout-plan/components/home-workout-cards";
import { WorkoutPlanDetailBottomSheet } from "@/features/workout-plan/components/workout-plan-detail-bottom-sheet";
import {
  createMockWorkoutPlan,
  getWorkoutPlanSummary,
  type WorkoutPlanDraft,
} from "@/features/workout-plan/model";
import { RecordMethodModal } from "@/features/upload/components/record-method-modal";
import { useDailyPhotoStore } from "@/features/upload/daily-photo-store";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";
import { useTheme } from "@/hooks/use-theme";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

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
  const [todayWorkouts, setTodayWorkouts] = useState<TodayWorkoutInstance[]>(
    [],
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
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
        setTodayWorkouts((workouts) =>
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
      setTodayWorkouts((workouts) =>
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
  const weeks = buildCalendarWeeks(today);
  const monthLabel = `${today.getFullYear()}년 ${today.getMonth() + 1}월`;
  const todayLabel = `${today.getMonth() + 1}월 ${today.getDate()}일`;
  const doneCount = todayWorkouts.filter((workout) => workout.isDone).length;
  const hasCompletedTodayWorkout = todayWorkouts.some(
    (workout) => workout.isDone,
  );
  const isTodayRecorded = doneCount > 0;
  const todayPhotoUrl = todayWorkouts.find(
    (workout) => workout.photoUrl,
  )?.photoUrl;
  const monthlyRecordCount =
    MOCK_PHOTO_DAYS.size +
    (isTodayRecorded && !MOCK_PHOTO_DAYS.has(today.getDate()) ? 1 : 0);

  const selectedPlan =
    savedWorkoutPlans.find((plan) => plan.id === selectedPlanId) ?? null;

  function addSavedPlanToToday(plan: WorkoutPlanDraft) {
    setTodayWorkouts((workouts) => [
      ...workouts,
      createTodayWorkoutInstance(plan),
    ]);
  }

  function addQuickSavedPlan() {
    setSavedWorkoutPlans((plans) => [
      ...plans,
      {
        ...createMockWorkoutPlan(`saved-plan-${Date.now()}`, "새 운동 계획"),
        selectedGoalTypes: ["time"],
        goalValues: {
          time: 30,
          distance: 1.4,
          reps: 10,
          sets: 3,
        },
        memo: "",
      },
    ]);
  }

  // 오늘의 미션 체크와 동일한 패턴: 빈 체크를 탭하면 즉시 낙관적으로 완료
  // 처리하는 동시에 같은 이벤트에서 기록 방식 선택 모달을 연다. 이미 완료된
  // 항목을 다시 누르면(완료 취소) 모달 없이 즉시 되돌린다.
  function toggleTodayWorkoutDone(instanceId: string) {
    const workout = todayWorkouts.find((item) => item.id === instanceId);
    if (!workout) return;

    if (workout.isDone) {
      setTodayWorkouts((workouts) =>
        workouts.map((item) =>
          item.id === instanceId ? { ...item, isDone: false } : item,
        ),
      );
      return;
    }

    setTodayWorkouts((workouts) =>
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
      setTodayWorkouts((workouts) =>
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

          <View className="gap-1.5">
            <Pressable
              className="flex-row items-center gap-1"
              accessibilityRole="button"
              accessibilityLabel="월 선택"
              onPress={() => console.log("month picker pressed")}
            >
              <ThemedText typography="body-3-medium" themeColor="textSecondary">
                {monthLabel}
              </ThemedText>
              <Ionicons
                name="chevron-down"
                size={12}
                color={theme.textSecondary}
              />
            </Pressable>
            <View className="flex-row items-baseline gap-1.5">
              <ThemedText typography="display-1-bold">
                {monthlyRecordCount}
              </ThemedText>
              <ThemedText typography="body-2-medium" themeColor="textSecondary">
                일 기록 / 이번 달
              </ThemedText>
            </View>
          </View>

          <View className="gap-1.5">
            <View className="flex-row items-center justify-between">
              {WEEKDAY_LABELS.map((label) => (
                <View key={label} className="w-[43px] items-center">
                  <ThemedText
                    typography="caption-1-bold"
                    themeColor="textSecondary"
                  >
                    {label}
                  </ThemedText>
                </View>
              ))}
            </View>

            {weeks.map((week, weekIndex) => (
              <View
                key={weekIndex}
                className="flex-row items-center justify-between"
              >
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return (
                      <View key={dayIndex} className="h-[60px] w-[43px]" />
                    );
                  }

                  const isToday = day === today.getDate();
                  const hasPhoto =
                    MOCK_PHOTO_DAYS.has(day) || (isToday && isTodayRecorded);
                  const hasMultiplePhotos = MOCK_MULTI_PHOTO_DAYS.has(day);

                  const textColor =
                    isToday && todayPhotoUrl
                      ? "#ffffff"
                      : isToday
                        ? semanticColors["label-normal"]
                        : hasPhoto
                          ? semanticColors["label-normal"]
                          : day > today.getDate()
                            ? semanticColors["label-disabled"]
                            : semanticColors["label-subtle"];

                  return (
                    <View
                      key={dayIndex}
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
                      {hasMultiplePhotos && !isToday && (
                        <View
                          className="absolute -top-1 left-2 h-[52px] w-[35px] rounded-lg border-[1.5px] border-background-normal bg-fill-subtle"
                          style={{ zIndex: -1 }}
                        />
                      )}
                      <ThemedText
                        typography={
                          isToday ? "caption-1-bold" : "caption-1-regular"
                        }
                        style={{ color: textColor }}
                      >
                        {day}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <MissionCard
            canDismiss={hasCompletedTodayWorkout}
            onAccept={() => setMissionStatus("accepted")}
            onDismiss={() => setMissionStatus("dismissed")}
            onReveal={() => setMissionStatus("revealed")}
            onToggleComplete={handleMissionCompletePress}
            status={missionStatus}
          />

          <TodayWorkoutCard
            dateLabel={todayLabel}
            expanded={isTodayCardExpanded}
            onAddNewPlan={addQuickSavedPlan}
            onAddSavedPlan={addSavedPlanToToday}
            onOpenSavedPlan={setSelectedPlanId}
            onRecordWorkout={() => console.log("운동 기록하기 pressed")}
            onToggleExpanded={() =>
              setIsTodayCardExpanded((expanded) => !expanded)
            }
            onToggleTodayWorkout={toggleTodayWorkoutDone}
            savedWorkoutPlans={savedWorkoutPlans}
            todayWorkouts={todayWorkouts}
          />

          <View className="flex-row items-center gap-3.5 rounded-2xl bg-fill-subtle px-[18px] py-4">
            <Ionicons name="camera-outline" size={26} color={theme.text} />
            <View className="flex-1 gap-0.5">
              <ThemedText typography="body-3-bold">
                운동한 날을 사진으로 남겨보세요
              </ThemedText>
              <ThemedText
                typography="caption-1-regular"
                style={{ color: semanticColors["label-disabled"] }}
              >
                기록한 사진이 이 달력에 쌓여요
              </ThemedText>
            </View>
          </View>

          {Platform.OS === "ios" && (
            <View className="gap-3">
              <Link href="/map" asChild>
                <Pressable
                  className="h-11 items-center justify-center rounded-full bg-black px-6 dark:bg-white"
                  style={({ pressed }) => pressed && { opacity: 0.7 }}
                >
                  <Text className="text-base font-semibold text-white dark:text-black">
                    지도 들어가기
                  </Text>
                </Pressable>
              </Link>
              <StepCountCard />
            </View>
          )}
          {Platform.OS === "android" && <StepCountCard />}
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
    </ThemedView>
  );
}
