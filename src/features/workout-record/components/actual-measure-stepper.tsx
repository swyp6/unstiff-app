import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import type { GoalType } from "@/features/workout-plan/model";

import {
  ACTUAL_MEASURE_CONFIG,
  formatActualMeasureValue,
} from "../actual-measure";

type ActualMeasureStepperProps = {
  type: GoalType;
  value: number;
  onChange: (value: number) => void;
  // 기존 계획/미션에 연결된 기록 화면은 계획의 목표값과 구분되게 "실제 시간"
  // 처럼 라벨 앞에 붙인다(Figma 4173:31231). 직접 입력(MANUAL) 화면은
  // 비교 대상이 없어 그대로 "시간"을 쓴다(Figma 4173:30739).
  labelPrefix?: string;
};

// GoalStepper(계획/루틴 목표값 편집)와 시각적으로 동일하지만 실제 수행값
// 전용 범위(ACTUAL_MEASURE_CONFIG)를 쓴다 — 두 설정을 섞어 쓰지 않도록
// 별도 컴포넌트로 둔다.
export function ActualMeasureStepper({
  type,
  value,
  onChange,
  labelPrefix = "",
}: ActualMeasureStepperProps) {
  const config = ACTUAL_MEASURE_CONFIG[type];
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
      <ThemedText typography="body-2-bold">
        {labelPrefix}
        {config.label}
      </ThemedText>
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
          {formatActualMeasureValue(type, value)}
        </ThemedText>
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
