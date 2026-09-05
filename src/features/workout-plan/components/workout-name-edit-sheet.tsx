import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

import { WorkoutPlanBottomSheet } from "./workout-plan-bottom-sheet";

const MAX_NAME_LENGTH = 10;

type WorkoutNameEditSheetProps = {
  visible: boolean;
  embedded?: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
};

export function WorkoutNameEditSheet({
  visible,
  embedded = false,
  value,
  onClose,
  onConfirm,
}: WorkoutNameEditSheetProps) {
  const [draft, setDraft] = useState(value.slice(0, MAX_NAME_LENGTH));
  const confirmedValue = draft.trim();
  const canConfirm = confirmedValue.length > 0;

  return (
    <WorkoutPlanBottomSheet
      embedded={embedded}
      onClose={onClose}
      title="운동 이름 수정"
      visible={visible}
    >
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="운동 이름"
          autoFocus
          maxLength={MAX_NAME_LENGTH}
          onChangeText={setDraft}
          placeholder="운동 이름을 입력해 주세요"
          placeholderTextColor={semanticColors["label-disabled"]}
          returnKeyType="done"
          style={styles.input}
          value={draft}
        />
        <ThemedText style={styles.count} typography="caption-1-medium">
          {draft.length}/{MAX_NAME_LENGTH}
        </ThemedText>
        {draft.length > 0 && (
          <Pressable
            accessibilityLabel="운동 이름 지우기"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setDraft("")}
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

      <Pressable
        accessibilityRole="button"
        disabled={!canConfirm}
        onPress={() => onConfirm(confirmedValue)}
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
            <ThemedText style={styles.confirmText} typography="body-2-bold">
              확인
            </ThemedText>
          </View>
        )}
      </Pressable>
    </WorkoutPlanBottomSheet>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-subtle"],
    borderRadius: 12,
    flexDirection: "row",
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
  confirmPressable: {
    marginBottom: 8,
    marginTop: 20,
    minHeight: 54,
    width: "100%",
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: semanticColors["label-normal"],
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minHeight: 54,
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
