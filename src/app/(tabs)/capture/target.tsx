import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";
import { getDailyMission } from "@/features/missions/api";
import type { DailyMissionResponse } from "@/features/missions/types";
import {
  createDailyPlan,
  createPlanPreset,
  getDailyPlans,
  getPlanPresets,
} from "@/features/workout-plan/api";
import type { DailyPlanResponse } from "@/features/workout-plan/types";
import { WorkoutPlanEditSheet } from "@/features/workout-plan/components/workout-plan-edit-sheet";
import {
  createBlankWorkoutPlanDraft,
  fromPlanPresetResponse,
  getWorkoutPlanSummary,
  toPlanRequestFields,
  type WorkoutPlanDraft,
} from "@/features/workout-plan/model";

function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Figma 3642:42108 "촬영결과기입" — 하단 카메라 탭(capture/index)에서
// 찍은 사진(대상이 아직 없음)을 어떤 실제 기록(오늘의 미션/오늘의
// 운동/루틴)에 연결할지 고르는 화면. 카메라 탭의 nested route(capture/
// _layout.tsx의 Stack)로 push되어 Native TabBar가 계속 보인다. PLAN/
// MISSION에서 곧장 들어오는 contextual 흐름은 이 화면을 거치지 않는다
// (camera.tsx가 refType/refId를 이미 알고 있으면 record-editor로 바로
// 이동, 그쪽은 root Stack의 fullScreenModal이라 탭바가 없다).
export default function RecordTargetScreen() {
  const isFocused = useIsFocused();
  const photo = useRecordFlowStore((state) => state.photo);

  const [mission, setMission] = useState<DailyMissionResponse | null>(null);
  const [todayWorkouts, setTodayWorkouts] = useState<DailyPlanResponse[]>([]);
  const [routines, setRoutines] = useState<WorkoutPlanDraft[]>([]);
  const [isCreatingDailyPlan, setIsCreatingDailyPlan] = useState(false);
  const [newRoutineDraft, setNewRoutineDraft] =
    useState<WorkoutPlanDraft | null>(null);

  // 이 화면이 root Stack(record-editor)으로 "탈출"한 뒤에도 이 탭의
  // nested stack 맨 위에 남는 문제(완료 후 카메라 탭을 다시 누르면 새
  // 카메라 대신 이미 다 쓴 이 화면부터 보이는 것)는 이 화면이 store를
  // 감시해 스스로 pop하는 방식으로 풀지 않는다 — record-complete의
  // "확인" 핸들러가 dismissTo("/home")로 이 화면까지 명시적으로 한 번에
  // 걷어낸다(record-complete.tsx 참고).
  useEffect(() => {
    getDailyMission()
      .then(setMission)
      .catch((error) => console.error("Failed to load daily mission", error));
    getDailyPlans(toDateKey(new Date()))
      .then(({ dailyPlans }) => setTodayWorkouts(dailyPlans))
      .catch((error) => console.error("Failed to load daily plans", error));
    getPlanPresets()
      .then(({ planPresets }) =>
        setRoutines(planPresets.map(fromPlanPresetResponse)),
      )
      .catch((error) => console.error("Failed to load plan presets", error));
  }, []);

  function goToRecordEditor(target: {
    refType: "PLAN" | "MISSION";
    refId: number;
    title: string;
  }) {
    useRecordFlowStore.getState().setTarget(target);
    router.push("/record-editor");
  }

  function selectMission() {
    if (!mission || mission.status !== "ACCEPTED") return;
    goToRecordEditor({
      refType: "MISSION",
      refId: mission.missionId,
      title: mission.title ?? "오늘의 미션",
    });
  }

  function selectTodayWorkout(workout: DailyPlanResponse) {
    goToRecordEditor({
      refType: "PLAN",
      refId: workout.id,
      title: workout.name,
    });
  }

  // 루틴 자체의 id는 절대 PLAN refId로 보내지 않는다 — 오늘의 운동
  // 인스턴스(dailyPlan)를 먼저 만들고 그 실제 서버 id로 이어간다. 홈
  // 화면의 addSavedPlanToDate와 동일한 패턴(POST /api/v1/daily-plans)이다.
  async function selectRoutine(routine: WorkoutPlanDraft) {
    if (isCreatingDailyPlan) return;
    setIsCreatingDailyPlan(true);
    try {
      const { id } = await createDailyPlan({
        ...toPlanRequestFields(routine),
        planDate: toDateKey(new Date()),
      });
      goToRecordEditor({ refType: "PLAN", refId: id, title: routine.title });
    } catch {
      Alert.alert("오류", "오늘의 운동에 담지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsCreatingDailyPlan(false);
    }
  }

  function openNewRoutineSheet() {
    setNewRoutineDraft(
      createBlankWorkoutPlanDraft(`camera-routine-${Date.now()}`),
    );
  }

  // "오늘만 할래요"(addToToday)의 의미는 home.tsx의 saveNewPlan과 동일하게
  // 다룬다 — 켜져 있으면 재사용 루틴으로 저장하지 않고 바로 오늘의 운동
  // (daily-plan)으로 담는다. 꺼져 있으면 루틴 템플릿만 만들어지고
  // daily-plan은 없다(루틴 id를 refId로 보내면 안 됨).
  //
  // 저장 후 이동: 체크 여부와 무관하게 record-editor로 자동 이동하지 않고
  // 이 화면(대상 선택)에 그대로 머문다 — home.tsx의 기존 WorkoutPlanEditSheet
  // 사용처(saveNewPlan)도 저장 후 어디로도 자동 이동하지 않는 것과 동일한
  // 패턴이며, Figma 프로토타입 연결 정보가 없어 자동 이동 근거가 없다는
  // 점을 사용자에게 확인받았다. 대신 방금 만든 항목이 목록에 바로 보이게
  // 로컬 상태를 갱신해, 이어서 selectTodayWorkout/selectRoutine으로 직접
  // 골라 record-editor로 갈 수 있게 한다.
  async function handleSaveNewRoutine(
    plan: WorkoutPlanDraft,
    addToToday: boolean,
  ) {
    if (addToToday) {
      try {
        const { id } = await createDailyPlan({
          ...toPlanRequestFields(plan),
          planDate: toDateKey(new Date()),
        });
        setTodayWorkouts((current) => [
          ...current,
          {
            id,
            ...toPlanRequestFields(plan),
            planDate: toDateKey(new Date()),
            status: "PLANNED",
          },
        ]);
        setNewRoutineDraft(null);
      } catch {
        Alert.alert(
          "오류",
          "오늘의 운동을 등록하지 못했습니다. 다시 시도해주세요.",
        );
      }
      return;
    }

    try {
      const { id } = await createPlanPreset(toPlanRequestFields(plan));
      setRoutines((current) => [...current, { ...plan, id: String(id) }]);
      setNewRoutineDraft(null);
    } catch {
      Alert.alert("오류", "루틴을 등록하지 못했습니다. 다시 시도해주세요.");
    }
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: semanticColors["background-normal"] }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View
          style={{
            height: 52,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 4,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로"
            hitSlop={8}
            onPress={() => router.back()}
            style={{
              width: 48,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={semanticColors["label-normal"]}
            />
          </Pressable>
          <View style={{ width: 48, height: 48 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 32,
            gap: 20,
          }}
        >
          {photo && (
            <Image
              source={{
                uri: getOptimizedImageUrl(photo.secureUrl, {
                  width: 670,
                  height: 396,
                  crop: "fill",
                }),
              }}
              style={{ width: "100%", height: 198, borderRadius: 12 }}
              contentFit="cover"
            />
          )}

          {mission && mission.status === "ACCEPTED" && (
            <Pressable
              accessibilityRole="button"
              onPress={selectMission}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <View
                style={{
                  borderWidth: 1,
                  borderColor: semanticColors["line-normal"],
                  borderRadius: 20,
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: 20,
                  gap: 8,
                }}
              >
                <ThemedText typography="body-2-bold">오늘의 미션</ThemedText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      backgroundColor: semanticColors["label-normal"],
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={semanticColors["label-inverse"]}
                    />
                  </View>
                  <View style={{ gap: 2 }}>
                    <ThemedText typography="body-2-bold">
                      {mission.title}
                    </ThemedText>
                    <ThemedText
                      typography="caption-1-regular"
                      style={{ color: semanticColors["label-disabled"] }}
                    >
                      {mission.description}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </Pressable>
          )}

          <View
            style={{
              borderWidth: 1,
              borderColor: semanticColors["line-normal"],
              borderRadius: 20,
              paddingBottom: 12,
            }}
          >
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 14,
                gap: 2,
              }}
            >
              <ThemedText typography="body-2-bold">오늘의 운동</ThemedText>
              <ThemedText
                typography="caption-1-regular"
                style={{ color: semanticColors["label-disabled"] }}
              >
                {`${new Date().getMonth() + 1}월 ${new Date().getDate()}일`}
              </ThemedText>
            </View>

            <View style={{ paddingHorizontal: 20 }}>
              {todayWorkouts.map((workout) => (
                <Pressable
                  accessibilityRole="button"
                  key={workout.id}
                  onPress={() => selectTodayWorkout(workout)}
                  style={({ pressed }) => pressed && { opacity: 0.7 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 16,
                      paddingVertical: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 999,
                        backgroundColor: semanticColors["fill-normal"],
                      }}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <ThemedText typography="body-2-bold">
                        {workout.name}
                      </ThemedText>
                      <ThemedText
                        typography="caption-1-regular"
                        style={{ color: semanticColors["label-disabled"] }}
                      >
                        {workout.exerciseType}
                      </ThemedText>
                    </View>
                  </View>
                </Pressable>
              ))}

              {routines.length > 0 && (
                <ThemedText
                  typography="caption-1-bold"
                  style={{
                    color: semanticColors["label-disabled"],
                    paddingTop: 6,
                    paddingBottom: 5,
                  }}
                >
                  루틴
                </ThemedText>
              )}
              {routines.map((routine) => (
                <Pressable
                  accessibilityRole="button"
                  disabled={isCreatingDailyPlan}
                  key={routine.id}
                  onPress={() => selectRoutine(routine)}
                  style={({ pressed }) => pressed && { opacity: 0.7 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 16,
                      paddingVertical: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 999,
                        backgroundColor: semanticColors["fill-subtle"],
                        borderWidth: 1,
                        borderColor: semanticColors["line-normal"],
                      }}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <ThemedText typography="body-2-bold">
                        {routine.title}
                      </ThemedText>
                      <ThemedText
                        typography="caption-1-regular"
                        style={{ color: semanticColors["label-disabled"] }}
                      >
                        {getWorkoutPlanSummary(routine)}
                      </ThemedText>
                    </View>
                  </View>
                </Pressable>
              ))}

              <Pressable
                accessibilityRole="button"
                onPress={openNewRoutineSheet}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    paddingVertical: 13,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderStyle: "dashed",
                      borderColor: semanticColors["line-normal"],
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="add"
                      size={16}
                      color={semanticColors["label-subtle"]}
                    />
                  </View>
                  <ThemedText
                    typography="body-2-bold"
                    style={{ color: semanticColors["label-normal"] }}
                  >
                    신규 루틴 추가
                  </ThemedText>
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {newRoutineDraft && isFocused && (
        // Figma 2112:52614는 이 시트가 떠 있는 동안에도 Native TabBar(카메라
        // 활성)가 그대로 보인다 — RN Modal(기본값)은 그 탭바까지 덮어버리므로
        // 이 화면(카메라 탭의 nested route)에서는 inline으로 렌더해 이
        // 화면의 콘텐츠 영역(탭바 위)에만 겹치게 한다. home.tsx는 계속
        // 기본값(modal)을 쓰므로 그쪽 동작은 그대로다.
        <WorkoutPlanEditSheet
          onClose={() => setNewRoutineDraft(null)}
          onDelete={() => setNewRoutineDraft(null)}
          onSave={handleSaveNewRoutine}
          presentation="inline"
          saveLabel="루틴 추가하기"
          showDelete={false}
          showAddToTodayToggle
          title="루틴 추가"
          value={newRoutineDraft}
          visible
        />
      )}
    </View>
  );
}
