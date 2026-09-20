import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
// 이 파일은 스테퍼 추가/삭제 애니메이션에만 reanimated를 쓴다.
import ReanimatedAnimated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { ActionButton } from "@/components/ui/action-button";
import {
  BottomSheet,
  type BottomSheetHandle,
} from "@/components/ui/bottom-sheet";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import {
  canUseStopwatch,
  formatStartTime,
  getIntensityLabel,
  type GoalType,
  PLAN_MEMO_MAX_LENGTH,
  toggleGoalTypeSelection,
  type WorkoutPlanDraft,
} from "@/features/workout-plan/model";

import { GoalStepper } from "./goal-stepper";
import { GoalTypeSelector } from "./goal-type-selector";
import { IntensityBottomSheet } from "./intensity-bottom-sheet";
import { TimePickerBottomSheet } from "./time-picker-bottom-sheet";
import { WorkoutTypeBottomSheet } from "./workout-type-bottom-sheet";
import { SectionLabel, SelectionRow } from "./workout-plan-screen-ui";

type WorkoutPlanEditSheetProps = {
  visible: boolean;
  value: WorkoutPlanDraft;
  onClose: () => void;
  onDelete: () => void;
  // 신규 추가 흐름에서만 saveAsRoutine이 의미 있다(아래 토글) — 편집 흐름은
  // 이미 저장된 계획을 고치는 것뿐이라 두 번째 인자를 그냥 무시하면 된다.
  onSave: (value: WorkoutPlanDraft, saveAsRoutine: boolean) => void;
  // 기존 계획 편집("운동 계획 편집"/"변경 저장"/삭제 링크 있음)과 신규 계획
  // 추가("운동 추가하기"/삭제 링크 없음, Figma node 2929-5701)가 필드 구성이
  // 완전히 같아서 하나의 시트를 재사용한다.
  title?: string;
  saveLabel?: string;
  showDelete?: boolean;
  // 신규 추가 흐름에서만 "루틴으로 할래요" on/off 토글을 보여준다 — 편집
  // 흐름의 계획은 이미 저장돼 있으니 토글이 필요 없다. 토글이 꺼져 있으면
  // (기본값) 1회성 운동이라 저장된 운동 계획에는 안 들어가고 그날의 운동에만
  // 추가되고, 켜져 있으면 재사용할 루틴이라 저장된 운동 계획에 들어간다.
  showAddToTodayToggle?: boolean;
  // "modal"(기본값)은 기존 그대로 BottomSheet를 RN <Modal>로 전체 화면 위에
  // 띄운다. "inline"은 Modal 없이 현재 화면(호출부) 트리 안에 절대위치로만
  // 겹쳐 그려서, 그 화면이 Native Tab 안에 있으면 탭바를 덮지 않고 그
  // 화면의 콘텐츠 영역(=탭바 위)에서만 덮는다 — capture/target.tsx(Figma
  // 2112:52614, 탭바가 보이는 채로 뜨는 루틴 추가 시트) 전용. home.tsx는
  // 계속 기본값(modal)을 쓰므로 동작이 바뀌지 않는다.
  presentation?: "modal" | "inline";
};

export function WorkoutPlanEditSheet({
  visible,
  value,
  onClose,
  onDelete,
  onSave,
  title = "운동 계획 편집",
  saveLabel = "변경 저장",
  showDelete = true,
  showAddToTodayToggle = false,
  presentation = "modal",
}: WorkoutPlanEditSheetProps) {
  const [draft, setDraft] = useState<WorkoutPlanDraft>(value);
  const [saveAsRoutine, setSaveAsRoutine] = useState(false);
  // "루틴으로 할래요"를 체크하면 버튼도 그 의미(저장된 운동 계획에 등록)에
  // 맞춰 바뀐다 — 편집 흐름(showAddToTodayToggle=false)은 항상 전달받은
  // saveLabel 그대로 쓴다.
  const displayedSaveLabel =
    showAddToTodayToggle && saveAsRoutine ? "루틴으로 추가하기" : saveLabel;
  const isTitleTooLong = draft.title.length > 20;
  const isMemoTooLong = draft.memo.length > PLAN_MEMO_MAX_LENGTH;
  // 운동명·운동 종류·기록할 항목(4개 중 하나 이상) 셋 다 있어야 저장 가능.
  const canSubmit =
    draft.title.trim().length > 0 &&
    !isTitleTooLong &&
    !isMemoTooLong &&
    draft.exerciseType.trim().length > 0 &&
    draft.selectedGoalTypes.length > 0;
  const [isWorkoutTypeSheetVisible, setIsWorkoutTypeSheetVisible] =
    useState(false);
  const [isTimeSheetVisible, setIsTimeSheetVisible] = useState(false);
  const [isIntensitySheetVisible, setIsIntensitySheetVisible] = useState(false);
  // 자식 시트(운동 종류의 "직접 입력")에서 뜬 키보드로 이 시트까지 펼쳐지면
  // 자식을 닫은 뒤 부모 높이가 바뀌어 있게 된다 — 자식이 열려 있는 동안은
  // 키보드에 반응하지 않는다.
  const isChildSheetVisible =
    isWorkoutTypeSheetVisible || isTimeSheetVisible || isIntensitySheetVisible;
  const scrollRef = useRef<ScrollView>(null);
  const sheetRef = useRef<BottomSheetHandle>(null);

  const toggleGoalType = (goalType: GoalType) => {
    setDraft((current) => ({
      ...current,
      selectedGoalTypes: toggleGoalTypeSelection(
        current.selectedGoalTypes,
        goalType,
      ),
    }));
  };

  const childOverlay = (
    <>
      {isWorkoutTypeSheetVisible && (
        <WorkoutTypeBottomSheet
          embedded
          onClose={() => setIsWorkoutTypeSheetVisible(false)}
          onConfirm={(exerciseType) => {
            setDraft((current) => ({ ...current, exerciseType }));
            setIsWorkoutTypeSheetVisible(false);
          }}
          value={draft.exerciseType}
          visible
        />
      )}
      {isTimeSheetVisible && (
        <TimePickerBottomSheet
          embedded
          onClose={() => setIsTimeSheetVisible(false)}
          onConfirm={(startTime) => {
            setDraft((current) => ({ ...current, startTime }));
            setIsTimeSheetVisible(false);
          }}
          value={draft.startTime}
          visible
        />
      )}
      {isIntensitySheetVisible && (
        <IntensityBottomSheet
          embedded
          onClose={() => setIsIntensitySheetVisible(false)}
          onConfirm={(intensity) => {
            setDraft((current) => ({ ...current, intensity }));
            setIsIntensitySheetVisible(false);
          }}
          value={draft.intensity}
          visible
        />
      )}
    </>
  );

  return (
    <BottomSheet
      embedded={presentation === "inline"}
      fullHeight
      // 처음엔 화면 절반만 올라오고, 위로 스와이프하면 이 시트의 원래 높이
      // 비율(713/814)까지만 펼쳐진다(화면 맨 위까지 올라가지 않는다). 펼친
      // 상태에서 아래로 스와이프하면 반으로, 반 상태에서 한 번 더 아래로
      // 스와이프하면 완전히 닫힌다 — BottomSheet의 releaseDrag가 이 3단
      // 스와이프를 그대로 처리한다. 운동명·한 줄 메모 등 안쪽 입력에 포커스돼
      // 키보드가 뜨면(expandOnKeyboardShow) 입력마다 onFocus를 달지 않아도
      // 위로 스와이프한 것과 같이 펼친 높이까지 바로 올라간다.
      expandedHeightRatio={713 / 814}
      expandOnKeyboardShow={!isChildSheetVisible}
      initialHeightRatio={0.5}
      onClose={onClose}
      overlay={childOverlay}
      ref={sheetRef}
      safeAreaEdges={presentation === "inline" ? [] : ["bottom"]}
      title={title}
      visible={visible}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.flex}
      >
        <View>
          <SectionLabel>운동명</SectionLabel>
          <View style={styles.textInputWrapper}>
            <TextInput
              accessibilityLabel="운동명"
              onChangeText={(title) =>
                setDraft((current) => ({ ...current, title }))
              }
              placeholder="운동명을 입력해 주세요"
              placeholderTextColor={semanticColors["label-disabled"]}
              returnKeyType="done"
              style={[
                styles.textInput,
                styles.textInputWithCounter,
                isTitleTooLong && styles.textInputError,
              ]}
              value={draft.title}
            />
            <ThemedText
              style={[styles.charCount, isTitleTooLong && styles.errorText]}
              typography="caption-1-regular"
            >
              {draft.title.length} / 20
            </ThemedText>
          </View>
          {isTitleTooLong && (
            <View style={styles.errorRow}>
              <Ionicons
                color={primitiveColors.red["6"]}
                name="alert-circle"
                size={14}
              />
              <ThemedText
                style={styles.errorText}
                typography="caption-1-regular"
              >
                20자까지 쓸 수 있어요
              </ThemedText>
            </View>
          )}
        </View>

        <View>
          <SectionLabel>운동 종류</SectionLabel>
          <SelectionRow
            accessibilityLabel="운동 종류 선택"
            onPress={() => setIsWorkoutTypeSheetVisible(true)}
            value={draft.exerciseType}
          />
        </View>

        <View>
          <SectionLabel>기록할 항목</SectionLabel>
          <GoalTypeSelector
            onToggle={toggleGoalType}
            value={draft.selectedGoalTypes}
          />
        </View>

        <View style={styles.steppers}>
          {draft.selectedGoalTypes.map((type) => (
            <ReanimatedAnimated.View
              entering={FadeIn}
              exiting={FadeOut}
              key={type}
              layout={LinearTransition}
            >
              <GoalStepper
                onChange={(goalValue) =>
                  setDraft((current) => ({
                    ...current,
                    goalValues: {
                      ...current.goalValues,
                      [type]: goalValue,
                    },
                  }))
                }
                type={type}
                value={draft.goalValues[type]}
              />
            </ReanimatedAnimated.View>
          ))}
        </View>

        {canUseStopwatch(draft) && (
          <View style={styles.stopwatchRow}>
            <ThemedText
              style={styles.stopwatchLabel}
              typography="body-1-regular"
            >
              스톱워치
            </ThemedText>
            <Switch
              accessibilityLabel="스톱워치"
              ios_backgroundColor={semanticColors["fill-strong"]}
              onValueChange={(stopwatchEnabled) =>
                setDraft((current) => ({
                  ...current,
                  stopwatchEnabled,
                }))
              }
              thumbColor={semanticColors["control-thumb"]}
              trackColor={{
                false: semanticColors["fill-strong"],
                true: primitiveColors.orange["500"],
              }}
              value={draft.stopwatchEnabled}
            />
          </View>
        )}

        <View>
          <SectionLabel optional>예상 시작 시간</SectionLabel>
          <SelectionRow
            onPress={() => setIsTimeSheetVisible(true)}
            placeholder="선택해주세요"
            value={formatStartTime(draft.startTime)}
          />
        </View>

        <View>
          <SectionLabel optional>강도</SectionLabel>
          <SelectionRow
            onPress={() => setIsIntensitySheetVisible(true)}
            placeholder="선택해주세요"
            value={getIntensityLabel(draft.intensity)}
          />
        </View>

        <View>
          <SectionLabel
            optional
            trailing={
              <ThemedText
                style={[
                  styles.labelCharCount,
                  isMemoTooLong && styles.errorText,
                ]}
                typography="caption-1-regular"
              >
                {draft.memo.length} / {PLAN_MEMO_MAX_LENGTH}
              </ThemedText>
            }
          >
            한 줄 메모
          </SectionLabel>
          <TextInput
            accessibilityLabel="한 줄 메모"
            multiline
            onChangeText={(memo) =>
              setDraft((current) => ({ ...current, memo }))
            }
            // 마지막 쪽 필드라 포커스되면 스크롤을 끝까지 밀어서
            // 키보드 위로 보이게 한다 — 수정 모달과 동일하게,
            // 키보드 애니메이션이 끝날 즈음 한 번 더 밀어준다.
            onFocus={() => {
              scrollRef.current?.scrollToEnd({ animated: true });
              setTimeout(
                () => scrollRef.current?.scrollToEnd({ animated: true }),
                300,
              );
            }}
            placeholder="메모를 입력해 주세요"
            placeholderTextColor={semanticColors["label-disabled"]}
            returnKeyType="done"
            style={[
              styles.textInput,
              styles.memoTextInput,
              isMemoTooLong && styles.textInputError,
            ]}
            value={draft.memo}
          />
          {isMemoTooLong && (
            <View style={styles.errorRow}>
              <Ionicons
                color={primitiveColors.red["6"]}
                name="alert-circle"
                size={14}
              />
              <ThemedText
                style={styles.errorText}
                typography="caption-1-regular"
              >
                {PLAN_MEMO_MAX_LENGTH}자까지 쓸 수 있어요
              </ThemedText>
            </View>
          )}
        </View>

        {showAddToTodayToggle && (
          <Pressable
            accessibilityLabel="루틴으로 할래요"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: saveAsRoutine }}
            hitSlop={8}
            onPress={() => setSaveAsRoutine((checked) => !checked)}
            style={styles.toggleRow}
          >
            <View
              style={[
                styles.checkbox,
                saveAsRoutine
                  ? styles.checkboxChecked
                  : styles.checkboxUnchecked,
              ]}
            >
              {saveAsRoutine && (
                <Ionicons
                  color={semanticColors["label-inverse"]}
                  name="checkmark"
                  size={14}
                />
              )}
            </View>
            <ThemedText typography="body-1-regular">루틴으로 할래요</ThemedText>
          </Pressable>
        )}

        <View style={styles.actions}>
          <ActionButton
            disabled={!canSubmit}
            label={displayedSaveLabel}
            onPress={() =>
              sheetRef.current?.close(() => onSave(draft, saveAsRoutine))
            }
          />
          {showDelete && (
            <Pressable
              accessibilityRole="button"
              hitSlop={{ bottom: 13, left: 20, right: 20, top: 13 }}
              onPress={() => sheetRef.current?.close(onDelete)}
              style={styles.deleteLinkPressable}
            >
              {({ pressed }) => (
                <View
                  pointerEvents="none"
                  style={[styles.deleteLink, pressed && styles.pressed]}
                >
                  <ThemedText
                    style={styles.deleteLinkText}
                    typography="body-3-bold"
                  >
                    계획 삭제하기
                  </ThemedText>
                </View>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: 20,
    paddingBottom: 12,
  },
  textInputWrapper: {
    justifyContent: "center",
  },
  textInputWithCounter: {
    paddingRight: 64,
  },
  charCount: {
    color: semanticColors["label-disabled"],
    position: "absolute",
    right: 16,
  },
  labelCharCount: {
    color: semanticColors["label-disabled"],
    paddingRight: 4,
  },
  textInput: {
    backgroundColor: semanticColors["fill-subtle"],
    borderColor: "transparent",
    borderRadius: 12,
    borderWidth: 1,
    color: semanticColors["label-normal"],
    fontFamily: "Pretendard-Medium",
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  textInputError: {
    borderColor: primitiveColors.red["6"],
  },
  memoTextInput: {
    lineHeight: 24,
    paddingBottom: 14,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  errorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    color: primitiveColors.red["6"],
  },
  steppers: {
    gap: 8,
  },
  stopwatchRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  stopwatchLabel: {
    color: semanticColors["label-subtle"],
  },
  toggleRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
    height: 20,
  },
  checkbox: {
    alignItems: "center",
    borderRadius: 4,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  checkboxChecked: {
    backgroundColor: semanticColors["label-normal"],
  },
  checkboxUnchecked: {
    borderColor: semanticColors["line-strong"],
    borderWidth: 1,
  },
  actions: {
    gap: 16,
    paddingTop: 16,
  },
  deleteLinkPressable: {
    height: 18,
    width: "100%",
  },
  deleteLink: {
    alignItems: "center",
    justifyContent: "center",
    height: 18,
    width: "100%",
  },
  deleteLinkText: {
    color: semanticColors["label-disabled"],
  },
  pressed: {
    opacity: 0.7,
  },
});
