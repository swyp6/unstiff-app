import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import {
  GOAL_CONFIG,
  GOAL_TYPES,
  type GoalType,
} from "@/features/workout-plan/model";

type GoalTypeSelectorProps = {
  value: GoalType[];
  onToggle: (value: GoalType) => void;
};

export function GoalTypeSelector({ value, onToggle }: GoalTypeSelectorProps) {
  return (
    <View style={styles.container}>
      {GOAL_TYPES.map((type) => {
        const selected = value.includes(type);
        return (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            key={type}
            onPress={() => onToggle(type)}
            style={({ pressed }) => [
              styles.pressable,
              pressed && styles.pressed,
            ]}
          >
            <View
              pointerEvents="none"
              style={[styles.chip, selected && styles.selectedChip]}
            >
              <ThemedText
                style={selected ? styles.selectedText : styles.text}
                typography="body-3-bold"
              >
                {GOAL_CONFIG[type].label}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  pressable: {
    height: 34,
    minWidth: 62,
  },
  chip: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-normal"],
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  selectedChip: {
    backgroundColor: semanticColors["label-normal"],
    borderColor: semanticColors["label-normal"],
  },
  selectedText: {
    color: semanticColors["label-inverse"],
  },
  text: {
    color: semanticColors["label-normal"],
  },
  pressed: {
    opacity: 0.7,
  },
});
