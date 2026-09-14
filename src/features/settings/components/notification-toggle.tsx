import { useEffect } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  useAnimatedValue,
} from "react-native";

import { primitiveColors, semanticColors } from "@/constants/tokens";

type NotificationToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
  // 요청 진행 중 등 잠시 조작을 막는 상태 — 흐리게(0.4) 보이고 눌리지 않는다.
  disabled?: boolean;
};

// Figma Toggle (3834:49062) — 트랙 44×26, 노브 22, On은 charcoal/11, Off는
// fill/strong. 네이티브 Switch를 scale로 줄이면 iOS/Android 모양이 서로
// 달라지고 노브 위치도 Figma와 어긋나므로, 접근성(role switch·checked·
// disabled)은 그대로 둔 Pressable 기반 controlled toggle로 그린다.
const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;
const KNOB_SIZE = 22;
const KNOB_INSET = (TRACK_HEIGHT - KNOB_SIZE) / 2;
const KNOB_TRAVEL = TRACK_WIDTH - KNOB_SIZE - KNOB_INSET * 2;

export function NotificationToggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
}: NotificationToggleProps) {
  const progress = useAnimatedValue(value ? 1 : 0);

  useEffect(() => {
    Animated.timing(progress, {
      duration: 150,
      toValue: value ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [progress, value]);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
    >
      <Animated.View
        style={[
          styles.track,
          disabled && styles.disabled,
          {
            backgroundColor: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [
                semanticColors["fill-strong"],
                primitiveColors.charcoal["11"],
              ],
            }),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.knob,
            {
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, KNOB_TRAVEL],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: TRACK_HEIGHT / 2,
    height: TRACK_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: KNOB_INSET,
    width: TRACK_WIDTH,
  },
  knob: {
    backgroundColor: semanticColors["control-thumb"],
    borderRadius: KNOB_SIZE / 2,
    height: KNOB_SIZE,
    width: KNOB_SIZE,
  },
  disabled: {
    opacity: 0.4,
  },
});
