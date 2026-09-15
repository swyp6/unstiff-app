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

import { BotMessageRow } from "./chat-bubble";

const DOT_DELAY_MS = 150;
// 한 줄 봇 말풍선의 본문 높이(body/1 line-height 22)와 맞춰 말풍선 높이가 같게.
const DOTS_ROW_HEIGHT = 22;

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

// 답변 작성중 — 봇 아바타 + 봇 말풍선 안에서 점 세 개가 순서대로 튀어오른다.
export function TypingIndicator() {
  return (
    <BotMessageRow>
      <View style={styles.dots}>
        <Dot delay={0} />
        <Dot delay={DOT_DELAY_MS} />
        <Dot delay={DOT_DELAY_MS * 2} />
      </View>
    </BotMessageRow>
  );
}

const styles = StyleSheet.create({
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    height: DOTS_ROW_HEIGHT,
  },
  dot: {
    backgroundColor: semanticColors["label-disabled"],
    borderRadius: 4,
    height: 7,
    width: 7,
  },
});
