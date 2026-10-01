import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { ActionButton } from "@/components/ui/action-button";
import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import { GoalTypeSelector } from "@/features/workout-plan/components/goal-type-selector";
import { IntensityBottomSheet } from "@/features/workout-plan/components/intensity-bottom-sheet";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
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
import {
  ACTUAL_MEASURE_CONFIG,
  ACTUAL_MEASURE_TYPES,
  API_MEASURE_RANGE,
  DEFAULT_ACTUAL_MEASURE_VALUES,
  formatActualMeasureValue,
  GOAL_TYPE_TO_MEASURE_KEY,
  isActualMeasuresInRange,
  toActualMeasuresDto,
  toggleActualMeasureType,
} from "@/features/workout-record/actual-measure";
import {
  isRecordMemoTooLong,
  RecordMemoField,
} from "@/features/workout-record/components/record-memo-field";

import { updateWorkoutHistory } from "../api";
import type { WorkoutHistoryResponse } from "../types";
import {
  NumberValueInputSheet,
  TimeValueInputSheet,
} from "./measure-value-sheets";

function fromApiIntensity(
  value?: WorkoutHistoryResponse["intensity"],
): Intensity {
  return value ? (value.toLowerCase() as Exclude<Intensity, null>) : null;
}

// 시트를 열 때 켜 둘 항목 — 기록할 때 실제로 입력한(값이 있는) 항목이다.
// 신규 기록 화면이 연결된 계획의 목표 항목을 처음에 켜 두는 것과 같은
// 역할이라, 나머지 항목도 칩으로 켜서 새로 기록할 수 있다.
function recordedGoalTypesOf(measures: ExerciseMeasuresDto): GoalType[] {
  return ACTUAL_MEASURE_TYPES.filter(
    (type) => measures[GOAL_TYPE_TO_MEASURE_KEY[type]] != null,
  );
}

// targetDate("YYYY-MM-DD") → "8월 30일 기록". Date로 바꾸지 않아 기기
// 타임존에 따라 하루가 밀리지 않는다.
function formatRecordDateLabel(targetDate: string): string {
  const [, month, day] = targetDate.split("-").map(Number);
  return `${month}월 ${day}일 기록`;
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
  // 여기서 고치는 값은 계획 목표값이 아니라 "실제로 한" 기록값이라, 신규
  // 기록 화면(ActualMeasureStepper)과 같은 ACTUAL_MEASURE_CONFIG의
  // step/최소/최대를 쓴다 — GOAL_CONFIG(시간 5분 단위·최소 5분)를 쓰면
  // 3분 기록에서 -를 눌렀을 때 5분으로 올라가는 식으로 어긋난다.
  const config = ACTUAL_MEASURE_CONFIG[type];
  const displayValue =
    type === "time"
      ? formatTimeMinSec(value)
      : formatActualMeasureValue(type, value);
  const decrease = () => {
    const nextValue = Math.max(config.minimum, value - config.step);
    onChange(type === "distance" ? Number(nextValue.toFixed(1)) : nextValue);
  };
  const increase = () => {
    const nextValue = Math.min(config.maximum, value + config.step);
    onChange(type === "distance" ? Number(nextValue.toFixed(1)) : nextValue);
  };

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
        onPress={decrease}
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
        disabled={value >= config.maximum}
        onPress={increase}
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

// Figma 4501:36393 "1.14 기록 수정 시트" — 신규 기록 화면과 같은 기준으로
// 기록 항목(시간/거리/횟수/세트)을 켜고 끄며 값을 고치고, 강도·한 줄 기록도
// 고칠 수 있다. 운동 제목/종류는 기록 시점 값이라 API 자체가 수정을 지원하지
// 않는다.
//
// 닫혀 있는 동안에는 편집 state를 들고 있지 않는다 — 호출부(day-record·
// record-complete)는 이 시트를 key={entry.id}로 계속 마운트해 두므로, 여기서
// state를 만들면 수정 중 닫았다가 다시 열었을 때 저장 안 한 값이 남는다.
// 열릴 때마다 저장된 기록값으로 새로 초기화한다.
export function WorkoutHistoryEditSheet(props: WorkoutHistoryEditSheetProps) {
  if (!props.visible) return null;
  return <WorkoutHistoryEditSheetContent {...props} />;
}

function WorkoutHistoryEditSheetContent({
  entry,
  onClose,
  onSaved,
}: WorkoutHistoryEditSheetProps) {
  const [selectedTypes, setSelectedTypes] = useState<GoalType[]>(() =>
    recordedGoalTypesOf(entry.measures),
  );
  // 기록된 항목은 저장된 값으로, 기록 안 된 항목은 신규 기록 화면에서 처음
  // 켰을 때와 같은 값으로 시작한다.
  const [goalValues, setGoalValues] = useState<Record<GoalType, number>>(
    () => ({
      ...DEFAULT_ACTUAL_MEASURE_VALUES,
      ...Object.fromEntries(
        recordedGoalTypesOf(entry.measures).map((type) => [
          type,
          fromApiMeasureValue(
            type,
            entry.measures[GOAL_TYPE_TO_MEASURE_KEY[type]]!,
          ),
        ]),
      ),
    }),
  );
  const [intensity, setIntensity] = useState<Intensity>(
    fromApiIntensity(entry.intensity),
  );
  const [isIntensitySheetVisible, setIsIntensitySheetVisible] = useState(false);
  const [activeFieldSheet, setActiveFieldSheet] = useState<GoalType | null>(
    null,
  );
  const [memo, setMemo] = useState(entry.memo ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const isMemoFocusedRef = useRef(false);
  // 자식 시트(값 직접 입력)의 키보드로 이 시트까지 펼쳐지면 자식을 닫은 뒤
  // 부모 높이가 바뀌어 있게 된다 — 자식이 열려 있는 동안은 키보드에 반응하지
  // 않는다(workout-plan-edit-sheet와 같은 처리).
  const isChildSheetVisible =
    isIntensitySheetVisible || activeFieldSheet !== null;

  // 켜진 항목만 API 단위로 담는다(신규 기록 저장과 같은 변환) — 꺼진 항목은
  // 필드 자체가 빠지고, 서버가 측정값을 전량 교체하므로 기록에서도 빠진다.
  const measures = toActualMeasuresDto(selectedTypes, goalValues);
  const isMemoTooLong = isRecordMemoTooLong(memo);
  // 서버는 measures가 최소 하나 있어야 한다 — 신규 기록 화면의 canSubmit과
  // 같은 조건.
  const canSave =
    selectedTypes.length > 0 &&
    isActualMeasuresInRange(measures) &&
    !isMemoTooLong &&
    !isSaving;

  // 한 줄 기록은 마지막 필드라 키보드 위로 보이려면 스크롤을 끝까지 밀어야
  // 한다. 포커스 시점엔 키보드로 시트가 펼쳐지기 전이라, 스크롤 영역 높이가
  // 바뀐 뒤(onLayout)·내용 높이가 바뀐 뒤(onContentSizeChange)에도 포커스
  // 중이면 한 번 더 민다.
  const scrollMemoIntoView = useCallback(() => {
    if (isMemoFocusedRef.current) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, []);

  async function handleSubmit() {
    if (!canSave) return;

    const apiIntensity = toApiIntensity(intensity);
    const trimmedMemo = memo.trim();
    setIsSaving(true);
    try {
      // PUT은 보내지 않은 선택 항목을 null로 덮어쓴다 — 사진은 기존 값을
      // 그대로 싣고, 강도·한 줄 기록은 비웠으면 생략해 지운다(신규 기록
      // 저장과 같은 규칙).
      await updateWorkoutHistory(entry.id, {
        measures,
        intensity: apiIntensity,
        imageUrl: entry.imageUrl,
        ...(trimmedMemo ? { memo: trimmedMemo } : null),
      });
      onSaved({
        ...entry,
        measures,
        intensity: apiIntensity,
        memo: trimmedMemo || undefined,
      });
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
      const totalSeconds = Math.round(goalValues.time * 60);
      return (
        <TimeValueInputSheet
          // 서버는 36059초까지 받지만, 프론트는 화면과 관계없이 10시간
          // 00분 00초(ACTUAL_MEASURE_CONFIG.time.maximum)로 통일한다.
          maximumSeconds={toApiMeasureValue(
            "time",
            ACTUAL_MEASURE_CONFIG.time.maximum,
          )}
          minimumSeconds={API_MEASURE_RANGE.duration.minimum}
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
        initialValue={goalValues[activeFieldSheet]}
        // 서버 필드는 Integer다 — 거리는 km→m 변환에서 반올림되지만
        // 횟수·세트는 그대로 나가므로 입력부터 정수만 받는다.
        integerOnly={activeFieldSheet !== "distance"}
        maximum={fromApiMeasureValue(
          activeFieldSheet,
          API_MEASURE_RANGE[GOAL_TYPE_TO_MEASURE_KEY[activeFieldSheet]].maximum,
        )}
        minimum={fromApiMeasureValue(
          activeFieldSheet,
          API_MEASURE_RANGE[GOAL_TYPE_TO_MEASURE_KEY[activeFieldSheet]].minimum,
        )}
        onClose={close}
        onConfirm={(value) => {
          setGoalValues((c) => ({ ...c, [activeFieldSheet]: value }));
          close();
        }}
        quickAddAmounts={
          activeFieldSheet === "distance" ? [1, 3, 5, 10] : undefined
        }
        title={ACTUAL_MEASURE_CONFIG[activeFieldSheet].label}
        unit={ACTUAL_MEASURE_CONFIG[activeFieldSheet].unit}
      />
    );
  }

  return (
    <BottomSheet
      // 메모 입력으로 키보드가 뜨면 시트를 최대 높이로 고정하고, 그 안에서
      // 넘치는 입력 영역은 아래 ScrollView가 맡는다.
      expandOnKeyboardShow={!isChildSheetVisible}
      headerExtra={
        <View style={styles.header}>
          <ThemedText
            style={{ color: primitiveColors.orange["500"] }}
            typography="body-2-medium"
          >
            {entry.exerciseType ?? "미션"}
          </ThemedText>
          <ThemedText typography="title-3-bold">{entry.name}</ThemedText>
          <ThemedText
            style={{ color: primitiveColors.charcoal["5"] }}
            typography="caption-1-regular"
          >
            {formatRecordDateLabel(entry.targetDate)}
          </ThemedText>
        </View>
      }
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
      // 기록 항목이 많아 시트가 화면보다 길어지면 헤더·CTA는 고정한 채
      // 가운데 입력 영역만 스크롤된다.
      shrinkContentToFit
      visible
    >
      <View style={styles.body}>
        <ScrollView
          // 내용이 짧으면 시트가 내용 높이로 열리고 튕김도 없다.
          alwaysBounceVertical={false}
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          // 키보드가 떠 있어도 스테퍼·강도 탭이 키보드 닫기에 먹히지 않게.
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          // 한 줄 기록은 multiline이라 입력 중 줄이 늘면 스크롤 영역 높이는
          // 그대로인 채 내용만 길어진다 — onLayout이 안 불리므로 내용 높이
          // 변화에도 포커스 중이면 끝까지 밀어 입력 중인 줄을 보이게 한다.
          onContentSizeChange={scrollMemoIntoView}
          onLayout={scrollMemoIntoView}
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={{ gap: 8 }}>
            <SectionLabel>실제로 얼마나 했나요</SectionLabel>
            <GoalTypeSelector
              onToggle={(type) =>
                setSelectedTypes((current) =>
                  toggleActualMeasureType(current, type),
                )
              }
              value={selectedTypes}
            />
            {selectedTypes.map((type) => (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                key={type}
                layout={LinearTransition}
              >
                <MeasureFieldRow
                  onChange={(value) =>
                    setGoalValues((current) => ({ ...current, [type]: value }))
                  }
                  onPressValue={() => setActiveFieldSheet(type)}
                  type={type}
                  value={goalValues[type]}
                />
              </Animated.View>
            ))}
          </View>

          <View>
            <SectionLabel optional>강도</SectionLabel>
            <SelectionRow
              accessibilityLabel="강도 선택"
              onPress={() => setIsIntensitySheetVisible(true)}
              placeholder="선택해주세요"
              value={getIntensityLabel(intensity)}
            />
          </View>

          <RecordMemoField
            onBlur={() => {
              isMemoFocusedRef.current = false;
            }}
            onChangeText={setMemo}
            onFocus={() => {
              isMemoFocusedRef.current = true;
              scrollMemoIntoView();
            }}
            value={memo}
          />
        </ScrollView>

        {/* Figma "하단 CTA" — 스크롤 영역 밖에 두어 항목이 많아도 항상 보인다. */}
        <View style={styles.footer}>
          <ActionButton
            disabled={!canSave}
            label="수정하기"
            onPress={handleSubmit}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // BottomSheet 기본 손잡이 영역(20)에 더해 Figma "그래버 영역" 하단 16까지
  // 맞추고, 헤더 아래 20을 띄운다.
  header: {
    gap: 7,
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  // shrinkContentToFit로 시트가 최대 높이에 닿으면 이 영역이 줄어들고, 그만큼
  // ScrollView만 작아진다(CTA는 flexShrink 0이라 그대로).
  body: {
    flexShrink: 1,
    minHeight: 0,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 16,
  },
  footer: {
    paddingTop: 16,
  },
});
