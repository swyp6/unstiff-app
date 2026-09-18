import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import Animated, {
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
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

import { DeletePlanModal } from "./delete-plan-modal";
import { GoalStepper } from "./goal-stepper";
import { GoalTypeSelector } from "./goal-type-selector";
import { IntensityBottomSheet } from "./intensity-bottom-sheet";
import { TimePickerBottomSheet } from "./time-picker-bottom-sheet";
import { SectionLabel, SelectionRow } from "./workout-plan-screen-ui";
import { WorkoutTypeBottomSheet } from "./workout-type-bottom-sheet";

type ChildSheet = "exerciseType" | "time" | "intensity" | null;
const TITLE_UNDERLINE_DASHES = Array.from({ length: 40 }, (_, index) => index);
const MAX_TITLE_LENGTH = 20;

type WorkoutPlanDetailBottomSheetProps = {
  plan: WorkoutPlanDraft;
  onClose: () => void;
  onDelete: (planId: string) => void;
  onUpdate: (plan: WorkoutPlanDraft) => void;
};

export function WorkoutPlanDetailBottomSheet({
  plan,
  onClose,
  onDelete,
  onUpdate,
}: WorkoutPlanDetailBottomSheetProps) {
  const [detailDraft, setDetailDraft] = useState<WorkoutPlanDraft>(() => ({
    ...plan,
    selectedGoalTypes: [...plan.selectedGoalTypes],
    goalValues: { ...plan.goalValues },
  }));
  const [childSheet, setChildSheet] = useState<ChildSheet>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [titleTextWidth, setTitleTextWidth] = useState(0);
  // 이름 수정은 별도 바텀시트를 띄우지 않고 이 자리에서 바로 입력창으로
  // 바뀐다.
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<TextInput>(null);
  const memoInputRef = useRef<TextInput>(null);
  const sheetRef = useRef<BottomSheetHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  // 반/펼침 스냅을 여기서도 들고 있어야 키보드가 뜰 때 시트를 펼칠 수 있다
  // — 스와이프로 바뀐 값은 onExpandedChange로 돌려받아 동기화한다.
  const [isExpanded, setIsExpanded] = useState(false);
  // BottomSheet의 KeyboardAvoidingView는 이 fullHeight 시트(Modal + 애니메이션
  // transform 중첩)에서는 패딩을 부모 기준으로 잘못 계산해 하단 필드가
  // 키보드에 가린다 — 다른 시트들처럼 키보드 높이를 직접 추적해 처리한다.
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus();
  }, [isEditingTitle]);

  // 키보드를 띄우는 입력(운동 이름·한 줄 메모)에 포커스가 가면 시트를 펼친다.
  // 반만 열린 상태에서는 시트 아래 절반이 화면 밖에 있어 키보드까지 겹치면
  // 입력 필드가 거의 다 가려지기 때문이다. 키보드가 닫혀도 펼친 상태는
  // 유지한다 — 메모를 쓰고 나면 바로 아래의 "수정 완료하기"를 누르는
  // 흐름이라 다시 접으면 버튼이 사라진다. 사용자가 직접 끌어내린 뒤에는
  // 다음 포커스 전까지 다시 펼치지 않는다.
  const expandForKeyboard = useCallback(() => setIsExpanded(true), []);

  // 메모는 마지막 필드라 키보드 위로 보이려면 스크롤을 끝까지 밀어야 한다.
  // 포커스 시점엔 키보드 여백(paddingBottom)이 아직 반영 전이라, 여백이
  // 반영돼 ScrollView 높이가 바뀐 뒤(onLayout)에도 포커스 중이면 한 번 더
  // 민다.
  const scrollMemoIntoView = useCallback(() => {
    if (memoInputRef.current?.isFocused()) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, []);
  const focusMemo = useCallback(() => {
    expandForKeyboard();
    scrollMemoIntoView();
  }, [expandForKeyboard, scrollMemoIntoView]);

  const measureTitle = useCallback((event: LayoutChangeEvent) => {
    setTitleTextWidth(event.nativeEvent.layout.width);
  }, []);

  const toggleGoalType = (goalType: GoalType) => {
    setDetailDraft((current) => ({
      ...current,
      selectedGoalTypes: toggleGoalTypeSelection(
        current.selectedGoalTypes,
        goalType,
      ),
    }));
  };

  const savePlan = () => {
    onUpdate({
      ...detailDraft,
      selectedGoalTypes: [...detailDraft.selectedGoalTypes],
      goalValues: { ...detailDraft.goalValues },
    });
    onClose();
  };

  const childOverlay = (
    <>
      {childSheet === "exerciseType" && (
        <WorkoutTypeBottomSheet
          embedded
          onClose={() => setChildSheet(null)}
          onConfirm={(exerciseType) => {
            setDetailDraft((current) => ({ ...current, exerciseType }));
            setChildSheet(null);
          }}
          value={detailDraft.exerciseType}
          visible
        />
      )}

      {childSheet === "time" && (
        <TimePickerBottomSheet
          embedded
          onClose={() => setChildSheet(null)}
          onConfirm={(startTime) => {
            setDetailDraft((current) => ({ ...current, startTime }));
            setChildSheet(null);
          }}
          value={detailDraft.startTime}
          visible
        />
      )}

      {childSheet === "intensity" && (
        <IntensityBottomSheet
          embedded
          onClose={() => setChildSheet(null)}
          onConfirm={(intensity) => {
            setDetailDraft((current) => ({ ...current, intensity }));
            setChildSheet(null);
          }}
          value={detailDraft.intensity}
          visible
        />
      )}

      {isDeleteModalVisible && (
        <DeletePlanModal
          embedded
          onCancel={() => setIsDeleteModalVisible(false)}
          onDelete={() => {
            setIsDeleteModalVisible(false);
            sheetRef.current?.close(() => onDelete(plan.id));
          }}
          visible
        />
      )}
    </>
  );

  return (
    <BottomSheet
      fullHeight
      // 운동 추가하기 시트(workout-plan-edit-sheet.tsx)와 동일한 2단계
      // 스와이프: 처음엔 화면 절반만 올라오고, 위로 스와이프하면 원래 콘텐츠
      // 높이 비율(713/814) + "계획 삭제하기" 링크(paddingTop 16 + gap 16 +
      // 높이 18 = 50)까지 펼쳐진다. 선택 필드를 누른다고 펼쳐지지는 않고 —
      // 자식 시트(운동 종류·시간·강도·삭제 확인)는 overlay라 부모가 접혀
      // 있어도 그 위에 그대로 뜬다 — 키보드를 띄우는 입력(이름·메모)에
      // 포커스될 때만 expandForKeyboard로 펼친다.
      expanded={isExpanded}
      expandedHeightRatio={(713 + 50) / 814}
      headerExtra={
        <View style={styles.titleEditArea}>
          <View style={styles.titleRow}>
            <View style={styles.titleTextArea}>
              {isEditingTitle ? (
                <TextInput
                  accessibilityLabel="운동 이름"
                  maxLength={MAX_TITLE_LENGTH}
                  onBlur={() => setIsEditingTitle(false)}
                  onChangeText={(title) =>
                    setDetailDraft((current) => ({ ...current, title }))
                  }
                  onFocus={expandForKeyboard}
                  onSubmitEditing={() => setIsEditingTitle(false)}
                  ref={titleInputRef}
                  returnKeyType="done"
                  style={styles.titleInput}
                  value={detailDraft.title}
                />
              ) : (
                <>
                  <ThemedText
                    numberOfLines={1}
                    onLayout={measureTitle}
                    style={styles.title}
                    typography="title-1-bold"
                  >
                    {detailDraft.title}
                  </ThemedText>
                  <View
                    pointerEvents="none"
                    style={[styles.titleUnderline, { width: titleTextWidth }]}
                  >
                    {TITLE_UNDERLINE_DASHES.map((dash) => (
                      <View key={dash} style={styles.titleUnderlineDash} />
                    ))}
                  </View>
                </>
              )}
            </View>
            <Pressable
              accessibilityLabel={
                isEditingTitle ? "운동 이름 수정 완료" : "운동 이름 수정"
              }
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setIsEditingTitle((editing) => !editing)}
              style={styles.iconButton}
            >
              <Ionicons
                color={semanticColors["label-normal"]}
                name={isEditingTitle ? "checkmark" : "pencil-outline"}
                size={20}
              />
            </Pressable>
          </View>
        </View>
      }
      initialHeightRatio={0.5}
      keyboardAvoiding={false}
      onClose={onClose}
      onExpandedChange={setIsExpanded}
      overlay={childOverlay}
      ref={sheetRef}
      visible
    >
      {/* 키보드 높이만큼 아래를 비워 스크롤 영역이 키보드 위에서 끝나게 한다. */}
      <View style={[styles.body, { paddingBottom: keyboardHeight }]}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          onLayout={scrollMemoIntoView}
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View>
            <SectionLabel>운동 종류</SectionLabel>
            <SelectionRow
              accessibilityLabel="운동 종류 선택"
              onPress={() => setChildSheet("exerciseType")}
              value={detailDraft.exerciseType}
            />
          </View>

          <View style={styles.goalSection}>
            <SectionLabel>목표</SectionLabel>
            <GoalTypeSelector
              onToggle={toggleGoalType}
              value={detailDraft.selectedGoalTypes}
            />
            {detailDraft.selectedGoalTypes.length > 0 && (
              <View style={styles.goals}>
                {detailDraft.selectedGoalTypes.map((type) => (
                  <Animated.View
                    entering={FadeIn}
                    exiting={FadeOut}
                    key={type}
                    layout={LinearTransition}
                  >
                    <GoalStepper
                      onChange={(goalValue) =>
                        setDetailDraft((current) => ({
                          ...current,
                          goalValues: {
                            ...current.goalValues,
                            [type]: goalValue,
                          },
                        }))
                      }
                      type={type}
                      value={detailDraft.goalValues[type]}
                    />
                  </Animated.View>
                ))}
              </View>
            )}
          </View>

          {canUseStopwatch(detailDraft) && (
            <View style={styles.stopwatchRow}>
              <ThemedText
                style={styles.stopwatchLabel}
                typography="body-2-regular"
              >
                스톱워치
              </ThemedText>
              <Switch
                accessibilityLabel="스톱워치"
                ios_backgroundColor={semanticColors["fill-strong"]}
                onValueChange={(stopwatchEnabled) =>
                  setDetailDraft((current) => ({
                    ...current,
                    stopwatchEnabled,
                  }))
                }
                thumbColor={semanticColors["control-thumb"]}
                trackColor={{
                  false: semanticColors["fill-strong"],
                  true: primitiveColors.orange["500"],
                }}
                value={detailDraft.stopwatchEnabled}
              />
            </View>
          )}

          <View>
            <SectionLabel>예상 시작 시간</SectionLabel>
            <SelectionRow
              accessibilityLabel="예상 시작 시간 선택"
              onPress={() => setChildSheet("time")}
              placeholder="선택해주세요"
              value={formatStartTime(detailDraft.startTime)}
            />
          </View>

          <View>
            <SectionLabel>강도</SectionLabel>
            <SelectionRow
              accessibilityLabel="강도 선택"
              onPress={() => setChildSheet("intensity")}
              placeholder="선택해주세요"
              value={getIntensityLabel(detailDraft.intensity)}
            />
          </View>

          <View>
            <SectionLabel>한 줄 메모</SectionLabel>
            <TextInput
              accessibilityLabel="한 줄 메모"
              maxLength={PLAN_MEMO_MAX_LENGTH}
              onChangeText={(memo) =>
                setDetailDraft((current) => ({ ...current, memo }))
              }
              onFocus={focusMemo}
              placeholder="메모를 입력해 주세요"
              placeholderTextColor={semanticColors["label-disabled"]}
              ref={memoInputRef}
              returnKeyType="done"
              style={styles.memoInput}
              value={detailDraft.memo}
            />
          </View>

          <View style={styles.actions}>
            <ActionButton label="수정 완료하기" onPress={savePlan} />
            <Pressable
              accessibilityRole="button"
              hitSlop={{ bottom: 13, left: 20, right: 20, top: 13 }}
              onPress={() => setIsDeleteModalVisible(true)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <View pointerEvents="none" style={styles.deleteButton}>
                <ThemedText style={styles.deleteText} typography="body-3-bold">
                  계획 삭제하기
                </ThemedText>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    gap: 20,
    paddingBottom: 20,
    paddingTop: 19,
  },
  titleEditArea: {
    alignSelf: "flex-start",
    height: 64,
    marginBottom: -11,
    maxWidth: "100%",
    // BottomSheet의 content(paddingHorizontal 20)가 아니라 헤더 쪽에
    // 렌더되므로 좌우 여백을 직접 챙겨야 한다.
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  titleTextArea: {
    alignSelf: "flex-start",
    flexShrink: 1,
  },
  title: {
    alignSelf: "flex-start",
  },
  titleInput: {
    color: semanticColors["label-normal"],
    fontFamily: "Pretendard-Bold",
    fontSize: 24,
    lineHeight: 32,
    padding: 0,
  },
  iconButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  titleUnderline: {
    flexDirection: "row",
    gap: 3,
    height: 1,
    marginTop: 2,
    overflow: "hidden",
  },
  titleUnderlineDash: {
    backgroundColor: semanticColors["line-strong"],
    flexShrink: 0,
    height: 1,
    width: 4,
  },
  goalSection: {
    gap: 8,
  },
  goals: {
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
  memoInput: {
    backgroundColor: semanticColors["fill-subtle"],
    borderRadius: 12,
    color: semanticColors["label-normal"],
    fontFamily: "Pretendard-Medium",
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  actions: {
    gap: 16,
    paddingTop: 16,
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 18,
    width: "100%",
  },
  deleteText: {
    color: semanticColors["label-subtle"],
  },
  pressed: {
    opacity: 0.7,
  },
});
