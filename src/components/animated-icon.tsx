import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import Animated, { Easing, Keyframe } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { BrandMark } from "@/components/brand-mark";

// Not android-icon-foreground.png: that one is padded for Android's adaptive
// icon safe zone (see app.config.ts), which would make the mascot look
// small here — this bridge isn't circularly masked, so it can use the
// full-bleed artwork.
const ICON = require("@/assets/images/splash-icon.png");
// Matches app.config.ts's expo-splash-screen `imageWidth: 76` so the icon
// doesn't visibly change size handing off from the native splash.
const ICON_SIZE = 152;
const LOGO_GAP = 16;

const ICON_GROW_DURATION_MS = 400;
const LOGO_DELAY_MS = 150;
const LOGO_GROW_DURATION_MS = 700;
const HOLD_MS = 5000;
const FADE_DURATION_MS = 300;

const iconGrowKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 0.8 }],
    opacity: 0,
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(0.7),
  },
});

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

const fadeKeyframe = new Keyframe({
  0: {
    opacity: 1,
  },
  100: {
    opacity: 0,
    easing: Easing.out(Easing.ease),
  },
});

// The icon sits at a fixed, absolutely-positioned anchor matching the native
// splash's center exactly, and the logo is anchored independently below it —
// so the logo growing in never shifts the icon. (A shared flex container
// with `gap` would nudge the icon up the instant the logo's layout space is
// reserved, even before the logo is visible — that was the "point jump".)
function BrandContent() {
  return (
    <>
      <View style={styles.iconAnchor}>
        <Animated.View
          entering={iconGrowKeyframe.duration(ICON_GROW_DURATION_MS)}
        >
          <Image
            source={ICON}
            style={{ width: ICON_SIZE, height: ICON_SIZE }}
            contentFit="contain"
          />
        </Animated.View>
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
export function AnimatedSplashOverlay() {
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent>
      {fading ? (
        <Animated.View
          entering={fadeKeyframe
            .duration(FADE_DURATION_MS)
            .withCallback((finished) => {
              "worklet";
              if (finished) {
                scheduleOnRN(setVisible, false);
              }
            })}
          style={styles.splashOverlay}
        >
          <BrandContent />
        </Animated.View>
      ) : (
        <View
          onLayout={() => {
            SplashScreen.hideAsync();
            setTimeout(() => setFading(true), HOLD_MS);
          }}
          style={styles.splashOverlay}
        >
          <BrandContent />
        </View>
      )}
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
  logoAnchor: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    transform: [{ translateY: ICON_SIZE / 2 + LOGO_GAP }],
  },
});
