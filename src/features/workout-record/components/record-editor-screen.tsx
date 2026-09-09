import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useNavigation } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReanimatedAnimated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { completeMission } from "@/features/missions/api";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";
import { GoalTypeSelector } from "@/features/workout-plan/components/goal-type-selector";
import { IntensityBottomSheet } from "@/features/workout-plan/components/intensity-bottom-sheet";
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
} from "@/features/workout-plan/model";

import { saveWorkoutRecord } from "../api";
import { toActualMeasuresDto } from "../actual-measure";
import { useRecordFlowStore } from "../record-flow-store";

import { ActualMeasureStepper } from "./actual-measure-stepper";

const MEMO_MAX_LENGTH = 40;

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
export function RecordEditorScreen() {
  // root 라우트로 뜰 때는 fullScreenModal이라 <SafeAreaView>가 상단 인셋을
  // 0으로 잡는 경우가 있어(camera.tsx에 같은 주석) 훅에서 직접 읽어 padding
  // 으로 적용한다. 하단은 카메라 탭의 nested route로 뜰 때 iOS 26 NativeTabs의
  // 떠 있는 탭바 높이가 인셋에 포함돼, 고정 CTA가 그 뒤로 숨는 것을 막아준다.
  const insets = useSafeAreaInsets();
  // 뒤로가기는 전역 히스토리(router.back())가 아니라 이 화면이 속한 가장
  // 가까운 navigator에서만 pop한다 — 카메라 탭에서 들어왔으면 그 탭의 nested
  // Stack(→ target), 홈에서 들어왔으면 root Stack(→ 탭 화면)이다. 전역
  // 히스토리를 쓰면 중간에 다른 탭을 다녀온 경우 그 탭으로 빠져나간다.
  const navigation = useNavigation();
  const photo = useRecordFlowStore((state) => state.photo);
  const target = useRecordFlowStore((state) => state.target);
  const setConfirmed = useRecordFlowStore((state) => state.setConfirmed);

  const [selectedTypes, setSelectedTypes] = useState<GoalType[]>([]);
  const [values, setValues] = useState<Record<GoalType, number>>({
    time: 1,
    distance: 0,
    reps: 1,
    sets: 1,
  });
  const [intensity, setIntensity] = useState<Intensity>(null);
  const [isIntensitySheetVisible, setIsIntensitySheetVisible] = useState(false);
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = selectedTypes.length > 0 && !isSubmitting;

  function toggleType(type: GoalType) {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : GOAL_TYPES.filter(
            (goalType) => current.includes(goalType) || goalType === type,
          ),
    );
  }

  async function handleSubmit() {
    if (!target || target.mode !== "LINKED" || !canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const measures = toActualMeasuresDto(selectedTypes, values);
      const trimmedMemo = memo.trim();
      // 강도(intensity)는 화면에서 고를 수 있지만 요청에 넣지 않는다 — 계획
      // (daily-plan/plan-preset)에는 intensity 필드가 있으나 기록 저장
      // (POST /api/v1/workouts)에도 있는지 Swagger로 확인하지 못했고, 확인되지
      // 않은 필드명을 지어내 보내지 않는다. 계약 확인되면 여기에 추가한다.
      await saveWorkoutRecord({
        refType: target.refType,
        refId: target.refId,
        measures,
        ...(photo ? { imageUrl: photo.secureUrl } : null),
        ...(trimmedMemo ? { memo: trimmedMemo } : null),
      });

      // 실제 수행 기록 저장이 성공한 뒤에만 미션 자체를 완료 처리한다 —
      // 두 API는 별개 entity/event라 workout record 저장 실패 시에는
      // 호출하지 않는다. 이 부수 호출이 실패해도(예: 이미 완료 처리된
      // 미션) 사용자가 방금 실제로 남긴 기록 자체는 이미 저장됐으므로
      // 완료 화면 진입을 막지 않고, 로그만 남긴다 — 홈으로 돌아가면
      // getDailyMission() 재조회가 실제 상태를 다시 맞춰준다.
      if (target.refType === "MISSION") {
        completeMission(target.refId).catch((completeError) => {
          console.error("Failed to complete mission", completeError);
        });
      }

      setConfirmed({
        target,
        secureUrl: photo?.secureUrl,
        measures,
        memo: trimmedMemo || undefined,
        date: new Date(),
      });
      router.replace("/record-complete");
    } catch {
      setError("기록을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
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
          paddingBottom: insets.bottom,
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 20,
            gap: 18,
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

          {/* 사진 아래 입력 영역만 아래에서 살짝 올라오며 나타난다 — 카메라
              탭에서 들어온 경우 직전 화면(target)과 사진의 위치·크기가 같고
              그 전환에는 애니메이션이 없어(capture/_layout.tsx), 사진은 고정된
              채 이 영역만 목록과 교체되는 것처럼 보인다. */}
          <ReanimatedAnimated.View
            entering={FadeInDown.duration(220)}
            style={{ gap: 18 }}
          >
            <View style={{ gap: 7 }}>
              <ThemedText typography="title-3-bold">{target.title}</ThemedText>
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
                      labelPrefix="실제 "
                      type={type}
                      value={values[type]}
                      onChange={(value) =>
                        setValues((current) => ({ ...current, [type]: value }))
                      }
                    />
                  </ReanimatedAnimated.View>
                ))}
              </View>
            </View>

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

        {/* Figma 4173:31231에서 CTA는 스크롤과 함께 밀려 올라가지 않고 화면
            하단(탭바 바로 위)에 고정돼 있다. 입력 영역과 함께 등장하도록 같은
            entering을 준다 — 탭바는 이 애니메이션 밖이라 움직이지 않는다. */}
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
      </View>

      {isIntensitySheetVisible && (
        // 하단 카메라 탭에서 들어온 경우 이 화면은 그 탭의 nested route라
        // Native TabBar가 함께 보인다 — RN Modal(기본값)은 그 탭바까지
        // 덮어버리므로 inline(embedded)으로 띄운다(capture/target.tsx의
        // 시트 처리와 같은 이유).
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
