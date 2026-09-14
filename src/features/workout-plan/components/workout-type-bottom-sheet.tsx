import Ionicons from "@expo/vector-icons/Ionicons";
import { Fragment, useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import { EXERCISE_TYPES } from "@/features/workout-plan/model";

import { BottomSheet } from "@/components/ui/bottom-sheet";

const MAX_CUSTOM_LENGTH = 10;

type WorkoutTypeBottomSheetProps = {
  visible: boolean;
  embedded?: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
};

export function WorkoutTypeBottomSheet({
  visible,
  embedded = false,
  value,
  onClose,
  onConfirm,
}: WorkoutTypeBottomSheetProps) {
  const isDefaultType = EXERCISE_TYPES.some((type) => type === value);
  const [selectedType, setSelectedType] = useState<string | null>(
    isDefaultType ? value : null,
  );
  const [isCustomMode, setIsCustomMode] = useState(!isDefaultType);
  const [customDraft, setCustomDraft] = useState(
    isDefaultType ? "" : value.slice(0, MAX_CUSTOM_LENGTH),
  );
  // 시트가 열리자마자(기존 값이 직접 입력 값이라 isCustomMode가 처음부터
  // true인 경우) 키보드가 자동으로 뜨면 안 되고, "직접 입력"을 눌러서 연
  // 경우에만 키보드가 떠야 한다.
  const [shouldAutoFocusCustom, setShouldAutoFocusCustom] = useState(false);
  // BottomSheet의 KeyboardAvoidingView("padding")는 이 임베디드 시트
  // 구조(Modal + 애니메이션 transform 중첩)에서는 안 먹혀서, 키보드 높이를
  // 직접 추적해 그만큼 컨텐츠 아래쪽에 빈 공간을 줘서 직접 입력 필드와
  // 완료 버튼이 키보드 위로 밀려 올라오게 한다.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setKeyboardHeight(0),
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);
  const customValue = customDraft.trim();
  const isCustomTooLong = customDraft.length > MAX_CUSTOM_LENGTH;
  const canConfirm = isCustomMode
    ? customValue.length > 0 && !isCustomTooLong
    : selectedType !== null;

  const selectDefaultType = (type: string) => {
    setSelectedType(type);
    setIsCustomMode(false);
  };

  const openCustomInput = () => {
    setSelectedType(null);
    setIsCustomMode(true);
    setShouldAutoFocusCustom(true);
  };

  const toggleCustomInput = () => {
    if (isCustomMode) {
      setIsCustomMode(false);
      return;
    }
    openCustomInput();
  };

  return (
    <BottomSheet
      embedded={embedded}
      fixedHeightRatio={682 / 814}
      keyboardAvoiding={false}
      onClose={onClose}
      title="운동 종류"
      visible={visible}
    >
      <View style={[styles.body, { paddingBottom: keyboardHeight }]}>
        <ScrollView
          contentContainerStyle={styles.optionsContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={styles.options}
        >
          {EXERCISE_TYPES.map((type) => {
            const selected = !isCustomMode && selectedType === type;
            return (
              <Fragment key={type}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => selectDefaultType(type)}
                  style={styles.optionPressable}
                >
                  {({ pressed }) => (
                    <View
                      pointerEvents="none"
                      style={[styles.option, pressed && styles.pressed]}
                    >
                      <ThemedText typography="heading-1-medium">
                        {type}
                      </ThemedText>
                      <SelectionCircle selected={selected} />
                    </View>
                  )}
                </Pressable>
                <View style={styles.divider} />
              </Fragment>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={toggleCustomInput}
            style={styles.customOptionPressable}
          >
            {({ pressed }) => (
              <View
                pointerEvents="none"
                style={[styles.option, pressed && styles.pressed]}
              >
                <ThemedText typography="heading-1-medium">직접 입력</ThemedText>
                <Ionicons
                  color={semanticColors["label-subtle"]}
                  name={isCustomMode ? "remove" : "add"}
                  size={14}
                />
              </View>
            )}
          </Pressable>
        </ScrollView>

        {isCustomMode && (
          <>
            <View
              style={[
                styles.customInputRow,
                isCustomTooLong && styles.customInputRowError,
              ]}
            >
              <TextInput
                accessibilityLabel="직접 입력 운동 종류"
                autoFocus={shouldAutoFocusCustom}
                onChangeText={setCustomDraft}
                placeholder="운동 종류를 입력해 주세요"
                placeholderTextColor={semanticColors["label-disabled"]}
                returnKeyType="done"
                style={styles.input}
                value={customDraft}
              />
              <ThemedText
                style={[styles.count, isCustomTooLong && styles.errorText]}
                typography="caption-1-medium"
              >
                {customDraft.length} / {MAX_CUSTOM_LENGTH}
              </ThemedText>
              {customDraft.length > 0 && (
                <Pressable
                  accessibilityLabel="직접 입력 내용 지우기"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setCustomDraft("")}
                  style={styles.clearButton}
                >
                  <Ionicons
                    color={semanticColors["label-subtle"]}
                    name="close-circle"
                    size={20}
                  />
                </Pressable>
              )}
            </View>
            {isCustomTooLong && (
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
                  {MAX_CUSTOM_LENGTH}자까지 쓸 수 있어요
                </ThemedText>
              </View>
            )}
          </>
        )}

        <View style={styles.actionArea}>
          <Pressable
            accessibilityRole="button"
            disabled={!canConfirm}
            onPress={() =>
              onConfirm(isCustomMode ? customValue : (selectedType ?? value))
            }
            style={styles.confirmPressable}
          >
            {({ pressed }) => (
              <View
                pointerEvents="none"
                style={[
                  styles.confirmButton,
                  !canConfirm && styles.disabledButton,
                  pressed && canConfirm && styles.pressed,
                ]}
              >
                <ThemedText style={styles.confirmText} typography="body-1-bold">
                  선택 완료
                </ThemedText>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

function SelectionCircle({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.circle, selected && styles.selectedCircle]}>
      {selected && (
        <Ionicons
          color={semanticColors["label-inverse"]}
          name="checkmark"
          size={14}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  options: {
    flex: 1,
    minHeight: 0,
  },
  optionsContent: {
    flexGrow: 1,
  },
  optionPressable: {
    height: 60,
    width: "100%",
  },
  customOptionPressable: {
    height: 58,
    width: "100%",
  },
  option: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    height: "100%",
    width: "100%",
  },
  divider: {
    backgroundColor: semanticColors["line-subtle"],
    height: 1,
    width: "100%",
  },
  circle: {
    alignItems: "center",
    borderColor: semanticColors["line-strong"],
    borderRadius: 11,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  selectedCircle: {
    backgroundColor: semanticColors["label-normal"],
    borderColor: semanticColors["label-normal"],
  },
  customInputRow: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-subtle"],
    borderColor: "transparent",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 16,
    minHeight: 54,
    paddingLeft: 16,
    paddingRight: 10,
  },
  customInputRowError: {
    borderColor: primitiveColors.red["6"],
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
  input: {
    color: semanticColors["label-normal"],
    flex: 1,
    fontFamily: "Pretendard-Medium",
    fontSize: 16,
    paddingVertical: 0,
  },
  count: {
    color: semanticColors["label-disabled"],
    marginLeft: 8,
  },
  clearButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    marginLeft: 2,
    width: 36,
  },
  actionArea: {
    height: 70,
    paddingTop: 16,
  },
  confirmPressable: {
    height: 54,
    width: "100%",
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: semanticColors["label-normal"],
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    height: 54,
  },
  disabledButton: {
    opacity: 0.35,
  },
  confirmText: {
    color: semanticColors["label-inverse"],
  },
  pressed: {
    opacity: 0.7,
  },
});
