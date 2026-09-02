import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { semanticColors } from "@/constants/tokens";

const BUBBLE_RADIUS = 20;
const DOT_DELAY_MS = 150;

function Dot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) }),
        ),
        -1,
      ),
    );
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function TypingIndicator() {
  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        <Dot delay={0} />
        <Dot delay={DOT_DELAY_MS} />
        <Dot delay={DOT_DELAY_MS * 2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  bubble: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: BUBBLE_RADIUS,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dot: {
    backgroundColor: semanticColors["label-disabled"],
    borderRadius: 4,
    height: 7,
    width: 7,
  },
});
