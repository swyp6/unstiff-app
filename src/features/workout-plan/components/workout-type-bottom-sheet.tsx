import Ionicons from "@expo/vector-icons/Ionicons";
import { Fragment, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { EXERCISE_TYPES } from "@/features/workout-plan/model";

import { WorkoutPlanBottomSheet } from "./workout-plan-bottom-sheet";

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
  const customValue = customDraft.trim();
  const canConfirm = isCustomMode
    ? customValue.length > 0
    : selectedType !== null;

  const selectDefaultType = (type: string) => {
    setSelectedType(type);
    setIsCustomMode(false);
  };

  const openCustomInput = () => {
    setSelectedType(null);
    setIsCustomMode(true);
  };

  const toggleCustomInput = () => {
    if (isCustomMode) {
      setIsCustomMode(false);
      return;
    }
    openCustomInput();
  };

  return (
    <WorkoutPlanBottomSheet
      embedded={embedded}
      fixedHeightRatio={682 / 814}
      onClose={onClose}
      title="운동 종류"
      visible={visible}
    >
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
                    <ThemedText typography="body-2-bold">{type}</ThemedText>
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
              <ThemedText typography="body-2-bold">직접 입력</ThemedText>
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
        <View style={styles.customInputRow}>
          <TextInput
            accessibilityLabel="직접 입력 운동 종류"
            autoFocus
            maxLength={MAX_CUSTOM_LENGTH}
            onChangeText={setCustomDraft}
            placeholder="운동 종류를 입력해 주세요"
            placeholderTextColor={semanticColors["label-disabled"]}
            returnKeyType="done"
            style={styles.input}
            value={customDraft}
          />
          <ThemedText style={styles.count} typography="caption-1-medium">
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
    </WorkoutPlanBottomSheet>
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
    borderRadius: 12,
    flexDirection: "row",
    marginTop: 16,
    minHeight: 54,
    paddingLeft: 16,
    paddingRight: 10,
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
