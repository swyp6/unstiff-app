import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, Stack, useNavigation } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ReanimatedAnimated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";
import { GoalTypeSelector } from "@/features/workout-plan/components/goal-type-selector";
import { IntensityBottomSheet } from "@/features/workout-plan/components/intensity-bottom-sheet";
import { WorkoutTypeBottomSheet } from "@/features/workout-plan/components/workout-type-bottom-sheet";
import {
  PrimaryActionButton,
  SectionLabel,
  SelectionRow,
} from "@/features/workout-plan/components/workout-plan-screen-ui";
import {
  getIntensityLabel,
  GOAL_TYPES,
  type GoalType,
  type Intensity,
  toApiIntensity,
  toPlanDateKey,
} from "@/features/workout-plan/model";
import { toActualMeasuresDto } from "@/features/workout-record/actual-measure";
import { saveWorkoutRecord } from "@/features/workout-record/api";
import { ActualMeasureStepper } from "@/features/workout-record/components/actual-measure-stepper";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";

const TITLE_MAX_LENGTH = 20;
const MEMO_MAX_LENGTH = 40;

// Figma 4173:30739 "2.2.2.1 신규 운동 기록 입력 -> 운동종류 선택시" — 기존
// 오늘의 운동/미션에 연결하지 않고 사용자가 직접 운동명·종류·수행값을 적는
// 화면. 하단 카메라 탭의 대상 선택 화면(capture/target.tsx)의 "+ 기록하기"
// 로만 들어오므로 이 탭의 nested route로 두어 Native TabBar가 계속 보인다.
export default function ManualRecordScreen() {
  // 뒤로가기는 전역 히스토리(router.back())가 아니라 이 화면이 속한 카메라
  // 탭의 nested Stack에서만 pop한다 — target.tsx의 같은 주석 참고.
  const navigation = useNavigation();
  const photo = useRecordFlowStore((state) => state.photo);

  const [title, setTitle] = useState("");
  const [exerciseType, setExerciseType] = useState("");
  const [isTypeSheetVisible, setIsTypeSheetVisible] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<GoalType[]>([]);
  const [values, setValues] = useState<Record<GoalType, number>>({
    time: 1,
    distance: 0.1,
    reps: 1,
    sets: 1,
  });
  const [intensity, setIntensity] = useState<Intensity>(null);
  const [isIntensitySheetVisible, setIsIntensitySheetVisible] = useState(false);
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // isSubmitting은 setState라 같은 프레임의 연타에는 아직 false로 보인다 —
  // refId 없는 MANUAL 요청이 두 번 나가면 서버가 오늘의 운동과 기록을 둘 다
  // 중복 생성하므로, 응답이 오기 전까지 두 번째 진입을 동기적으로 막는다.
  const submissionLockRef = useRef(false);

  const canSubmit =
    title.trim().length > 0 &&
    exerciseType.length > 0 &&
    selectedTypes.length > 0 &&
    !isSubmitting;

  function toggleType(type: GoalType) {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : GOAL_TYPES.filter(
            (goalType) => current.includes(goalType) || goalType === type,
          ),
    );
  }

  // MANUAL 저장은 POST /api/v1/workouts 한 번이다 — refId를 보내지 않고
  // name/exerciseType/targetDate를 대신 보내면 서버가 오늘의 운동(PLAN)을
  // 만들어 기록까지 저장한다. 프론트가 daily-plan을 먼저 만들지 않으므로
  // 생성된 plan id를 받아 후속 호출할 것도 없다. refType에 MANUAL 같은 값을
  // 지어내지 않고 PLAN을 그대로 쓴다.
  //
  // 이 화면은 미리 계획을 세우는 흐름이 아니라 "이미 한 운동을 지금 기록하는"
  // 즉시 기록 흐름이라 목표/실제를 따로 받는 입력이 없다(Figma 4173:30739).
  // measures에는 화면에 입력한 실제 수행값 하나만 들어간다.
  async function handleSubmit() {
    if (submissionLockRef.current || !canSubmit) return;
    submissionLockRef.current = true;

    setIsSubmitting(true);
    setError(null);
    try {
      const trimmedMemo = memo.trim();
      const apiIntensity = toApiIntensity(intensity);
      const measures = toActualMeasuresDto(selectedTypes, values);
      const submittedAt = new Date();
      const trimmedTitle = title.trim();
      const imageUrl = photo?.secureUrl;

      await saveWorkoutRecord({
        refType: "PLAN",
        name: trimmedTitle,
        exerciseType,
        targetDate: toPlanDateKey(submittedAt),
        measures,
        ...(apiIntensity ? { intensity: apiIntensity } : null),
        ...(imageUrl ? { imageUrl } : null),
        ...(trimmedMemo ? { memo: trimmedMemo } : null),
      });

      useRecordFlowStore.getState().setConfirmed({
        target: { mode: "MANUAL", title: trimmedTitle, exerciseType },
        secureUrl: imageUrl,
        measures,
        memo: trimmedMemo || undefined,
        date: submittedAt,
      });
      // 홈이 오늘의 운동/캘린더를 서버에서 다시 읽도록 알린다.
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

  return (
    <View
      style={{ flex: 1, backgroundColor: semanticColors["background-normal"] }}
    >
      {/* target → 이 화면도 LINKED와 같은 전환이다: 사진은 그대로 두고 그 아래
          내용만 바뀌어야 하므로 화면 전체가 옆으로 미끄러지면 안 된다. 두 화면이
          같은 위치·크기·최적화 파라미터로 같은 사진을 렌더하므로 전환
          애니메이션을 끄면 사진이 고정된 것처럼 보인다. 이 옵션을
          capture/_layout.tsx에 선언하지 않는 이유는 그쪽 주석 참고. */}
      <Stack.Screen options={{ animation: "none" }} />
      {/* iOS 26 NativeTabs의 탭바는 콘텐츠 위에 떠 있어 하단 인셋에 그 높이가
          포함된다 — 하단 고정 CTA가 탭바 뒤로 숨지 않도록 bottom edge까지 준다. */}
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

        {/* record-editor-screen.tsx와 같은 이유·같은 처리 — 운동명/한 줄
            기록이 실기기에서 키보드에 가려지지 않도록 ScrollView와 CTA를
            같은 KeyboardAvoidingView로 묶는다. header는 형제로 밖에 있어
            이 View는 자신의 실제 화면 위치를 스스로 측정하므로
            keyboardVerticalOffset이 필요 없고, 키보드가 닫혀 있으면 padding
            이 0이라 기존 레이아웃과 차이가 없다. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
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
              gap: 16,
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

            {/* 사진 아래 입력 영역만 아래에서 살짝 올라오며 나타난다 — 위
              <Image>는 이 애니메이션 밖이라 target에서 넘어와도 위치·크기가
              그대로다(record-editor-screen.tsx와 같은 처리). */}
            <ReanimatedAnimated.View
              entering={FadeInDown.duration(220)}
              style={{ gap: 16 }}
            >
              <ThemedText typography="heading-1-bold">
                신규 운동 기록
              </ThemedText>

              <View style={{ gap: 4 }}>
                <SectionLabel>운동명</SectionLabel>
                <View
                  style={{
                    backgroundColor: semanticColors["fill-subtle"],
                    borderRadius: 12,
                    height: 44,
                    justifyContent: "center",
                    paddingHorizontal: 14,
                  }}
                >
                  <TextInput
                    accessibilityLabel="운동명"
                    maxLength={TITLE_MAX_LENGTH}
                    onChangeText={setTitle}
                    placeholder="운동명을 입력해주세요"
                    placeholderTextColor={semanticColors["label-disabled"]}
                    returnKeyType="done"
                    style={{
                      color: semanticColors["label-normal"],
                      fontFamily: "Pretendard-Regular",
                      fontSize: 12,
                      paddingVertical: 0,
                    }}
                    value={title}
                  />
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <SectionLabel>운동 종류</SectionLabel>
                <SelectionRow
                  accessibilityLabel="운동 종류 선택"
                  onPress={() => setIsTypeSheetVisible(true)}
                  placeholder="선택해주세요"
                  value={exerciseType}
                />
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

              {/* 강도·한 줄 기록은 LINKED 기록 입력(record-editor-screen.tsx)과
                같은 컴포넌트/문구를 쓴다 — 두 화면이 같은 기록을 남기는 입력이라
                따로 만들지 않는다. 둘 다 선택 사항이다. */}
              <View style={{ gap: 4 }}>
                <SectionLabel>강도</SectionLabel>
                <SelectionRow
                  accessibilityLabel="강도 선택"
                  onPress={() => setIsIntensitySheetVisible(true)}
                  placeholder="선택해주세요"
                  value={getIntensityLabel(intensity)}
                />
              </View>

              <View style={{ gap: 6 }}>
                <SectionLabel>한 줄 기록 (선택)</SectionLabel>
                <View
                  style={{
                    backgroundColor: semanticColors["fill-subtle"],
                    borderRadius: 12,
                    height: 52,
                    paddingHorizontal: 16,
                    justifyContent: "center",
                  }}
                >
                  <TextInput
                    accessibilityLabel="한 줄 기록"
                    maxLength={MEMO_MAX_LENGTH}
                    onChangeText={setMemo}
                    placeholder="기록을 남겨보세요"
                    placeholderTextColor={semanticColors["label-disabled"]}
                    returnKeyType="done"
                    style={{
                      color: semanticColors["label-normal"],
                      fontFamily: "Pretendard-Bold",
                      fontSize: 13,
                      paddingRight: 48,
                    }}
                    value={memo}
                  />
                  <ThemedText
                    typography="caption-2-regular"
                    style={{
                      position: "absolute",
                      right: 16,
                      color: semanticColors["label-disabled"],
                    }}
                  >
                    {memo.length} / {MEMO_MAX_LENGTH}
                  </ThemedText>
                </View>
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

          {/* 입력 영역과 함께 등장한다 — 탭바는 이 애니메이션 밖이라 그 자리에
              고정된 채 움직이지 않는다. ScrollView와 같은
              KeyboardAvoidingView 안에 있어 키보드가 뜨면 이 CTA도 함께 그
              바로 위로 올라온다. */}
          <ReanimatedAnimated.View
            entering={FadeInDown.duration(220)}
            style={{ paddingHorizontal: 20, paddingBottom: 16 }}
          >
            <PrimaryActionButton
              disabled={!canSubmit}
              label={isSubmitting ? "저장 중..." : "운동 완료하기"}
              onPress={handleSubmit}
            />
          </ReanimatedAnimated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {isTypeSheetVisible && (
        // 이 화면은 카메라 탭의 nested route라 Native TabBar가 함께 보인다 —
        // RN Modal(기본값)은 그 탭바까지 덮으므로 inline(embedded)으로 띄운다.
        <WorkoutTypeBottomSheet
          embedded
          onClose={() => setIsTypeSheetVisible(false)}
          onConfirm={(value) => {
            setExerciseType(value);
            setIsTypeSheetVisible(false);
          }}
          value={exerciseType}
          visible
        />
      )}

      {isIntensitySheetVisible && (
        <IntensityBottomSheet
          embedded
          onClose={() => setIsIntensitySheetVisible(false)}
          onConfirm={(value) => {
            setIntensity(value);
            setIsIntensitySheetVisible(false);
          }}
          value={intensity}
          visible
        />
      )}
    </View>
  );
}
