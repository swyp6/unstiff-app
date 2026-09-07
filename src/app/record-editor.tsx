import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReanimatedAnimated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";
import { completeMission } from "@/features/missions/api";
import { toActualMeasuresDto } from "@/features/workout-record/actual-measure";
import { ActualMeasureStepper } from "@/features/workout-record/components/actual-measure-stepper";
import { saveWorkoutRecord } from "@/features/workout-record/api";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";
import { GoalTypeSelector } from "@/features/workout-plan/components/goal-type-selector";
import { GOAL_TYPES, type GoalType } from "@/features/workout-plan/model";

const MEMO_MAX_LENGTH = 40;

function todayLabel() {
  const today = new Date();
  return `${today.getMonth() + 1}월 ${today.getDate()}일`;
}

// Figma 2438:31731 "[상세보기] 1.14 기록 수정"의 신규(생성) 상태 —
// 실제 서버 기록 수정 API가 코드/Swagger 어디에도 없어(추측 금지 지침)
// 이번 작업은 생성(POST /api/v1/workouts) 경로만 구현한다. 기존 기록을
// 불러와 편집하는 진입점은 이번 작업의 어떤 플로우에도 없다.
export default function RecordEditorScreen() {
  const insets = useSafeAreaInsets();
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
    if (!target || !canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const measures = toActualMeasuresDto(selectedTypes, values);
      const trimmedMemo = memo.trim();
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

  if (!target) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "#161a21" }}>
      {photo ? (
        <Image
          source={{
            uri: getOptimizedImageUrl(photo.secureUrl, { width: 750 }),
          }}
          style={{ position: "absolute", inset: 0 }}
          contentFit="cover"
        />
      ) : null}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top + 48,
          backgroundColor: "rgba(13,15,20,0.5)",
        }}
      />

      <View
        style={{
          paddingTop: insets.top,
          height: insets.top + 48,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 4,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          hitSlop={8}
          onPress={() => router.back()}
          style={{
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={24} color="#ffffff" />
        </Pressable>
        <ThemedText typography="body-2-bold" style={{ color: "#ffffff" }}>
          {todayLabel()}
        </ThemedText>
        <View style={{ width: 48, height: 48 }} />
      </View>

      <View style={{ flex: 1 }} />

      <View
        style={{
          backgroundColor: semanticColors["background-normal"],
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 20) + 20,
        }}
      >
        <View
          style={{
            alignSelf: "center",
            width: 36,
            height: 4,
            borderRadius: 999,
            backgroundColor: semanticColors["fill-normal"],
            marginBottom: 16,
          }}
        />

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: 7, marginBottom: 20 }}>
            <ThemedText typography="title-3-bold">{target.title}</ThemedText>
            <ThemedText
              typography="caption-1-regular"
              style={{ color: semanticColors["label-disabled"] }}
            >
              {todayLabel()} 기록
            </ThemedText>
          </View>

          <View style={{ gap: 16 }}>
            <View style={{ gap: 8 }}>
              <View style={{ gap: 6 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <ThemedText typography="caption-1-bold">
                    기록할 항목
                  </ThemedText>
                  <ThemedText
                    typography="caption-1-regular"
                    style={{ color: semanticColors["label-disabled"] }}
                  >
                    1개 이상
                  </ThemedText>
                </View>
                <GoalTypeSelector value={selectedTypes} onToggle={toggleType} />
              </View>

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

            <View style={{ gap: 6 }}>
              <ThemedText typography="caption-1-bold">
                한 줄 기록 (선택)
              </ThemedText>
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
          </View>

          {error && (
            <ThemedText
              typography="caption-1-regular"
              style={{
                color: "#ff6b6b",
                textAlign: "center",
                marginTop: 12,
              }}
            >
              {error}
            </ThemedText>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={({ pressed }) => pressed && canSubmit && { opacity: 0.7 }}
          >
            <View
              style={{
                marginTop: 16,
                height: 54,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: canSubmit
                  ? semanticColors["label-normal"]
                  : semanticColors["fill-normal"],
              }}
            >
              <ThemedText
                typography="body-1-bold"
                style={{
                  color: canSubmit
                    ? semanticColors["label-inverse"]
                    : semanticColors["label-disabled"],
                }}
              >
                {isSubmitting ? "저장 중..." : "기록 저장"}
              </ThemedText>
            </View>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}
