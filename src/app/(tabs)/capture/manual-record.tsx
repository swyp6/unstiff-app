import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Stack, useNavigation } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
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
import { WorkoutTypeBottomSheet } from "@/features/workout-plan/components/workout-type-bottom-sheet";
import {
  PrimaryActionButton,
  SectionLabel,
  SelectionRow,
} from "@/features/workout-plan/components/workout-plan-screen-ui";
import { GOAL_TYPES, type GoalType } from "@/features/workout-plan/model";
import { ActualMeasureStepper } from "@/features/workout-record/components/actual-measure-stepper";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";

const TITLE_MAX_LENGTH = 20;

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
    distance: 0,
    reps: 1,
    sets: 1,
  });

  const canSubmit =
    title.trim().length > 0 &&
    exerciseType.length > 0 &&
    selectedTypes.length > 0;

  function toggleType(type: GoalType) {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : GOAL_TYPES.filter(
            (goalType) => current.includes(goalType) || goalType === type,
          ),
    );
  }

  // 저장 API가 아직 없다. POST /api/v1/workouts는 refType/refId(PLAN|MISSION)를
  // 필수로 요구해서 기존 항목에 연결되지 않은 기록을 만들 수 없고, 운동명·운동
  // 종류를 받을 필드도 확인된 바 없다(Swagger 접근 불가). 계약을 지어내
  // 보내는 대신 여기서 멈추고 안내만 한다 — 서버 계약이 확정되면 이 핸들러가
  // 입력값(title/exerciseType/selectedTypes/values/photo)을 그대로 실어
  // 보내도록 바꾸면 된다.
  function handleSubmit() {
    Alert.alert(
      "아직 지원되지 않는 기능이에요",
      "직접 입력한 운동 기록 저장은 준비 중이에요. 오늘의 운동이나 미션에 연결해 기록해 주세요.",
    );
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

        <ScrollView
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
            <ThemedText typography="heading-1-bold">신규 운동 기록</ThemedText>

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
                        setValues((current) => ({ ...current, [type]: value }))
                      }
                    />
                  </ReanimatedAnimated.View>
                ))}
              </View>
            </View>
          </ReanimatedAnimated.View>
        </ScrollView>

        {/* 입력 영역과 함께 등장한다 — 탭바는 이 애니메이션 밖이라 그 자리에
            고정된 채 움직이지 않는다. */}
        <ReanimatedAnimated.View
          entering={FadeInDown.duration(220)}
          style={{ paddingHorizontal: 20, paddingBottom: 16 }}
        >
          <PrimaryActionButton
            disabled={!canSubmit}
            label="운동 완료하기"
            onPress={handleSubmit}
          />
        </ReanimatedAnimated.View>
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
    </View>
  );
}
