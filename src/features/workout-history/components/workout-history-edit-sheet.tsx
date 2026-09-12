import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
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
  formatGoalValue,
  getIntensityLabel,
  GOAL_CONFIG,
  toApiIntensity,
  type GoalType,
  type Intensity,
} from "@/features/workout-plan/model";
import type { ExerciseMeasuresDto } from "@/features/workout-plan/types";

import { updateWorkoutHistory } from "../api";
import type { WorkoutHistoryResponse } from "../types";
import {
  NumberValueInputSheet,
  TimeValueInputSheet,
} from "./measure-value-sheets";

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

// "18분" 대신 "18분 24초" — 계획 스텝퍼(5분 단위)와 달리 실제 기록은 초
// 단위까지 남아있어 그 정밀도를 보여줘야 한다.
function formatTimeMinSec(uiMinutes: number): string {
  const totalSeconds = Math.round(uiMinutes * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}분 ${seconds}초` : `${minutes}분`;
}

// Figma 4501:36091 "Field / 스테퍼" — 라벨 + 감소/증가 버튼 + 값. 값을 직접
// 탭하면 정확한 값을 입력할 수 있는 시트가 뜬다(부모가 onPressValue로 연다).
function MeasureFieldRow({
  type,
  value,
  onChange,
  onPressValue,
}: {
  type: GoalType;
  value: number;
  onChange: (value: number) => void;
  onPressValue: () => void;
}) {
  const config = GOAL_CONFIG[type];
  const displayValue =
    type === "time" ? formatTimeMinSec(value) : formatGoalValue(type, value);

  return (
    <View className="flex-row items-center gap-2.5 rounded-[14px] bg-fill-subtle py-2.5 pl-[18px] pr-3.5">
      <ThemedText
        typography="body-2-bold"
        style={{ flex: 1, color: "#424246" }}
      >
        {config.label}
      </ThemedText>
      <Pressable
        accessibilityLabel={`${config.label} 줄이기`}
        accessibilityRole="button"
        className="h-10 w-10 items-center justify-center rounded-full bg-background-normal"
        onPress={() => onChange(Math.max(config.minimum, value - config.step))}
      >
        <Ionicons
          color={semanticColors["label-normal"]}
          name="remove"
          size={15}
        />
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onPressValue}>
        <ThemedText typography="body-1-bold">{displayValue}</ThemedText>
      </Pressable>
      <Pressable
        accessibilityLabel={`${config.label} 늘리기`}
        accessibilityRole="button"
        className="h-10 w-10 items-center justify-center rounded-full bg-background-normal"
        onPress={() => onChange(value + config.step)}
      >
        <Ionicons color={semanticColors["label-normal"]} name="add" size={15} />
      </Pressable>
    </View>
  );
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
  const [activeFieldSheet, setActiveFieldSheet] = useState<GoalType | null>(
    null,
  );
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

  function renderFieldSheet() {
    if (!activeFieldSheet) return null;
    const close = () => setActiveFieldSheet(null);

    if (activeFieldSheet === "time") {
      const current = goalValues.time ?? 0;
      const totalSeconds = Math.round(current * 60);
      return (
        <TimeValueInputSheet
          minutes={Math.floor(totalSeconds / 60)}
          onClose={close}
          onConfirm={(minutes, seconds) => {
            setGoalValues((c) => ({ ...c, time: minutes + seconds / 60 }));
            close();
          }}
          seconds={totalSeconds % 60}
        />
      );
    }

    return (
      <NumberValueInputSheet
        initialValue={goalValues[activeFieldSheet]!}
        onClose={close}
        onConfirm={(value) => {
          setGoalValues((c) => ({ ...c, [activeFieldSheet]: value }));
          close();
        }}
        quickAddAmounts={
          activeFieldSheet === "distance" ? [1, 3, 5, 10] : undefined
        }
        title={GOAL_CONFIG[activeFieldSheet].label}
        unit={GOAL_CONFIG[activeFieldSheet].unit}
      />
    );
  }

  return (
    <WorkoutPlanBottomSheet
      onClose={onClose}
      overlay={
        isIntensitySheetVisible ? (
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
        ) : (
          renderFieldSheet()
        )
      }
      title={entry.name}
      visible={visible}
    >
      <View style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <SectionLabel>실제로 얼마나 했나요</SectionLabel>
          {goalTypes.map((type) => (
            <MeasureFieldRow
              key={type}
              onChange={(value) =>
                setGoalValues((current) => ({ ...current, [type]: value }))
              }
              onPressValue={() => setActiveFieldSheet(type)}
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
