import { useState } from "react";
import { Alert, View } from "react-native";

import { GoalStepper } from "@/features/workout-plan/components/goal-stepper";
import { IntensityBottomSheet } from "@/features/workout-plan/components/intensity-bottom-sheet";
import { WorkoutPlanBottomSheet } from "@/features/workout-plan/components/workout-plan-bottom-sheet";
import {
  PrimaryActionButton,
  SectionLabel,
  SelectionRow,
} from "@/features/workout-plan/components/workout-plan-screen-ui";
import {
  fromApiMeasureValue,
  toApiMeasureValue,
} from "@/features/workout-plan/measure-units";
import {
  getIntensityLabel,
  toApiIntensity,
  type GoalType,
  type Intensity,
} from "@/features/workout-plan/model";
import type { ExerciseMeasuresDto } from "@/features/workout-plan/types";

import { updateWorkoutHistory } from "../api";
import type { WorkoutHistoryResponse } from "../types";

const MEASURE_KEY_TO_GOAL_TYPE: Record<keyof ExerciseMeasuresDto, GoalType> = {
  duration: "time",
  distance: "distance",
  count: "reps",
  sets: "sets",
};
const GOAL_TYPE_TO_MEASURE_KEY: Record<GoalType, keyof ExerciseMeasuresDto> = {
  time: "duration",
  distance: "distance",
  reps: "count",
  sets: "sets",
};

function fromApiIntensity(
  value?: WorkoutHistoryResponse["intensity"],
): Intensity {
  return value ? (value.toLowerCase() as Exclude<Intensity, null>) : null;
}

function goalTypesOf(measures: ExerciseMeasuresDto): GoalType[] {
  return (Object.keys(measures) as (keyof ExerciseMeasuresDto)[])
    .filter((key) => measures[key] != null)
    .map((key) => MEASURE_KEY_TO_GOAL_TYPE[key]);
}

type WorkoutHistoryEditSheetProps = {
  visible: boolean;
  entry: WorkoutHistoryResponse;
  onClose: () => void;
  onSaved: (updated: WorkoutHistoryResponse) => void;
};

// Figma 4501:32623 "기록 수정" — 기록한 값(측정 항목)과 강도만 고칠 수 있다.
// 운동 제목/종류는 기록 시점 값이라 API 자체가 수정을 지원하지 않는다.
export function WorkoutHistoryEditSheet({
  visible,
  entry,
  onClose,
  onSaved,
}: WorkoutHistoryEditSheetProps) {
  const goalTypes = goalTypesOf(entry.measures);
  const [goalValues, setGoalValues] = useState<
    Partial<Record<GoalType, number>>
  >(() =>
    Object.fromEntries(
      goalTypes.map((type) => [
        type,
        fromApiMeasureValue(
          type,
          entry.measures[GOAL_TYPE_TO_MEASURE_KEY[type]]!,
        ),
      ]),
    ),
  );
  const [intensity, setIntensity] = useState<Intensity>(
    fromApiIntensity(entry.intensity),
  );
  const [isIntensitySheetVisible, setIsIntensitySheetVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    const measures: ExerciseMeasuresDto = {};
    for (const type of goalTypes) {
      measures[GOAL_TYPE_TO_MEASURE_KEY[type]] = toApiMeasureValue(
        type,
        goalValues[type]!,
      );
    }

    setIsSaving(true);
    try {
      await updateWorkoutHistory(entry.id, {
        measures,
        intensity: toApiIntensity(intensity),
        imageUrl: entry.imageUrl,
        memo: entry.memo,
      });
      onSaved({ ...entry, measures, intensity: toApiIntensity(intensity) });
      onClose();
    } catch {
      Alert.alert("오류", "기록을 수정하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <WorkoutPlanBottomSheet
      onClose={onClose}
      overlay={
        isIntensitySheetVisible && (
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
        )
      }
      title={entry.name}
      visible={visible}
    >
      <View style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <SectionLabel>실제로 얼마나 했나요</SectionLabel>
          {goalTypes.map((type) => (
            <GoalStepper
              key={type}
              onChange={(value) =>
                setGoalValues((current) => ({ ...current, [type]: value }))
              }
              type={type}
              value={goalValues[type]!}
            />
          ))}
        </View>

        <View>
          <SectionLabel>강도</SectionLabel>
          <SelectionRow
            accessibilityLabel="강도 선택"
            onPress={() => setIsIntensitySheetVisible(true)}
            placeholder="선택해주세요"
            value={getIntensityLabel(intensity)}
          />
        </View>

        <PrimaryActionButton
          disabled={isSaving}
          label="수정하기"
          onPress={handleSubmit}
        />
      </View>
    </WorkoutPlanBottomSheet>
  );
}
