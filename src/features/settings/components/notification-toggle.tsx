import { StyleSheet, Switch, View } from "react-native";

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
    <View style={styles.toggleContainer}>
      <Switch
        accessibilityLabel={accessibilityLabel}
        ios_backgroundColor={semanticColors["fill-strong"]}
        onValueChange={onValueChange}
        style={styles.toggle}
        thumbColor={semanticColors["control-thumb"]}
        trackColor={{
          false: semanticColors["fill-strong"],
          true: TRACK_ON_COLOR,
        }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toggleContainer: {
    alignItems: "center",
    height: 26,
    justifyContent: "center",
    width: 44,
  },
  toggle: {
    transform: [{ scaleX: 44 / 51 }, { scaleY: 26 / 31 }],
  },
});
