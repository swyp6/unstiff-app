import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import {
  formatGoalValue,
  GOAL_CONFIG,
  type GoalType,
} from "@/features/workout-plan/model";

type GoalStepperProps = {
  type: GoalType;
  value: number;
  onChange: (value: number) => void;
};

export function GoalStepper({ type, value, onChange }: GoalStepperProps) {
  const config = GOAL_CONFIG[type];
  const decrease = () => {
    const nextValue = Math.max(config.minimum, value - config.step);
    onChange(type === "distance" ? Number(nextValue.toFixed(1)) : nextValue);
  };
  const increase = () => {
    const nextValue = value + config.step;
    onChange(type === "distance" ? Number(nextValue.toFixed(1)) : nextValue);
  };

  return (
    <View style={styles.container}>
      <ThemedText typography="body-2-bold">{config.label}</ThemedText>
      <View style={styles.controls}>
        <Pressable
          accessibilityLabel={`${config.label} 줄이기`}
          accessibilityRole="button"
          disabled={value <= config.minimum}
          onPress={decrease}
          style={[
            styles.button,
            value <= config.minimum && styles.disabledButton,
          ]}
        >
          <Ionicons
            color={
              value <= config.minimum
                ? semanticColors["label-disabled"]
                : semanticColors["label-normal"]
            }
            name="remove"
            size={12}
          />
        </Pressable>
        <ThemedText style={styles.value} typography="body-1-bold">
          {formatGoalValue(type, value)}
        </ThemedText>
        <Pressable
          accessibilityLabel={`${config.label} 늘리기`}
          accessibilityRole="button"
          onPress={increase}
          style={styles.button}
        >
          <Ionicons
            color={semanticColors["label-normal"]}
            name="add"
            size={12}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-subtle"],
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    height: 60,
    paddingLeft: 20,
    paddingRight: 18,
  },
  controls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  button: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  disabledButton: {
    opacity: 0.7,
  },
  value: {
    minWidth: 41,
    textAlign: "center",
  },
});
