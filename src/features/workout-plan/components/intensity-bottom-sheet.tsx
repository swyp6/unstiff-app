import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import {
  INTENSITY_OPTIONS,
  type Intensity,
} from "@/features/workout-plan/model";

import { WorkoutPlanBottomSheet } from "./workout-plan-bottom-sheet";

type IntensityBottomSheetProps = {
  visible: boolean;
  embedded?: boolean;
  value: Intensity;
  onClose: () => void;
  onConfirm: (value: Intensity) => void;
};

export function IntensityBottomSheet({
  visible,
  embedded = false,
  value,
  onClose,
  onConfirm,
}: IntensityBottomSheetProps) {
  const [selected, setSelected] = useState(value);

  return (
    <WorkoutPlanBottomSheet
      embedded={embedded}
      onClose={onClose}
      title="강도"
      visible={visible}
    >
      <View style={styles.options}>
        {INTENSITY_OPTIONS.map((option) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              key={option.value}
              onPress={() =>
                setSelected((current) =>
                  current === option.value ? null : option.value,
                )
              }
              style={styles.optionPressable}
            >
              {({ pressed }) => (
                <View
                  pointerEvents="none"
                  style={[
                    styles.option,
                    isSelected && styles.selectedOption,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.copy}>
                    <ThemedText typography="body-2-bold">
                      {option.label}
                    </ThemedText>
                    <ThemedText
                      style={styles.description}
                      typography="body-3-regular"
                    >
                      {option.description}
                    </ThemedText>
                  </View>
                  <View
                    style={[styles.radio, isSelected && styles.selectedRadio]}
                  >
                    {isSelected && (
                      <Ionicons
                        color={semanticColors["label-inverse"]}
                        name="checkmark"
                        size={14}
                      />
                    )}
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => onConfirm(selected)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={styles.confirmButton}>
          <ThemedText style={styles.confirmText} typography="body-2-bold">
            확인
          </ThemedText>
        </View>
      </Pressable>
    </WorkoutPlanBottomSheet>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: 10,
  },
  optionPressable: {
    minHeight: 76,
    width: "100%",
  },
  option: {
    alignItems: "center",
    borderColor: semanticColors["line-normal"],
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  selectedOption: {
    backgroundColor: semanticColors["fill-subtle"],
    borderColor: semanticColors["label-normal"],
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  description: {
    color: semanticColors["label-subtle"],
  },
  radio: {
    alignItems: "center",
    borderColor: semanticColors["line-strong"],
    borderRadius: 11,
    borderWidth: 1.5,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  selectedRadio: {
    backgroundColor: semanticColors["label-normal"],
    borderColor: semanticColors["label-normal"],
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: semanticColors["label-normal"],
    borderRadius: 16,
    justifyContent: "center",
    marginBottom: 8,
    marginTop: 20,
    minHeight: 56,
  },
  confirmText: {
    color: semanticColors["label-inverse"],
  },
  pressed: {
    opacity: 0.7,
  },
});
