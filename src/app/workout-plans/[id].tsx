import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { DeletePlanModal } from "@/features/workout-plan/components/delete-plan-modal";
import { GoalStepper } from "@/features/workout-plan/components/goal-stepper";
import { GoalTypeSelector } from "@/features/workout-plan/components/goal-type-selector";
import { IntensityBottomSheet } from "@/features/workout-plan/components/intensity-bottom-sheet";
import { TimePickerBottomSheet } from "@/features/workout-plan/components/time-picker-bottom-sheet";
import { WorkoutPlanEditSheet } from "@/features/workout-plan/components/workout-plan-edit-sheet";
import {
  PrimaryActionButton,
  SectionLabel,
  SelectionRow,
  WorkoutPlanDragIndicator,
} from "@/features/workout-plan/components/workout-plan-screen-ui";
import {
  formatStartTime,
  getIntensityLabel,
  type GoalType,
  parseWorkoutPlan,
} from "@/features/workout-plan/model";

export default function WorkoutPlanDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    data?: string;
  }>();
  const id = params.id ?? "mock-plan";

  return (
    <WorkoutPlanDetailContent
      data={params.data}
      id={id}
      key={`${id}-${params.data ?? "default"}`}
    />
  );
}

type WorkoutPlanDetailContentProps = {
  id: string;
  data?: string;
};

function WorkoutPlanDetailContent({ id, data }: WorkoutPlanDetailContentProps) {
  const [plan, setPlan] = useState(() => parseWorkoutPlan(data, id));
  const [isTimeSheetVisible, setIsTimeSheetVisible] = useState(false);
  const [isIntensitySheetVisible, setIsIntensitySheetVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);

  const openEdit = () => {
    setIsEditSheetVisible(true);
  };

  const deletePlan = () => {
    setIsDeleteModalVisible(false);
    console.log("[workout-plan] locally deleted", id);
    router.dismissTo({ pathname: "/home", params: { deletedPlanId: id } });
  };

  const finishEditing = () => {
    console.log("[workout-plan] locally updated", plan);
    router.back();
  };

  const toggleGoalType = (goalType: GoalType) => {
    setPlan((current) => {
      const selected = current.selectedGoalTypes.includes(goalType);
      if (selected && current.selectedGoalTypes.length === 1) return current;

      return {
        ...current,
        selectedGoalTypes: selected
          ? current.selectedGoalTypes.filter((type) => type !== goalType)
          : [...current.selectedGoalTypes, goalType],
      };
    });
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <WorkoutPlanDragIndicator />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleRow}>
            <ThemedText
              numberOfLines={2}
              style={styles.title}
              typography="title-1-bold"
            >
              {plan.title}
            </ThemedText>
            <View style={styles.titleAction}>
              <Pressable
                accessibilityLabel="운동 계획 편집"
                accessibilityRole="button"
                hitSlop={8}
                onPress={openEdit}
                style={styles.iconButton}
              >
                <Ionicons
                  color={semanticColors["label-normal"]}
                  name="pencil-outline"
                  size={21}
                />
              </Pressable>
            </View>
          </View>

          <View>
            <SectionLabel>운동 종류</SectionLabel>
            <SelectionRow onPress={openEdit} value={plan.exerciseType} />
          </View>

          <View>
            <SectionLabel>목표</SectionLabel>
            <GoalTypeSelector
              onToggle={toggleGoalType}
              value={plan.selectedGoalTypes}
            />
          </View>

          <View style={styles.steppers}>
            {plan.selectedGoalTypes.map((type) => (
              <GoalStepper
                key={type}
                onChange={(value) =>
                  setPlan((current) => ({
                    ...current,
                    goalValues: { ...current.goalValues, [type]: value },
                  }))
                }
                type={type}
                value={plan.goalValues[type]}
              />
            ))}
          </View>

          <View>
            <SectionLabel>예상 시작 시간</SectionLabel>
            <SelectionRow
              onPress={() => setIsTimeSheetVisible(true)}
              value={formatStartTime(plan.startTime)}
            />
          </View>

          <View>
            <SectionLabel>강도</SectionLabel>
            <SelectionRow
              onPress={() => setIsIntensitySheetVisible(true)}
              value={getIntensityLabel(plan.intensity)}
            />
          </View>

          <View>
            <SectionLabel>한 줄 메모</SectionLabel>
            <TextInput
              accessibilityLabel="한 줄 메모"
              maxLength={100}
              onChangeText={(memo) =>
                setPlan((current) => ({ ...current, memo }))
              }
              placeholder="메모를 입력해 주세요"
              placeholderTextColor={semanticColors["label-disabled"]}
              returnKeyType="done"
              style={styles.memoInput}
              value={plan.memo}
            />
          </View>

          <View style={styles.actions}>
            <PrimaryActionButton
              label="수정 완료하기"
              onPress={finishEditing}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsDeleteModalVisible(true)}
              style={({ pressed }) => [
                styles.deleteLink,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                style={styles.deleteLinkText}
                typography="body-3-bold"
              >
                계획 삭제하기
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {isTimeSheetVisible && (
        <TimePickerBottomSheet
          onClose={() => setIsTimeSheetVisible(false)}
          onConfirm={(startTime) => {
            setPlan((current) => ({ ...current, startTime }));
            setIsTimeSheetVisible(false);
          }}
          value={plan.startTime}
          visible
        />
      )}
      {isIntensitySheetVisible && (
        <IntensityBottomSheet
          onClose={() => setIsIntensitySheetVisible(false)}
          onConfirm={(intensity) => {
            setPlan((current) => ({ ...current, intensity }));
            setIsIntensitySheetVisible(false);
          }}
          value={plan.intensity}
          visible
        />
      )}
      {isEditSheetVisible && (
        <WorkoutPlanEditSheet
          onClose={() => setIsEditSheetVisible(false)}
          onDelete={() => {
            setIsEditSheetVisible(false);
            setIsDeleteModalVisible(true);
          }}
          onSave={(updatedPlan) => {
            setPlan(updatedPlan);
            setIsEditSheetVisible(false);
          }}
          value={plan}
          visible
        />
      )}
      <DeletePlanModal
        onCancel={() => setIsDeleteModalVisible(false)}
        onDelete={deletePlan}
        visible={isDeleteModalVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: semanticColors["background-normal"],
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  title: {
    flexShrink: 1,
  },
  titleAction: {
    alignSelf: "stretch",
    justifyContent: "center",
  },
  iconButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  content: {
    gap: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  steppers: {
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
  },
  actions: {
    alignSelf: "stretch",
    gap: 4,
    paddingTop: 4,
  },
  deleteLink: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    width: "100%",
  },
  deleteLinkText: {
    color: semanticColors["label-disabled"],
  },
  pressed: {
    opacity: 0.7,
  },
});
