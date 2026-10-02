import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  Keyframe,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { BrandMark } from "@/components/brand-mark";

// Not android-icon-foreground.png: that one is padded for Android's adaptive
// icon safe zone (see app.config.ts), which would make the mascot look
// small here — this bridge isn't circularly masked, so it can use the
// full-bleed artwork.
const ICON = require("@/assets/images/splash-icon.png");
// Matches app.config.ts's expo-splash-screen `imageWidth: 152` so the icon
// doesn't visibly change size handing off from the native splash.
const ICON_SIZE = 152;
const LOGO_GAP = 16;

const LOGO_DELAY_MS = 150;
const LOGO_GROW_DURATION_MS = 700;
const HOLD_MS = 5000;
const FADE_DURATION_MS = 300;

// 뿌둥이 bounce loop. 152px 캐릭터 기준으로 작게 — 점프 10px, 늘어남/눌림 ±9%
// 이내, overshoot 없는 timing만 써서 spring처럼 여러 번 출렁이지 않는다.
// handoff 직후엔 native splash와 같은 정지 상태로 잠깐 보인 뒤 시작한다.
const BOUNCE_START_DELAY_MS = 600;
const CROUCH_DURATION_MS = 120;
const JUMP_DURATION_MS = 240;
const FALL_DURATION_MS = 200;
const LAND_DURATION_MS = 90;
const RECOVER_DURATION_MS = 270;
const PAUSE_DURATION_MS = 600;
const JUMP_HEIGHT = 10;
// splash-icon.png(512px) 안에서 발바닥이 닿는 y(≈425px). scale 기준점을
// 여기 두어야 착지 squash 때 발이 바닥에서 뜨지 않는다.
const ICON_FEET_Y = ICON_SIZE * (425 / 512);

type BouncePose = { translateY: number; scaleX: number; scaleY: number };

const REST_POSE: BouncePose = { translateY: 0, scaleX: 1, scaleY: 1 };

// 한 cycle을 구간별 목표 pose로 정의한다. 세 값이 같은 구간 표를 공유해
// translateY/scaleX/scaleY가 항상 같은 박자로 움직인다.
const BOUNCE_SEGMENTS: {
  duration: number;
  easing: (t: number) => number;
  pose: BouncePose;
}[] = [
  // 힘 모으기 — 살짝 웅크림
  {
    duration: CROUCH_DURATION_MS,
    easing: Easing.out(Easing.quad),
    pose: { translateY: 0, scaleX: 1.04, scaleY: 0.95 },
  },
  // 점프 — 상승하며 세로로 늘어남
  {
    duration: JUMP_DURATION_MS,
    easing: Easing.out(Easing.quad),
    pose: { translateY: -JUMP_HEIGHT, scaleX: 0.95, scaleY: 1.08 },
  },
  // 하강
  {
    duration: FALL_DURATION_MS,
    easing: Easing.in(Easing.quad),
    pose: { translateY: 0, scaleX: 0.98, scaleY: 1.03 },
  },
  // 착지 — 세로로 눌리고 가로로 퍼짐
  {
    duration: LAND_DURATION_MS,
    easing: Easing.out(Easing.quad),
    pose: { translateY: 0, scaleX: 1.08, scaleY: 0.91 },
  },
  // 원래 비율로 복귀
  {
    duration: RECOVER_DURATION_MS,
    easing: Easing.out(Easing.cubic),
    pose: REST_POSE,
  },
  // 잠깐 쉼
  { duration: PAUSE_DURATION_MS, easing: Easing.linear, pose: REST_POSE },
];

function bounceLoop(key: keyof BouncePose) {
  return withDelay(
    BOUNCE_START_DELAY_MS,
    withRepeat(
      withSequence(
        ...BOUNCE_SEGMENTS.map(({ duration, easing, pose }) =>
          withTiming(pose[key], { duration, easing }),
        ),
      ),
      -1,
    ),
  );
}

const logoGrowKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 0.6 }],
    opacity: 0,
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(0.7),
  },
});

// No entrance animation: the native splash already shows this exact icon at
// full size and opacity, so the first RN frame must match it (REST_POSE,
// opacity 1) — a grow-in from scale 0.8 / opacity 0 would make the mascot
// blink out and pop back during the handoff. Only the bounce loop animates
// this view, and it's skipped entirely under the system reduce-motion
// setting. The logo's grow-in stays on its own wrapper.
function BouncingIcon() {
  const reducedMotion = useReducedMotion();
  const translateY = useSharedValue(REST_POSE.translateY);
  const scaleX = useSharedValue(REST_POSE.scaleX);
  const scaleY = useSharedValue(REST_POSE.scaleY);

  useEffect(() => {
    if (reducedMotion) return;
    translateY.value = bounceLoop("translateY");
    scaleX.value = bounceLoop("scaleX");
    scaleY.value = bounceLoop("scaleY");
    return () => {
      cancelAnimation(translateY);
      cancelAnimation(scaleX);
      cancelAnimation(scaleY);
    };
  }, [reducedMotion, translateY, scaleX, scaleY]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
  }));

  return (
    <Animated.View style={[styles.iconBounce, bounceStyle]}>
      <Image
        source={ICON}
        style={{ width: ICON_SIZE, height: ICON_SIZE }}
        contentFit="contain"
      />
    </Animated.View>
  );
}

// The icon sits at a fixed, absolutely-positioned anchor matching the native
// splash's center exactly, and the logo is anchored independently below it —
// so the logo growing in never shifts the icon. (A shared flex container
// with `gap` would nudge the icon up the instant the logo's layout space is
// reserved, even before the logo is visible — that was the "point jump".)
function BrandContent() {
  return (
    <>
      <View style={styles.iconAnchor}>
        <BouncingIcon />
      </View>
      <View style={styles.logoAnchor}>
        <Animated.View
          entering={logoGrowKeyframe
            .duration(LOGO_GROW_DURATION_MS)
            .delay(LOGO_DELAY_MS)}
        >
          <BrandMark />
        </Animated.View>
      </View>
    </>
  );
}

// Bridges the native splash (same icon, same background) to whatever screen
// is ready underneath. Rendered inside a Modal: expo-router's Stack uses
// react-native-screens, whose native-stack screens paint over plain sibling
// Views regardless of zIndex, so a non-Modal overlay gets silently covered.
//
// The fade is a shared-value opacity on one persistent container rather than
// swapping in a new Animated.View with an `entering` keyframe — swapping
// remounted BrandContent, which replayed the grow-in and would snap the
// bouncing icon back to its rest pose the moment the fade began.
export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const hasLaidOut = useRef(false);
  const overlayOpacity = useSharedValue(1);
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent>
      <Animated.View
        onLayout={() => {
          if (hasLaidOut.current) return;
          hasLaidOut.current = true;
          SplashScreen.hideAsync();
          setTimeout(() => {
            overlayOpacity.value = withTiming(
              0,
              { duration: FADE_DURATION_MS, easing: Easing.out(Easing.ease) },
              (finished) => {
                "worklet";
                if (finished) {
                  scheduleOnRN(setVisible, false);
                }
              },
            );
          }, HOLD_MS);
        }}
        style={[styles.splashOverlay, overlayStyle]}
      >
        <BrandContent />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#FFFFFF",
    zIndex: 1000,
  },
  iconAnchor: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    transform: [{ translateY: -ICON_SIZE / 2 }],
  },
  iconBounce: {
    transformOrigin: ["50%", ICON_FEET_Y, 0],
  },
  logoAnchor: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    transform: [{ translateY: ICON_SIZE / 2 + LOGO_GAP }],
  },
});
