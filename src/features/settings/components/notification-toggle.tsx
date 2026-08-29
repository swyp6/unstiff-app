import { Pressable, StyleSheet, View } from "react-native";

import { semanticColors } from "@/constants/tokens";

type NotificationToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
};

const TRACK_ON_COLOR = "#3E3E43";

export function NotificationToggle({
  value,
  onValueChange,
  accessibilityLabel,
}: NotificationToggleProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={9}
      onPress={() => onValueChange(!value)}
      style={styles.toggle}
    >
      <View style={[styles.track, value ? styles.trackOn : styles.trackOff]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    height: 26,
    width: 44,
  },
  track: {
    borderRadius: 999,
    height: 26,
    padding: 2,
    width: 44,
  },
  trackOn: {
    backgroundColor: TRACK_ON_COLOR,
  },
  trackOff: {
    backgroundColor: semanticColors["fill-strong"],
  },
  knob: {
    backgroundColor: semanticColors["control-thumb"],
    borderRadius: 11,
    height: 22,
    width: 22,
  },
  knobOn: {
    transform: [{ translateX: 18 }],
  },
});
