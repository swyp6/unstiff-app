import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useNavigation } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReanimatedAnimated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { ActionButton } from "@/components/ui/action-button";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import { trackClick } from "@/features/analytics/analytics";
import { completeMission } from "@/features/missions/api";
import { useMissionFeedbackStore } from "@/features/missions/mission-feedback-store";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";
import { GoalTypeSelector } from "@/features/workout-plan/components/goal-type-selector";
import {
  SectionLabel,
  SelectionRow,
} from "@/features/workout-plan/components/workout-plan-screen-ui";
import {
  getIntensityLabel,
  GOAL_TYPES,
  type GoalType,
  type Intensity,
  toApiIntensity,
} from "@/features/workout-plan/model";

import { saveWorkoutRecord } from "../api";
import { toActualMeasuresDto } from "../actual-measure";
import { useRecordFlowStore } from "../record-flow-store";
import { useMeasureSheets } from "../use-measure-sheets";

import { ActualMeasureStepper } from "./actual-measure-stepper";

// 운동 추가하기 시트(workout-plan-edit-sheet.tsx)의 한 줄 메모와 동일한 길이.
const MEMO_MAX_LENGTH = 50;

// "사진 없이 기록하기"로 들어와 photo가 없을 때 그 자리에 대신 보여주는 스탬프.
const STAMP_IMAGE = require("@/assets/home/stamp.png");

function todayLabel() {
  const today = new Date();
  return `${today.getMonth() + 1}월 ${today.getDate()}일`;
}

// Figma 4173:31231 "2.2.2.1 신규 운동 기록 입력" — 이미 정해진 오늘의 운동
// (PLAN)/오늘의 미션(MISSION)의 실제 수행 결과만 입력하는 화면. 기존 항목의
// 제목·운동 종류·계획 자체를 수정하는 UI는 의도적으로 두지 않는다(무엇을
// 했는지는 연결된 PLAN/MISSION이 결정하고, 사용자는 결과만 남긴다).
//
// 라우트 wrapper는 진입 경로에 따라 둘로 나뉜다 — 홈에서 시작한 흐름은 root
// (src/app/record-editor.tsx, fullScreenModal), 하단 카메라 탭에서 시작한
// 흐름은 그 탭의 nested route(src/app/(tabs)/capture/record-editor.tsx)라
// Native TabBar가 계속 보인다. 화면 자체는 이 컴포넌트 하나를 공유한다.
//
// insideTabs: 카메라 탭의 nested route로 떠서 Native TabBar가 함께 보이는지.
// 아래 하단 인셋 계산에만 쓰인다.
export function RecordEditorScreen({
  insideTabs = false,
}: {
  insideTabs?: boolean;
}) {
  // root 라우트로 뜰 때는 fullScreenModal이라 <SafeAreaView>가 상단 인셋을
  // 0으로 잡는 경우가 있어(camera.tsx에 같은 주석) 훅에서 직접 읽어 padding
  // 으로 적용한다. 하단은 카메라 탭의 nested route로 뜰 때 iOS 26 NativeTabs의
  // 떠 있는 탭바 높이가 인셋에 포함돼, 고정 CTA가 그 뒤로 숨는 것을 막아준다.
  const insets = useSafeAreaInsets();
  // 탭 안에서 안드로이드만 하단 인셋을 빼는 이유(home.tsx·chat.tsx·settings와
  // 같은 처리): iOS는 expo-router가 탭마다 SafeAreaProvider를 새로 깔아
  // insets.bottom이 "탭바 높이 + 홈 인디케이터"라 이 값이 곧 탭바를 피하는
  // 여백이다. 안드로이드는 expo-router가 탭 콘텐츠를 react-native-screens
  // SafeAreaView(bottom)로 감싸 화면 높이에서 탭바를 이미 제외하고, 탭바
  // (BottomNavigationView)가 시스템 네비게이션 바 여백까지 흡수한다 — 그런데
  // insets.bottom은 root SafeAreaProvider의 네비게이션 바 높이가 탭바 유무와
  // 무관하게 그대로 내려와서, 여기서 한 번 더 더하면 CTA가 그만큼 탭바 위로
  // 떠 버린다. root 라우트(fullScreenModal, 탭바 없음)는 edge-to-edge라 이
  // 인셋이 실제 네비게이션 바 여백이므로 그대로 둔다.
  const bottomInset =
    Platform.OS === "android" && insideTabs ? 0 : insets.bottom;
  // 뒤로가기는 전역 히스토리(router.back())가 아니라 이 화면이 속한 가장
  // 가까운 navigator에서만 pop한다 — 카메라 탭에서 들어왔으면 그 탭의 nested
  // Stack(→ target), 홈에서 들어왔으면 root Stack(→ 탭 화면)이다. 전역
  // 히스토리를 쓰면 중간에 다른 탭을 다녀온 경우 그 탭으로 빠져나간다.
  const navigation = useNavigation();
  const photo = useRecordFlowStore((state) => state.photo);
  const target = useRecordFlowStore((state) => state.target);
  const setConfirmed = useRecordFlowStore((state) => state.setConfirmed);

  // 오늘의 운동(PLAN)을 만들 때 정한 목표(target.initialGoalTypes/
  // initialGoalValues, home.tsx/capture/target.tsx가 채워 넣는다)가 있으면
  // 그 값을 "실제 수행값"의 최초 입력값으로 쓴다 — 여기서 한 번만 초기화할
  // 뿐, 이후 칩 토글/스테퍼 조정은 기존처럼 자유롭다. MISSION이거나 값이
  // 없으면(누락/잘못된 데이터 포함) 기존 빈 선택 상태로 안전하게 시작한다.
  // useState 초기화 함수 안에서만 읽으므로 target이 이후 바뀌어도 다시
  // 반영되지 않는다(최초 진입 시점의 스냅샷).
  const [selectedTypes, setSelectedTypes] = useState<GoalType[]>(() =>
    target?.mode === "LINKED" && target.initialGoalTypes?.length
      ? target.initialGoalTypes
      : [],
  );
  const [values, setValues] = useState<Record<GoalType, number>>(() => ({
    time: 1,
    distance: 0.1,
    reps: 1,
    sets: 1,
    ...(target?.mode === "LINKED" ? target.initialGoalValues : null),
  }));
  const [intensity, setIntensity] = useState<Intensity>(null);
  // 시트에도 CTA와 같은 bottomInset을 넘긴다 — embedded 시트는 이 값만큼
  // 콘텐츠 영역 바닥에서 떠서 끝나므로, CTA만 0으로 내리고 시트는
  // insets.bottom을 그대로 쓰면 안드로이드 탭 안에서 그 차이(네비게이션 바
  // 높이)만큼의 띠가 시트 아래에 남아 거기 걸친 CTA가 노출된다.
  const { intensitySheet, measureSheet, openIntensitySheet, openMeasureSheet } =
    useMeasureSheets({
      embeddedBottomInset: bottomInset,
      intensity,
      onChangeIntensity: setIntensity,
      onChangeValues: setValues,
      values,
    });
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // isSubmitting은 setState라 같은 프레임의 연타에는 아직 false로 보인다 —
  // 같은 refId로 POST /workouts가 두 번 나가면 기록이 중복 생성되므로,
  // 응답이 오기 전까지 두 번째 진입을 동기적으로 막는다(manual-record와
  // 같은 패턴).
  const submissionLockRef = useRef(false);
  // MISSION은 workout record 저장과 미션 완료 처리가 별개 API라, 후자가
  // 실패했을 때 재시도가 POST /workouts를 다시 보내 기록을 중복 생성하면 안
  // 된다. 첫 시도에서 저장에 성공한 payload를 보관해두고, 재시도는 이 값이
  // 있으면 저장을 건너뛰고 completeMission만 다시 호출한다.
  const savedWorkoutRef = useRef<{
    id: number;
    measures: ReturnType<typeof toActualMeasuresDto>;
    memo: string;
  } | null>(null);

  const isMemoTooLong = memo.length > MEMO_MAX_LENGTH;
  const canSubmit = selectedTypes.length > 0 && !isMemoTooLong && !isSubmitting;

  function toggleType(type: GoalType) {
    trackClick("record_editor", "goal_type_toggle");
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : GOAL_TYPES.filter(
            (goalType) => current.includes(goalType) || goalType === type,
          ),
    );
  }

  async function handleSubmit() {
    trackClick("record_editor", "submit");
    if (submissionLockRef.current) return;
    if (!target || target.mode !== "LINKED" || !canSubmit) return;
    submissionLockRef.current = true;

    setIsSubmitting(true);
    setError(null);
    try {
      let measures: ReturnType<typeof toActualMeasuresDto>;
      let trimmedMemo: string;
      let savedId: number;

      if (savedWorkoutRef.current) {
        // 이전 시도에서 workout record는 이미 저장됐다(MISSION의
        // completeMission만 실패했던 경우) — POST /workouts를 다시 보내면
        // 기록이 중복 생성되므로 그 저장은 건너뛰고 그때 저장한 값을 그대로
        // 쓴다.
        measures = savedWorkoutRef.current.measures;
        trimmedMemo = savedWorkoutRef.current.memo;
        savedId = savedWorkoutRef.current.id;
      } else {
        const apiIntensity = toApiIntensity(intensity);
        measures = toActualMeasuresDto(selectedTypes, values);
        trimmedMemo = memo.trim();
        // 여기서 고른 강도는 "실제로 이렇게 수행했다"는 기록값이라 이 요청에만
        // 싣는다 — 연결된 daily-plan의 계획 강도는 건드리지 않는다(PUT 없음).
        // UI에서 강도는 선택 사항이라 고르지 않았으면 필드를 생략한다.
        const saved = await saveWorkoutRecord({
          refType: target.refType,
          refId: target.refId,
          measures,
          ...(apiIntensity ? { intensity: apiIntensity } : null),
          ...(photo ? { imageUrl: photo.secureUrl } : null),
          ...(trimmedMemo ? { memo: trimmedMemo } : null),
        });
        savedId = saved.id;
        savedWorkoutRef.current = { id: savedId, measures, memo: trimmedMemo };
      }

      // 실제 수행 기록 저장이 성공한 뒤에만 미션 자체를 완료 처리한다 —
      // 두 API는 별개 entity/event다. MISSION은 completeMission까지 성공해야
      // "등록 완료"로 본다 — 실패하면 서버 미션이 ACCEPTED로 남아 다시 기록
      // 대상으로 노출될 수 있으므로, 성공 화면으로 보내지 않고 이 화면에
      // 남겨 재시도할 수 있게 한다(위 savedWorkoutRef가 있어 재시도는
      // completeMission만 다시 부른다).
      if (target.refType === "MISSION") {
        try {
          const completeResponse = await completeMission(target.refId);
          // "10번마다" 같은 주기 판단은 서버가 이미 끝낸 결과다 — 프론트는
          // 이 값만 그대로 믿는다. 완료 화면(record-complete) UX는 그대로
          // 유지해야 하므로 여기서 곧장 피드백 모달을 띄우지 않고, 홈으로
          // 돌아왔을 때 표시할 수 있도록 화면 전환에도 살아남는 별도
          // store에 pending 상태만 남겨둔다(mission-feedback-store).
          if (completeResponse.requireUserFeedback) {
            useMissionFeedbackStore.getState().requestFeedback(target.refId);
          }
        } catch (completeError) {
          console.error("Failed to complete mission", completeError);
          submissionLockRef.current = false;
          setIsSubmitting(false);
          setError(
            "운동 기록은 저장됐지만 미션 완료 처리에 실패했어요. 다시 시도해 주세요.",
          );
          return;
        }
      }

      setConfirmed({
        id: savedId,
        target,
        secureUrl: photo?.secureUrl,
        measures,
        // apiIntensity는 위 else 블록 안에서만 선언돼 재시도(if 분기)
        // 경로에선 범위 밖이다 — intensity(state) 자체는 재시도 중에도
        // 그대로 남아있으니 여기서 다시 변환한다.
        intensity: toApiIntensity(intensity),
        memo: trimmedMemo || undefined,
        date: new Date(),
      });
      // 홈이 오늘의 운동/미션/캘린더를 서버에서 다시 읽도록 알린다.
      useRecordFlowStore.getState().markRecordSaved();
      // 성공하면 lock/isSubmitting을 풀지 않는다 — 화면 전환이 끝나기 전에
      // 풀리면 그 사이 CTA를 다시 눌러 같은 요청이 한 번 더 나갈 수 있다.
      // 이 화면은 곧 unmount되므로 그때 함께 사라지게 둔다.
      router.replace("/record-complete");
    } catch {
      submissionLockRef.current = false;
      setIsSubmitting(false);
      setError("기록을 저장하지 못했어요. 다시 시도해 주세요.");
    }
  }

  // MANUAL 대상으로는 이 화면에 오지 않는다(대상 선택 화면의 "+ 기록하기"는
  // 별도 화면으로 보낸다) — 잘못 진입하면 저장 대상을 지어내지 않고 비운다.
  if (!target || target.mode !== "LINKED") return null;

  return (
    <View
      style={{ flex: 1, backgroundColor: semanticColors["background-normal"] }}
    >
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: bottomInset,
        }}
      >
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

        {/* "한 줄 기록" 등 하단부 입력이 키보드에 가려지는 실기기 문제 —
            ScrollView와 CTA를 같은 KeyboardAvoidingView 안에 묶어 키보드가
            뜨면 이 영역 전체가 그만큼 줄어들고, CTA가 키보드 바로 위로
            따라온다. 이 View는 header 아래에서 시작해 자신의 실제 화면
            위치를 스스로 측정하므로(위 header는 형제로 밖에 있다)
            keyboardVerticalOffset 없이도 정확히 들어맞는다. 키보드가 닫혀
            있으면 padding이 0이라 기존 레이아웃과 차이가 없다. */}
        <KeyboardAvoidingView
          // edge-to-edge에서 adjustResize가 안 먹어 Android도 키보드가 CTA를
          // 덮는다. behavior="height"는 Android에서 키보드가 닫혀 있어도
          // 컨테이너 높이를 실측보다 작게 잡는 부작용이 있어 padding으로 통일한다.
          behavior="padding"
          style={{ flex: 1 }}
        >
          <ScrollView
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 20,
              gap: 18,
            }}
          >
            <Image
              source={
                photo
                  ? {
                      uri: getOptimizedImageUrl(photo.secureUrl, {
                        width: 670,
                        height: 396,
                        crop: "fill",
                      }),
                    }
                  : STAMP_IMAGE
              }
              style={{ width: "100%", height: 198, borderRadius: 12 }}
              contentFit="cover"
            />

            {/* 사진 아래 입력 영역만 아래에서 살짝 올라오며 나타난다 — 카메라
              탭에서 들어온 경우 직전 화면(target)과 사진의 위치·크기가 같고
              그 전환에는 애니메이션이 없어(capture/_layout.tsx), 사진은 고정된
              채 이 영역만 목록과 교체되는 것처럼 보인다. */}
            <ReanimatedAnimated.View
              entering={FadeInDown.duration(220)}
              style={{ gap: 18 }}
            >
              <View style={{ gap: 7 }}>
                <ThemedText typography="title-3-bold">
                  {target.title}
                </ThemedText>
                <ThemedText
                  typography="caption-1-regular"
                  style={{ color: semanticColors["label-disabled"] }}
                >
                  {todayLabel()} 기록
                </ThemedText>
              </View>

              <View style={{ gap: 8 }}>
                <SectionLabel>기록할 항목</SectionLabel>
                <GoalTypeSelector value={selectedTypes} onToggle={toggleType} />
                <View style={{ gap: 8 }}>
                  {selectedTypes.map((type) => (
                    <ReanimatedAnimated.View
                      entering={FadeIn}
                      exiting={FadeOut}
                      key={type}
                      layout={LinearTransition}
                    >
                      <ActualMeasureStepper
                        onPressValue={() => {
                          trackClick("record_editor", "measure_value_press");
                          openMeasureSheet(type);
                        }}
                        type={type}
                        value={values[type]}
                        onChange={(value) =>
                          setValues((current) => ({
                            ...current,
                            [type]: value,
                          }))
                        }
                      />
                    </ReanimatedAnimated.View>
                  ))}
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <SectionLabel optional>강도</SectionLabel>
                <SelectionRow
                  accessibilityLabel="강도 선택"
                  onPress={() => {
                    trackClick("record_editor", "intensity_select");
                    openIntensitySheet();
                  }}
                  placeholder="선택해주세요"
                  value={getIntensityLabel(intensity)}
                />
              </View>

              <View>
                <SectionLabel
                  optional
                  trailing={
                    <ThemedText
                      typography="caption-1-regular"
                      style={{
                        color: isMemoTooLong
                          ? primitiveColors.red["6"]
                          : semanticColors["label-disabled"],
                      }}
                    >
                      {memo.length} / {MEMO_MAX_LENGTH}
                    </ThemedText>
                  }
                >
                  한 줄 기록
                </SectionLabel>
                <TextInput
                  accessibilityLabel="한 줄 기록"
                  multiline
                  onChangeText={setMemo}
                  placeholder="기록을 남겨보세요"
                  placeholderTextColor={semanticColors["label-disabled"]}
                  returnKeyType="done"
                  style={{
                    backgroundColor: semanticColors["fill-subtle"],
                    borderColor: isMemoTooLong
                      ? primitiveColors.red["6"]
                      : "transparent",
                    borderRadius: 12,
                    borderWidth: 1,
                    color: semanticColors["label-normal"],
                    fontFamily: "Pretendard-Medium",
                    fontSize: 16,
                    lineHeight: 24,
                    minHeight: 50,
                    paddingBottom: 14,
                    paddingHorizontal: 16,
                    paddingTop: 10,
                    textAlignVertical: "top",
                  }}
                  value={memo}
                />
                {isMemoTooLong && (
                  <View
                    style={{
                      alignItems: "center",
                      flexDirection: "row",
                      gap: 4,
                      marginTop: 6,
                    }}
                  >
                    <Ionicons
                      color={primitiveColors.red["6"]}
                      name="alert-circle"
                      size={14}
                    />
                    <ThemedText
                      typography="caption-1-regular"
                      style={{ color: primitiveColors.red["6"] }}
                    >
                      {MEMO_MAX_LENGTH}자까지 쓸 수 있어요
                    </ThemedText>
                  </View>
                )}
              </View>

              {error && (
                <ThemedText
                  typography="caption-1-regular"
                  style={{ color: "#ff6b6b", textAlign: "center" }}
                >
                  {error}
                </ThemedText>
              )}
            </ReanimatedAnimated.View>
          </ScrollView>

          {/* Figma 4173:31231에서 CTA는 스크롤과 함께 밀려 올라가지 않고 화면
              하단(탭바 바로 위)에 고정돼 있다. 입력 영역과 함께 등장하도록 같은
              entering을 준다 — 탭바는 이 애니메이션 밖이라 움직이지 않는다.
              ScrollView와 같은 KeyboardAvoidingView 안에 있어 키보드가 뜨면
              이 CTA도 함께 그 바로 위로 올라온다. */}
          <ReanimatedAnimated.View
            entering={FadeInDown.duration(220)}
            style={{ paddingHorizontal: 20, paddingBottom: 16 }}
          >
            <ActionButton
              disabled={!canSubmit}
              label={isSubmitting ? "저장 중..." : "운동 완료하기"}
              onPress={handleSubmit}
            />
          </ReanimatedAnimated.View>
        </KeyboardAvoidingView>

        {/* 하단 카메라 탭에서 들어온 경우 이 화면은 그 탭의 nested route라
            Native TabBar가 함께 보인다 — RN Modal(기본값)은 그 탭바까지
            덮어버리므로 inline(embedded)으로 띄운다(capture/target.tsx의
            시트 처리와 같은 이유). embedded의 absoluteFill은 RN에서 부모의
            padding을 무시하고 부모 테두리 기준 bottom:0을 잡아서, 이 View의
            bottomInset padding 안에 두는 것만으론 탭바 높이를 못 피한다 —
            useMeasureSheets에 넘긴 embeddedBottomInset(=같은 bottomInset)이
            그 높이를 직접 반영한다. manual-record.tsx와 이 시트들(강도·실제값)을
            공유한다. */}
        {intensitySheet}
        {measureSheet}
      </View>
    </View>
  );
}
