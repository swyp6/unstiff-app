import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// 이 파일은 목록 fade에 RN 기본 Animated를 쓰므로(아래 listOpacity) 체크
// 아이콘 등장용 reanimated는 이름 충돌을 피해 별칭으로 가져온다 —
// workout-plan-edit-sheet.tsx와 같은 패턴.
import ReanimatedAnimated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";
import { getDailyMission } from "@/features/missions/api";
import type { DailyMissionResponse } from "@/features/missions/types";
import { getDailyPlans } from "@/features/workout-plan/api";
import {
  fromDailyPlanResponse,
  type GoalType,
} from "@/features/workout-plan/model";
import type { DailyPlanResponse } from "@/features/workout-plan/types";

// 체크 표시가 보이는 시간이자 목록이 사라지는 시간 — 이 뒤에 기록 입력으로
// 넘어간다. 과한 연출 없이 "선택됐다"만 인지시킬 정도로 짧게 잡는다.
const SELECTION_HOLD_MS = 160;

function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Figma 4173:31148 "촬영결과기입" — 하단 카메라 탭(capture/index)에서 찍은
// 사진(대상이 아직 없음)을 어떤 기록으로 남길지 고르는 화면. 오늘의 미션·
// 오늘의 운동 중 하나에 연결하거나(LINKED), 아무 것에도 연결하지 않고 직접
// 입력하는 신규 기록(MANUAL, "+ 기록하기")으로 넘어간다.
//
// 루틴(plan-preset)은 이 화면에서 다루지 않는다 — 기록은 "오늘 실제로 한 것"에
// 붙는 것이라 템플릿인 루틴을 대상으로 삼을 수 없다(루틴 id를 PLAN refId로
// 보내는 경로가 없어야 한다). 루틴 추가/선택은 홈 화면에만 남아 있다.
//
// 이 화면과 그 다음 기록 입력 화면은 전부 카메라 탭의 nested route(capture/
// _layout.tsx의 Stack)라 Native TabBar가 계속 보인다. PLAN/MISSION에서 곧장
// 들어오는 contextual 흐름(홈)은 이 화면을 거치지 않는다.
export default function RecordTargetScreen() {
  // 뒤로가기는 router.back()(전역 히스토리 기준)이 아니라 이 화면이 속한
  // 가장 가까운 navigator = 카메라 탭의 nested Stack에서만 pop해야 한다.
  // 중간에 다른 탭을 다녀오면 전역 히스토리의 직전 항목이 그 탭이 돼버려
  // router.back()이 홈/채팅으로 빠져나가기 때문이다(카메라 탭의 nested
  // stack 자체는 탭을 오가도 그대로 유지되는 것이 의도된 동작).
  const navigation = useNavigation();
  const photo = useRecordFlowStore((state) => state.photo);

  const [mission, setMission] = useState<DailyMissionResponse | null>(null);
  const [todayWorkouts, setTodayWorkouts] = useState<DailyPlanResponse[]>([]);
  // 누른 행을 체크 상태로 잠깐 보여준 뒤(SELECTION_HOLD_MS) 기록 입력으로
  // 넘어간다 — 사진은 그대로 두고 이 목록만 사라지는 전환이라, 무엇을 골랐는지
  // 확인할 짧은 여유를 준다.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // workout-plan-bottom-sheet.tsx와 같은 방식 — useRef().current를 렌더 중에
  // 읽으면 lint(react-hooks)가 막아서 useState 초기화로 값을 만든다.
  const [listOpacity] = useState(() => new Animated.Value(1));
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
    };
  }, []);

  // 기록 입력에서 뒤로 돌아오면 선택 표시를 지우고 목록을 다시 서서히 띄운다
  // (정방향 전환의 역방향 느낌). 사진은 이 애니메이션 밖에 있어 움직이지 않는다.
  useFocusEffect(
    useCallback(() => {
      setSelectedKey(null);
      listOpacity.setValue(0);
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, [listOpacity]),
  );

  // 이 화면이 완료 후에도 이 탭의 nested stack 맨 위에 남는 문제(카메라 탭을
  // 다시 누르면 새 카메라 대신 이미 다 쓴 이 화면부터 보이는 것)는 이 화면이
  // store를 감시해 스스로 pop하는 방식으로 풀지 않는다 — record-complete의
  // "확인" 핸들러가 dismissTo("/home")로 이 화면까지 명시적으로 한 번에
  // 걷어낸다(record-complete.tsx 참고).
  useEffect(() => {
    getDailyMission()
      .then(setMission)
      .catch((error) => console.error("Failed to load daily mission", error));
    getDailyPlans(toDateKey(new Date()))
      .then(({ dailyPlans }) => setTodayWorkouts(dailyPlans))
      .catch((error) => console.error("Failed to load daily plans", error));
  }, []);

  const isMissionRecordable = mission?.status === "ACCEPTED";

  function goToRecordEditor(
    key: string,
    target: {
      refType: "PLAN" | "MISSION";
      refId: number;
      title: string;
      initialGoalTypes?: GoalType[];
      initialGoalValues?: Record<GoalType, number>;
    },
  ) {
    if (selectedKey) return;
    setSelectedKey(key);
    Animated.timing(listOpacity, {
      toValue: 0,
      duration: SELECTION_HOLD_MS,
      useNativeDriver: true,
    }).start();
    selectionTimerRef.current = setTimeout(() => {
      useRecordFlowStore.getState().setTarget({ mode: "LINKED", ...target });
      router.push("/capture/record-editor");
    }, SELECTION_HOLD_MS);
  }

  function selectMission() {
    if (!mission || !isMissionRecordable) return;
    goToRecordEditor("mission", {
      refType: "MISSION",
      refId: mission.missionId,
      title: mission.title ?? "오늘의 미션",
    });
  }

  function selectTodayWorkout(workout: DailyPlanResponse) {
    // Pressable의 disabled만 믿지 않는다 — 이미 완료된 오늘의 운동은 다시
    // 기록 대상으로 삼을 수 없으므로 핸들러에서도 한 번 더 막는다.
    if (workout.status === "COMPLETED") return;
    // targets(API 단위)를 fromDailyPlanResponse로 UI 단위(분/km)까지 그대로
    // 변환해서 넘긴다 — 홈의 오늘의 운동 카드가 쓰는 것과 같은 함수라 초→분,
    // m→km 변환 로직을 여기서 새로 만들지 않는다.
    const { selectedGoalTypes, goalValues } = fromDailyPlanResponse(workout);
    goToRecordEditor(`plan-${workout.id}`, {
      refType: "PLAN",
      refId: workout.id,
      title: workout.name,
      ...(selectedGoalTypes.length > 0
        ? { initialGoalTypes: selectedGoalTypes, initialGoalValues: goalValues }
        : null),
    });
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: semanticColors["background-normal"] }}
    >
      {/* iOS 26 NativeTabs의 탭바는 콘텐츠 위에 떠 있어 하단 인셋에 그 높이가
          포함된다 — 목록/버튼이 탭바 뒤로 숨지 않도록 bottom edge까지 준다. */}
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View
          style={{
            height: 52,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 4,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로"
            hitSlop={8}
            onPress={() => navigation.goBack()}
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
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 32,
            gap: 24,
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

          {/* 사진 아래 영역만 사라졌다 나타난다 — 위 <Image>는 이 애니메이션
              밖에 있어 기록 입력으로 넘어가도 위치·크기가 그대로다. */}
          <Animated.View style={[{ gap: 24 }, { opacity: listOpacity }]}>
            {isMissionRecordable && mission && (
              <View style={{ gap: 6 }}>
                <SectionHeader count={1} title="오늘의 미션" />
                <View style={{ paddingHorizontal: 20 }}>
                  <TargetRow
                    onPress={selectMission}
                    selected={selectedKey === "mission"}
                    subtitle={mission.description ?? ""}
                    title={mission.title ?? "오늘의 미션"}
                    variant="mission"
                  />
                </View>
              </View>
            )}

            <View style={{ gap: 6 }}>
              {/* COMPLETED도 목록에는 그대로 남는다 — count는 완료 여부와
                  무관하게 오늘의 운동 전체 개수를 보여준다. */}
              <SectionHeader count={todayWorkouts.length} title="오늘의 운동" />
              <View style={{ paddingHorizontal: 20 }}>
                {todayWorkouts.map((workout) => (
                  <TargetRow
                    key={workout.id}
                    completed={workout.status === "COMPLETED"}
                    onPress={() => selectTodayWorkout(workout)}
                    selected={selectedKey === `plan-${workout.id}`}
                    subtitle={workout.exerciseType}
                    title={workout.name}
                    variant="plan"
                  />
                ))}
              </View>
            </View>

            {/* 기존 미션/오늘의 운동에 연결하지 않고 직접 입력하는 신규 기록 */}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/capture/manual-record")}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <View
                style={{
                  alignItems: "center",
                  borderColor: semanticColors["line-normal"],
                  borderRadius: 18,
                  borderStyle: "dashed",
                  borderWidth: 1,
                  flexDirection: "row",
                  gap: 8,
                  height: 60,
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="add"
                  size={14}
                  color={semanticColors["label-normal"]}
                />
                <ThemedText typography="body-2-bold">기록하기</ThemedText>
              </View>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingBottom: 8,
      }}
    >
      <ThemedText typography="body-2-bold">{title}</ThemedText>
      <ThemedText
        typography="caption-1-medium"
        style={{ color: semanticColors["label-disabled"] }}
      >
        {count}개
      </ThemedText>
    </View>
  );
}

function TargetRow({
  title,
  subtitle,
  variant,
  selected,
  completed = false,
  onPress,
}: {
  title: string;
  subtitle: string;
  variant: "mission" | "plan";
  selected: boolean;
  // 서버에서 이미 완료 처리된(DailyPlanResponse.status === "COMPLETED") 오늘의
  // 운동 — selected(방금 선택해 잠깐 표시)와 달리 화면이 뜨는 동안 계속
  // 유지되는 영구 상태라 누를 수 없고, 애니메이션을 반복 재생하지 않는다.
  completed?: boolean;
  onPress: () => void;
}) {
  // 미션 행은 Figma상 기본이 이미 채워진 원 + 체크다(4173:31187) — 선택했을
  // 때도 같은 모양이라 그대로 두고, 오늘의 운동 행만 빈 원 → 채워진 원 +
  // 체크로 바뀐다. completed는 selected와 별개로 항상 채워진 상태다.
  const isFilled = completed || variant === "mission" || selected;
  return (
    <Pressable
      accessibilityLabel={completed ? `${title}, 완료됨` : title}
      accessibilityRole="button"
      accessibilityState={{ disabled: completed }}
      disabled={completed}
      onPress={onPress}
      style={({ pressed }) => pressed && !completed && { opacity: 0.7 }}
    >
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: 16,
          paddingVertical: 12,
        }}
      >
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 999,
            ...(isFilled
              ? { backgroundColor: semanticColors["label-normal"] }
              : {
                  backgroundColor: semanticColors["fill-normal"],
                  borderColor: semanticColors["line-normal"],
                  borderWidth: 1,
                }),
          }}
        >
          {isFilled &&
            (completed ? (
              // 완료 상태는 화면 진입마다 반복 재생할 필요가 없는 영구
              // 상태라 정적으로 그린다 — FadeIn은 방금 선택한 순간에만 쓴다.
              <Ionicons
                name="checkmark"
                size={16}
                color={semanticColors["label-inverse"]}
              />
            ) : (
              <ReanimatedAnimated.View entering={FadeIn.duration(140)}>
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={semanticColors["label-inverse"]}
                />
              </ReanimatedAnimated.View>
            ))}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText
            typography="body-2-bold"
            style={
              completed
                ? { color: semanticColors["label-disabled"] }
                : undefined
            }
          >
            {title}
          </ThemedText>
          <ThemedText
            typography="caption-1-regular"
            style={{ color: semanticColors["label-disabled"] }}
          >
            {subtitle}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}
