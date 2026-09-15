import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ActionButton } from "@/components/ui/action-button";
import { semanticColors } from "@/constants/tokens";
import {
  INTENSITY_OPTIONS,
  type Intensity,
} from "@/features/workout-plan/model";

import { BottomSheet } from "@/components/ui/bottom-sheet";

type IntensityBottomSheetProps = {
  visible: boolean;
  embedded?: boolean;
  embeddedBottomInset?: number;
  value: Intensity;
  onClose: () => void;
  onConfirm: (value: Intensity) => void;
};

export function IntensityBottomSheet({
  visible,
  embedded = false,
  embeddedBottomInset,
  value,
  onClose,
  onConfirm,
}: IntensityBottomSheetProps) {
  const [selected, setSelected] = useState(value);

  return (
    <BottomSheet
      embedded={embedded}
      embeddedBottomInset={embeddedBottomInset}
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
                  style={[styles.option, pressed && styles.pressed]}
                >
                  <View style={styles.copy}>
                    <ThemedText typography="body-1-bold">
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
                        size={16}
                      />
                    )}
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.confirmButtonWrapper}>
        <ActionButton label="선택 완료" onPress={() => onConfirm(selected)} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: 10,
  },
  optionPressable: {
    height: 60,
    width: "100%",
  },
  option: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-subtle"],
    borderRadius: 16,
    flexDirection: "row",
    height: 60,
    paddingHorizontal: 16,
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
    borderRadius: 15,
    borderWidth: 1.5,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  selectedRadio: {
    backgroundColor: semanticColors["label-normal"],
    borderColor: semanticColors["label-normal"],
  },
  confirmButtonWrapper: {
    marginTop: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});
