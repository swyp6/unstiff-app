import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  type GestureResponderEvent,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  type PanResponderGestureState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
// 이 파일은 시트 드래그 애니메이션에 이미 RN 기본 Animated를 쓰고 있어서,
// 스테퍼 추가/삭제용 reanimated는 이름 충돌 피하려고 별칭으로 가져온다.
import ReanimatedAnimated, {
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

import { GoalStepper } from "./goal-stepper";
import { GoalTypeSelector } from "./goal-type-selector";
import { IntensityBottomSheet } from "./intensity-bottom-sheet";
import { TimePickerBottomSheet } from "./time-picker-bottom-sheet";
import { WorkoutTypeBottomSheet } from "./workout-type-bottom-sheet";
import {
  PrimaryActionButton,
  SectionLabel,
  SelectionRow,
} from "./workout-plan-screen-ui";

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
  // "modal"(기본값)은 기존 그대로 RN <Modal>로 전체 화면 위에 띄운다.
  // "inline"은 Modal 없이 현재 화면(호출부) 트리 안에 절대위치로만
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
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<WorkoutPlanDraft>(value);
  const [saveAsRoutine, setSaveAsRoutine] = useState(false);
  // "루틴으로 할래요"를 체크하면 버튼도 그 의미(저장된 운동 계획에 등록)에
  // 맞춰 바뀐다 — 편집 흐름(showAddToTodayToggle=false)은 항상 전달받은
  // saveLabel 그대로 쓴다.
  const displayedSaveLabel =
    showAddToTodayToggle && saveAsRoutine ? "루틴 추가하기" : saveLabel;
  // 운동명·운동 종류·기록할 항목(4개 중 하나 이상) 셋 다 있어야 저장 가능.
  const canSubmit =
    draft.title.trim().length > 0 &&
    draft.exerciseType.trim().length > 0 &&
    draft.selectedGoalTypes.length > 0;
  const [isWorkoutTypeSheetVisible, setIsWorkoutTypeSheetVisible] =
    useState(false);
  const [isTimeSheetVisible, setIsTimeSheetVisible] = useState(false);
  const [isIntensitySheetVisible, setIsIntensitySheetVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const initialHeight = windowHeight * (713 / 814);
  const expandedHeight =
    windowHeight - Math.max(insets.top, windowHeight * (58 / 808));
  const [sheetHeight] = useState(() => new Animated.Value(initialHeight));
  const [translateY] = useState(() => new Animated.Value(initialHeight));
  const currentSheetHeight = useRef(initialHeight);
  const dragStartHeight = useRef(initialHeight);
  const snapPoint = useRef<"collapsed" | "expanded">("collapsed");
  const isClosing = useRef(false);

  const animateToHeight = useCallback(
    (toValue: number, nextSnapPoint: "collapsed" | "expanded") => {
      snapPoint.current = nextSnapPoint;
      Animated.spring(sheetHeight, {
        damping: 32,
        mass: 1,
        overshootClamping: true,
        stiffness: 280,
        toValue,
        useNativeDriver: false,
      }).start();
    },
    [sheetHeight],
  );

  const closeSheet = useCallback(
    (afterClose: () => void = onClose) => {
      if (isClosing.current) return;
      isClosing.current = true;
      Animated.timing(translateY, {
        duration: 240,
        toValue: currentSheetHeight.current + insets.bottom,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) afterClose();
      });
    },
    [insets.bottom, onClose, translateY],
  );

  useEffect(() => {
    const listenerId = sheetHeight.addListener(({ value: nextValue }) => {
      currentSheetHeight.current = nextValue;
    });

    sheetHeight.setValue(initialHeight);
    currentSheetHeight.current = initialHeight;
    translateY.setValue(initialHeight + insets.bottom);
    isClosing.current = false;
    Animated.spring(translateY, {
      damping: 32,
      mass: 1,
      overshootClamping: true,
      stiffness: 280,
      toValue: 0,
      useNativeDriver: true,
    }).start();

    return () => {
      sheetHeight.removeListener(listenerId);
      sheetHeight.stopAnimation();
      translateY.stopAnimation();
    };
  }, [initialHeight, insets.bottom, sheetHeight, translateY]);

  const shouldStartDrag = useCallback(
    (_: GestureResponderEvent, gestureState: PanResponderGestureState) =>
      Math.abs(gestureState.dy) > 4 &&
      Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
    [],
  );
  const startDrag = useCallback(() => {
    sheetHeight.stopAnimation();
    dragStartHeight.current = currentSheetHeight.current;
  }, [sheetHeight]);
  const moveDrag = useCallback(
    (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      const nextHeight = Math.max(
        0,
        Math.min(expandedHeight, dragStartHeight.current - gestureState.dy),
      );
      sheetHeight.setValue(nextHeight);
    },
    [expandedHeight, sheetHeight],
  );
  const releaseDrag = useCallback(
    (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      if (snapPoint.current === "expanded") {
        if (gestureState.dy > 60 || gestureState.vy > 0.65) {
          animateToHeight(initialHeight, "collapsed");
        } else {
          animateToHeight(expandedHeight, "expanded");
        }
        return;
      }

      if (gestureState.dy > 110 || gestureState.vy > 1) {
        closeSheet();
      } else if (gestureState.dy < -60 || gestureState.vy < -0.65) {
        animateToHeight(expandedHeight, "expanded");
      } else {
        animateToHeight(initialHeight, "collapsed");
      }
    },
    [animateToHeight, closeSheet, expandedHeight, initialHeight],
  );
  const cancelDrag = useCallback(() => {
    animateToHeight(
      snapPoint.current === "expanded" ? expandedHeight : initialHeight,
      snapPoint.current,
    );
  }, [animateToHeight, expandedHeight, initialHeight]);
  const panResponder = useMemo(
    () =>
      // PanResponder stores these callbacks; ref values are only read when a gesture runs.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponder: shouldStartDrag,
        onPanResponderGrant: startDrag,
        onPanResponderMove: moveDrag,
        onPanResponderRelease: releaseDrag,
        onPanResponderTerminate: cancelDrag,
      }),
    [cancelDrag, moveDrag, releaseDrag, shouldStartDrag, startDrag],
  );

  const toggleGoalType = (goalType: GoalType) => {
    setDraft((current) => ({
      ...current,
      selectedGoalTypes: toggleGoalTypeSelection(
        current.selectedGoalTypes,
        goalType,
      ),
    }));
  };

  const sheetBody = (
    <View style={[styles.dim, presentation === "inline" && styles.dimInline]}>
      <Pressable
        accessibilityLabel="편집 닫기"
        accessibilityRole="button"
        onPress={() => closeSheet()}
        style={styles.backdrop}
      />
      <Animated.View
        style={[styles.sheetPosition, { transform: [{ translateY }] }]}
      >
        <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.flex}
          >
            {/* inline일 때는 시트 아래가 기기 바닥(홈 인디케이터)이 아니라
                이미 그 위에 있는 Native TabBar라, bottom safe-area를 또
                더하면 그만큼 빈 공간이 생긴다. */}
            <SafeAreaView
              edges={presentation === "inline" ? [] : ["bottom"]}
              style={styles.safeArea}
            >
              <View style={styles.dragArea} {...panResponder.panHandlers}>
                <View style={styles.handle} />
              </View>
              <View style={styles.header}>
                <ThemedText style={styles.title} typography="title-3-bold">
                  {title}
                </ThemedText>
              </View>

              <View style={styles.scrollViewport}>
                <ScrollView
                  contentContainerStyle={styles.content}
                  keyboardDismissMode="on-drag"
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  ref={scrollRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.scrollView}
                >
                  <View>
                    <SectionLabel>운동명</SectionLabel>
                    <TextInput
                      accessibilityLabel="운동명"
                      maxLength={20}
                      onChangeText={(title) =>
                        setDraft((current) => ({ ...current, title }))
                      }
                      placeholder="운동명을 입력해 주세요"
                      placeholderTextColor={semanticColors["label-disabled"]}
                      returnKeyType="done"
                      style={styles.textInput}
                      value={draft.title}
                    />
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
                        typography="body-2-regular"
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
                    <SectionLabel>예상 시작 시간</SectionLabel>
                    <SelectionRow
                      onPress={() => setIsTimeSheetVisible(true)}
                      placeholder="선택해주세요"
                      value={formatStartTime(draft.startTime)}
                    />
                  </View>

                  <View>
                    <SectionLabel>강도</SectionLabel>
                    <SelectionRow
                      onPress={() => setIsIntensitySheetVisible(true)}
                      placeholder="선택해주세요"
                      value={getIntensityLabel(draft.intensity)}
                    />
                  </View>

                  <View>
                    <SectionLabel>한 줄 메모</SectionLabel>
                    <TextInput
                      accessibilityLabel="한 줄 메모"
                      maxLength={20}
                      onChangeText={(memo) =>
                        setDraft((current) => ({ ...current, memo }))
                      }
                      // 마지막 쪽 필드라 포커스되면 스크롤을 끝까지 밀어서
                      // 키보드 위로 보이게 한다 — 수정 모달과 동일하게,
                      // 키보드 애니메이션이 끝날 즈음 한 번 더 밀어준다.
                      onFocus={() => {
                        scrollRef.current?.scrollToEnd({ animated: true });
                        setTimeout(
                          () =>
                            scrollRef.current?.scrollToEnd({
                              animated: true,
                            }),
                          300,
                        );
                      }}
                      placeholder="메모를 입력해 주세요"
                      placeholderTextColor={semanticColors["label-disabled"]}
                      returnKeyType="done"
                      style={styles.textInput}
                      value={draft.memo}
                    />
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
                      <ThemedText typography="body-2-regular">
                        루틴으로 할래요
                      </ThemedText>
                    </Pressable>
                  )}

                  <View style={styles.actions}>
                    <PrimaryActionButton
                      disabled={!canSubmit}
                      label={displayedSaveLabel}
                      onPress={() =>
                        closeSheet(() => onSave(draft, saveAsRoutine))
                      }
                    />
                    {showDelete && (
                      <Pressable
                        accessibilityRole="button"
                        hitSlop={{ bottom: 13, left: 20, right: 20, top: 13 }}
                        onPress={() => closeSheet(onDelete)}
                        style={styles.deleteLinkPressable}
                      >
                        {({ pressed }) => (
                          <View
                            pointerEvents="none"
                            style={[
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
                          </View>
                        )}
                      </Pressable>
                    )}
                  </View>
                </ScrollView>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
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
    </View>
  );

  if (presentation === "inline") {
    if (!visible) return null;
    return sheetBody;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={() => closeSheet()}
      transparent
      visible={visible}
    >
      {sheetBody}
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: {
    backgroundColor: "rgba(23, 23, 25, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  // inline 모드는 Modal 없이 호출부 화면(예: capture/target.tsx) 트리
  // 안에서 그 화면의 콘텐츠 영역만 덮어야 하므로, flex:1 대신 그 화면의
  // 가장 가까운 relative 조상(=화면 자신) 기준으로 절대위치 전체를 채운다
  // — 그래야 그 화면 바깥의 Native TabBar까지는 덮지 않는다.
  dimInline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  sheet: {
    backgroundColor: semanticColors["background-normal"],
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  sheetPosition: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 1,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  dragArea: {
    alignItems: "center",
    height: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: 2,
    height: 4,
    width: 36,
  },
  header: {
    height: 47,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  title: {
    margin: 0,
  },
  content: {
    gap: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  scrollViewport: {
    flex: 1,
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
  },
  textInput: {
    backgroundColor: semanticColors["fill-subtle"],
    borderRadius: 12,
    color: semanticColors["label-normal"],
    fontFamily: "Pretendard-Medium",
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 16,
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
