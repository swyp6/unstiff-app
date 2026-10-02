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
  // 주어지면 가운데 값을 눌러 휠 피커로 직접 입력할 수 있다(-/+는 그대로
  // 미세 조정). 행 전체가 아니라 값 영역만 누를 수 있게 한다 — 비활성화된
  // -/+ 버튼은 터치를 가져가지 않아 부모 Pressable로 넘어가므로, 행 전체를
  // 누를 수 있게 하면 최소값에서 "-"를 눌렀을 때 피커가 열린다.
  onPressValue?: () => void;
};

export function GoalStepper({
  type,
  value,
  onChange,
  onPressValue,
}: GoalStepperProps) {
  const config = GOAL_CONFIG[type];
  const decrease = () => {
    const nextValue = Math.max(config.minimum, value - config.step);
    onChange(type === "distance" ? Number(nextValue.toFixed(1)) : nextValue);
  };
  const increase = () => {
    const nextValue = Math.min(config.maximum, value + config.step);
    onChange(type === "distance" ? Number(nextValue.toFixed(1)) : nextValue);
  };

  return (
    <View style={styles.container}>
      <ThemedText typography="body-1-bold">{config.label}</ThemedText>
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
        {onPressValue ? (
          <Pressable
            accessibilityLabel={`${config.label} 직접 입력`}
            accessibilityRole="button"
            accessibilityValue={{ text: formatGoalValue(type, value) }}
            hitSlop={{ bottom: 14, left: 4, right: 4, top: 14 }}
            onPress={onPressValue}
          >
            <ThemedText style={styles.value} typography="body-1-bold">
              {formatGoalValue(type, value)}
            </ThemedText>
          </Pressable>
        ) : (
          <ThemedText style={styles.value} typography="body-1-bold">
            {formatGoalValue(type, value)}
          </ThemedText>
        )}
        <Pressable
          accessibilityLabel={`${config.label} 늘리기`}
          accessibilityRole="button"
          disabled={value >= config.maximum}
          onPress={increase}
          style={[
            styles.button,
            value >= config.maximum && styles.disabledButton,
          ]}
        >
          <Ionicons
            color={
              value >= config.maximum
                ? semanticColors["label-disabled"]
                : semanticColors["label-normal"]
            }
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
