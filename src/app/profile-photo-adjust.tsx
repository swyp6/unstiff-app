import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { OnboardingCtaButton } from "@/features/auth/components/onboarding-cta-button";
import { OnboardingHeader } from "@/features/auth/components/onboarding-header";
import { useSignupStore } from "@/store/signup-store";

// Figma node 1917:33189 — WF/Signup/CropGuide is a 337x337 circle centered
// 89px below the top of WF/Signup/CropImageArea (~375x582). The gray
// CropImageArea in the wireframe stands for the FULL picked photo, not a
// small window — the photo itself must render across the whole area, dimmed
// outside the circle, at normal brightness inside it, so pan/zoom feels
// like moving the photo under a fixed circular guide.
const CROP_SIZE = 337;
const CROP_TOP_OFFSET = 89;
const MIN_USER_SCALE = 1;
const MAX_USER_SCALE = 3;
// Figma's overlay is a flattened asset with no extractable alpha value —
// this opacity is our own approximation of "dimmed but still visible".
const DIM_OVERLAY_COLOR = "rgba(255, 255, 255, 0.8)";

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

function handleBack() {
  // Cancel semantics: nothing in signup-store has been touched yet (that
  // only happens on "완료" below), so simply going back leaves whatever
  // confirmedPhotoUri profile-photo already had untouched.
  router.back();
}

export default function ProfilePhotoAdjustScreen() {
  const { uri, width, height } = useLocalSearchParams<{
    uri?: string;
    width?: string;
    height?: string;
  }>();
  const { width: stageWidth } = useWindowDimensions();
  const naturalWidth = Number(width);
  const naturalHeight = Number(height);
  const hasValidParams =
    !!uri && Number.isFinite(naturalWidth) && Number.isFinite(naturalHeight);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!hasValidParams) {
      router.replace("/profile-photo");
    }
  }, [hasValidParams]);

  // "Cover" scale so the picked photo's shorter edge exactly fills the
  // circular crop window before any user pinch-zoom (userScale === 1). This
  // is still computed against CROP_SIZE, not the full stage — the circle is
  // what the photo needs to cover by default, same as before.
  const baseScale = hasValidParams
    ? CROP_SIZE / Math.min(naturalWidth, naturalHeight)
    : 1;
  const baseWidth = naturalWidth * baseScale;
  const baseHeight = naturalHeight * baseScale;

  // The circle's position within the stage — both image copies (dimmed
  // full-stage one and bright clipped one) and the crop-math below all
  // treat this as the single source of truth for "where is the guide".
  const circleLeft = (stageWidth - CROP_SIZE) / 2;
  const circleTop = CROP_TOP_OFFSET;
  // Image position centered on the circle at userScale === 1 / no pan,
  // expressed in stage coordinates (for the dimmed copy) — the bright
  // copy re-expresses this relative to the circle window below.
  const imageLeftInStage = circleLeft + (CROP_SIZE - baseWidth) / 2;
  const imageTopInStage = circleTop + (CROP_SIZE - baseHeight) / 2;

  const userScale = useSharedValue(1);
  const savedUserScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Keeps the image covering the whole crop window at all times — called
  // after any gesture that changes scale or position settles.
  const clampToBounds = () => {
    "worklet";
    const dispW = baseWidth * userScale.value;
    const dispH = baseHeight * userScale.value;
    const maxX = Math.max(0, (dispW - CROP_SIZE) / 2);
    const maxY = Math.max(0, (dispH - CROP_SIZE) / 2);
    translateX.value = clamp(translateX.value, -maxX, maxX);
    translateY.value = clamp(translateY.value, -maxY, maxY);
    savedTranslateX.value = translateX.value;
    savedTranslateY.value = translateY.value;
  };

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          "worklet";
          translateX.value = savedTranslateX.value + event.translationX;
          translateY.value = savedTranslateY.value + event.translationY;
        })
        .onEnd(() => {
          "worklet";
          clampToBounds();
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseWidth, baseHeight],
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          "worklet";
          userScale.value = clamp(
            savedUserScale.value * event.scale,
            MIN_USER_SCALE,
            MAX_USER_SCALE,
          );
        })
        .onEnd(() => {
          "worklet";
          savedUserScale.value = userScale.value;
          clampToBounds();
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseWidth, baseHeight],
  );

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Applied to BOTH image copies below so they always move/scale in
  // perfect lockstep — that's what makes the bright circle look like a
  // window cut into the dimmed photo rather than a second, separate image.
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: userScale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  async function handleConfirm() {
    if (isSaving || !uri) return;
    setIsSaving(true);
    try {
      // This math is anchored to the circle window's own frame (same as
      // before this screen rendered the full dimmed photo) — the circle's
      // size/position relative to the image never changed, only what's
      // drawn outside it did, so this still crops the exact same region.
      const totalScale = baseScale * userScale.value;
      const dispW = naturalWidth * totalScale;
      const dispH = naturalHeight * totalScale;
      const cropSize = CROP_SIZE / totalScale;
      const rawX = ((dispW - CROP_SIZE) / 2 - translateX.value) / totalScale;
      const rawY = ((dispH - CROP_SIZE) / 2 - translateY.value) / totalScale;
      const originX = Math.round(
        clamp(rawX, 0, Math.max(0, naturalWidth - cropSize)),
      );
      const originY = Math.round(
        clamp(rawY, 0, Math.max(0, naturalHeight - cropSize)),
      );

      const rendered = await ImageManipulator.manipulate(uri)
        .crop({
          originX,
          originY,
          width: Math.round(cropSize),
          height: Math.round(cropSize),
        })
        .renderAsync();
      const saved = await rendered.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.9,
      });

      useSignupStore.getState().setConfirmedPhotoUri(saved.uri);
      router.back();
    } catch (cropError) {
      console.error("profile photo crop failed", cropError);
      Alert.alert("오류", "사진을 저장하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!hasValidParams) return null;

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      <OnboardingHeader onBack={handleBack} title="사진 조정" />

      <View style={styles.cropArea}>
        <GestureDetector gesture={composedGesture}>
          <View style={StyleSheet.absoluteFill}>
            {/* Full photo across the whole CropImageArea, dimmed outside
                the guide — this is the piece the wireframe's gray
                rectangle stood in for. */}
            <Animated.Image
              source={{ uri }}
              style={[
                styles.image,
                {
                  height: baseHeight,
                  left: imageLeftInStage,
                  top: imageTopInStage,
                  width: baseWidth,
                },
                imageAnimatedStyle,
              ]}
            />
            <View pointerEvents="none" style={styles.dimOverlay} />

            {/* Same photo again, clipped to the circle guide and drawn on
                top with no scrim — reads as a bright "window" cut into the
                dimmed layer beneath. Both copies share the exact same
                animated transform, so they stay pixel-aligned. */}
            <View
              pointerEvents="none"
              style={[
                styles.circleWindow,
                { left: circleLeft, top: circleTop },
              ]}
            >
              <Animated.Image
                source={{ uri }}
                style={[
                  styles.image,
                  {
                    height: baseHeight,
                    left: (CROP_SIZE - baseWidth) / 2,
                    top: (CROP_SIZE - baseHeight) / 2,
                    width: baseWidth,
                  },
                  imageAnimatedStyle,
                ]}
              />
            </View>
          </View>
        </GestureDetector>
      </View>

      <View style={styles.helperContainer}>
        <ThemedText style={styles.helper} typography="body-2-medium">
          원 안에 보일 부분을 기준으로 조정해요.
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <OnboardingCtaButton
          disabled={isSaving}
          label="완료"
          onPress={handleConfirm}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: semanticColors["fill-subtle"],
    flex: 1,
  },
  cropArea: {
    backgroundColor: semanticColors["background-normal"],
    flex: 1,
    overflow: "hidden",
  },
  image: {
    position: "absolute",
  },
  dimOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: DIM_OVERLAY_COLOR,
  },
  circleWindow: {
    borderRadius: CROP_SIZE / 2,
    height: CROP_SIZE,
    overflow: "hidden",
    position: "absolute",
    width: CROP_SIZE,
  },
  helperContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  helper: {
    color: semanticColors["label-subtle"],
    textAlign: "center",
  },
  footer: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
