import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import {
  formatStartTime,
  getIntensityLabel,
  type GoalType,
  toggleGoalTypeSelection,
  type WorkoutPlanDraft,
} from "@/features/workout-plan/model";

import { DeletePlanModal } from "./delete-plan-modal";
import { GoalStepper } from "./goal-stepper";
import { GoalTypeSelector } from "./goal-type-selector";
import { IntensityBottomSheet } from "./intensity-bottom-sheet";
import { TimePickerBottomSheet } from "./time-picker-bottom-sheet";
import { WorkoutNameEditSheet } from "./workout-name-edit-sheet";
import {
  WorkoutPlanBottomSheet,
  type WorkoutPlanBottomSheetHandle,
} from "./workout-plan-bottom-sheet";
import {
  PrimaryActionButton,
  SectionLabel,
  SelectionRow,
} from "./workout-plan-screen-ui";
import { WorkoutTypeBottomSheet } from "./workout-type-bottom-sheet";

type ChildSheet = "name" | "exerciseType" | "time" | "intensity" | null;
const TITLE_UNDERLINE_DASHES = Array.from({ length: 40 }, (_, index) => index);

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
  const [isParentExpanded, setIsParentExpanded] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [titleTextWidth, setTitleTextWidth] = useState(0);
  const pendingChildSheet = useRef<Exclude<ChildSheet, null> | null>(null);
  const sheetRef = useRef<WorkoutPlanBottomSheetHandle>(null);

  const openChildSheet = useCallback(
    (nextChildSheet: Exclude<ChildSheet, null>) => {
      if (isParentExpanded) {
        setChildSheet(nextChildSheet);
        return;
      }

      pendingChildSheet.current = nextChildSheet;
      setIsParentExpanded(true);
    },
    [isParentExpanded],
  );

  const openTimePicker = useCallback(
    () => openChildSheet("time"),
    [openChildSheet],
  );
  const openIntensityPicker = useCallback(
    () => openChildSheet("intensity"),
    [openChildSheet],
  );
  const handleParentExpanded = useCallback(() => {
    const nextChildSheet = pendingChildSheet.current;
    if (!nextChildSheet) return;

    pendingChildSheet.current = null;
    setChildSheet(nextChildSheet);
  }, []);
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
      {childSheet === "name" && (
        <WorkoutNameEditSheet
          embedded
          onClose={() => setChildSheet(null)}
          onConfirm={(title) => {
            setDetailDraft((current) => ({ ...current, title }));
            setChildSheet(null);
          }}
          value={detailDraft.title}
          visible
        />
      )}

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
    <WorkoutPlanBottomSheet
      expanded={isParentExpanded}
      fullHeight
      initialHeightRatio={713 / 814}
      onClose={onClose}
      onExpanded={handleParentExpanded}
      onExpandedChange={setIsParentExpanded}
      overlay={childOverlay}
      ref={sheetRef}
      visible
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        bounces={false}
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.titleEditArea}>
          <View style={styles.titleRow}>
            <View style={styles.titleTextArea}>
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
            </View>
            <Pressable
              accessibilityLabel="운동 이름 수정"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => openChildSheet("name")}
              style={styles.iconButton}
            >
              <Ionicons
                color={semanticColors["label-normal"]}
                name="pencil-outline"
                size={20}
              />
            </Pressable>
          </View>
        </View>

        <View>
          <SectionLabel>운동 종류</SectionLabel>
          <SelectionRow
            accessibilityLabel="운동 종류 선택"
            onPress={() => openChildSheet("exerciseType")}
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

        <View>
          <SectionLabel>예상 시작 시간</SectionLabel>
          <SelectionRow
            accessibilityLabel="예상 시작 시간 선택"
            onPress={openTimePicker}
            placeholder="선택해주세요"
            value={formatStartTime(detailDraft.startTime)}
          />
        </View>

        <View>
          <SectionLabel>강도</SectionLabel>
          <SelectionRow
            accessibilityLabel="강도 선택"
            onPress={openIntensityPicker}
            placeholder="선택해주세요"
            value={getIntensityLabel(detailDraft.intensity)}
          />
        </View>

        <View>
          <SectionLabel>한 줄 메모</SectionLabel>
          <TextInput
            accessibilityLabel="한 줄 메모"
            maxLength={100}
            onChangeText={(memo) =>
              setDetailDraft((current) => ({ ...current, memo }))
            }
            placeholder="메모를 입력해 주세요"
            placeholderTextColor={semanticColors["label-disabled"]}
            returnKeyType="done"
            style={styles.memoInput}
            value={detailDraft.memo}
          />
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <PrimaryActionButton label="수정 완료하기" onPress={savePlan} />
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
    </WorkoutPlanBottomSheet>
  );
}

const styles = StyleSheet.create({
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
    color: semanticColors["label-disabled"],
  },
  pressed: {
    opacity: 0.7,
  },
});
