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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import {
  canUseStopwatch,
  formatStartTime,
  getIntensityLabel,
  type GoalType,
  toggleGoalTypeSelection,
  type WorkoutPlanDraft,
} from "@/features/workout-plan/model";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

import { DeletePlanModal } from "./delete-plan-modal";
import { GoalStepper } from "./goal-stepper";
import { GoalTypeSelector } from "./goal-type-selector";
import { IntensityBottomSheet } from "./intensity-bottom-sheet";
import { TimePickerBottomSheet } from "./time-picker-bottom-sheet";
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
  const [isParentExpanded, setIsParentExpanded] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [titleTextWidth, setTitleTextWidth] = useState(0);
  // 이름 수정은 별도 바텀시트를 띄우지 않고 이 자리에서 바로 입력창으로
  // 바뀐다 — 겹쳐 뜨는 시트라 autoFocus가 KeyboardAvoidingView보다 먼저
  // 키보드를 열어버려 입력창이 키보드 아래에 묻히던 문제가 있었다.
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<TextInput>(null);
  const pendingChildSheet = useRef<Exclude<ChildSheet, null> | null>(null);
  const sheetRef = useRef<WorkoutPlanBottomSheetHandle>(null);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  // KeyboardAvoidingView는 이 시트(Modal + 애니메이션 transform으로 겹겹이
  // 싸인 구조) 안에서는 계속 씹혀서(패딩 계산이 아예 안 됨) 못 미더워, 실제
  // 키보드 높이를 Keyboard API로 직접 추적해서 쓴다.
  // (reanimated의 useAnimatedKeyboard는 이 화면에서 "frozen object" 렌더
  // 에러를 던져서 순정 API로 대체했다.)
  const keyboardHeight = useKeyboardHeight();
  // 완료/삭제 버튼 묶음의 실제 높이(패딩 제외) — 스크롤 콘텐츠 맨 아래가
  // 이 떠 있는 푸터 뒤에 가리지 않도록 그만큼 여백을 더 잡아둔다.
  const [actionsHeight, setActionsHeight] = useState(0);

  // 완료/삭제 버튼은 키보드가 얼마나 떠 있든 항상 키보드 바로 위에 붙어
  // 있어야 하므로, 스크롤 영역 밖(overlay)에 별도로 떠 있는 바로 렌더링하고
  // 이 값으로 직접 위치를 맞춘다.
  const actionsBarBottomPadding = Math.max(keyboardHeight, insets.bottom);

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus();
  }, [isEditingTitle]);

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
      {/* 키보드가 뜨면 이 바의 투명한 paddingBottom 영역이 화면 아래 절반
          가까이 차지하는데, pointerEvents 없이는 그 안 보이는 여백도 터치를
          그대로 먹어버려서 그 위치에서 시작한 스크롤 제스처가 아래
          ScrollView까지 전달되지 않았다 — box-none으로 버튼/링크가 아닌
          빈 여백은 터치를 통과시킨다. */}
      <View
        pointerEvents="box-none"
        style={[styles.actionsBar, { paddingBottom: actionsBarBottomPadding }]}
      >
        <View
          onLayout={(event) =>
            setActionsHeight(event.nativeEvent.layout.height)
          }
          style={styles.actions}
        >
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
      </View>

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
      // 713/814는 이 시트의 원래(축소 상태) 콘텐츠 높이 비율이다. 그 아래
      // "계획 삭제하기" 링크(paddingTop 16 + gap 16 + 높이 18 = 50)가 나중에
      // 추가됐는데 이 비율을 안 늘려서, 축소 상태에서 그 링크가 화면 아래로
      // 밀려나 안 보였다 — 시트를 펼쳐야만(translateY 0) 보이던 상태.
      initialHeightRatio={(713 + 50) / 814}
      keyboardAvoiding={false}
      onClose={onClose}
      onExpanded={handleParentExpanded}
      onExpandedChange={setIsParentExpanded}
      overlay={childOverlay}
      ref={sheetRef}
      visible
    >
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.content,
          // 완료/삭제 버튼이 이제 스크롤 밖에서 화면 아래에 떠 있으므로,
          // 마지막 필드(한 줄 메모)가 그 뒤에 가리지 않도록 그 바의 높이만큼
          // 여백을 더 확보한다.
          { paddingBottom: 20 + actionsHeight + actionsBarBottomPadding },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
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
            maxLength={20}
            onChangeText={(memo) =>
              setDetailDraft((current) => ({ ...current, memo }))
            }
            // 마지막 필드라 포커스되면 스크롤 맨 끝까지 밀어서, 예약해둔
            // 여백(키보드+떠 있는 버튼 바 높이) 위로 이 입력창이 보이게
            // 한다. 포커스 시점엔 키보드 높이가 아직 반영 전이라 콘텐츠
            // 여백이 다 안 잡혀 있을 수 있어, 키보드 애니메이션이 끝날
            // 즈음(iOS 기본 250ms) 한 번 더 끝까지 스크롤한다.
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
            style={styles.memoInput}
            value={detailDraft.memo}
          />
        </View>
      </ScrollView>
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
  // 스크롤 영역 밖에서 화면(키보드) 맨 아래에 항상 떠 있는 바 — 세로
  // paddingBottom은 actionsBarBottomPadding(키보드 높이 기준)이 채운다.
  actionsBar: {
    backgroundColor: semanticColors["background-normal"],
    bottom: 0,
    left: 0,
    paddingHorizontal: 20,
    position: "absolute",
    right: 0,
    // 시트 본체(Animated.View)가 zIndex:1이라, 이 값이 없으면 overlay의
    // 형제로 렌더돼도 시트 뒤로 깔려 안 보인다.
    zIndex: 2,
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
