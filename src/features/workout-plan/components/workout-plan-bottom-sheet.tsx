import type { PropsWithChildren, ReactNode } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  type GestureResponderEvent,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  type PanResponderGestureState,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

type WorkoutPlanBottomSheetProps = PropsWithChildren<{
  visible: boolean;
  title?: string;
  fullHeight?: boolean;
  fixedHeightRatio?: number;
  embedded?: boolean;
  expanded?: boolean;
  initialHeightRatio?: number;
  overlay?: ReactNode;
  onClose: () => void;
  onExpanded?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
}>;

// Lets a parent (e.g. a delete confirmation) trigger the same slide-down
// animation used for every other close path, instead of unmounting the
// sheet immediately — `afterClose` runs once the animation finishes.
export type WorkoutPlanBottomSheetHandle = {
  close: (afterClose?: () => void) => void;
};

export const WorkoutPlanBottomSheet = forwardRef<
  WorkoutPlanBottomSheetHandle,
  WorkoutPlanBottomSheetProps
>(function WorkoutPlanBottomSheet(
  {
    visible,
    title,
    fullHeight = false,
    fixedHeightRatio,
    embedded = false,
    expanded = false,
    initialHeightRatio = 1,
    overlay,
    onClose,
    onExpanded,
    onExpandedChange,
    children,
  },
  ref,
) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [translateY] = useState(() => new Animated.Value(windowHeight));
  const dragStartTranslateY = useRef(0);
  const currentTranslateY = useRef(windowHeight);
  const snapPoint = useRef<"collapsed" | "expanded">(
    expanded ? "expanded" : "collapsed",
  );
  const wasVisible = useRef(false);
  const isClosing = useRef(false);
  const fullSheetHeight =
    windowHeight - Math.max(insets.top, windowHeight * (58 / 808));
  const fixedSheetHeight = fixedHeightRatio
    ? Math.min(windowHeight * fixedHeightRatio, fullSheetHeight)
    : undefined;
  const hasConstrainedHeight = fullHeight || fixedSheetHeight !== undefined;
  const collapsedTranslateY = fullHeight
    ? Math.max(0, fullSheetHeight - windowHeight * initialHeightRatio)
    : 0;

  const animateTo = useCallback(
    (
      toValue: number,
      nextSnapPoint: "collapsed" | "expanded",
      afterAnimation?: () => void,
    ) => {
      snapPoint.current = nextSnapPoint;
      Animated.spring(translateY, {
        damping: 30,
        mass: 1,
        overshootClamping: true,
        stiffness: 280,
        toValue,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) afterAnimation?.();
      });
    },
    [translateY],
  );

  const closeSheet = useCallback(
    (afterClose?: () => void) => {
      if (isClosing.current) return;
      isClosing.current = true;
      Animated.timing(translateY, {
        duration: 220,
        toValue: windowHeight,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) (afterClose ?? onClose)();
      });
    },
    [onClose, translateY, windowHeight],
  );

  useImperativeHandle(ref, () => ({ close: closeSheet }), [closeSheet]);

  useEffect(() => {
    const listenerId = translateY.addListener(({ value }) => {
      currentTranslateY.current = value;
    });

    return () => translateY.removeListener(listenerId);
  }, [translateY]);

  useEffect(() => {
    if (!visible) {
      wasVisible.current = false;
      return;
    }
    if (wasVisible.current) return;
    wasVisible.current = true;

    translateY.setValue(windowHeight);
    currentTranslateY.current = windowHeight;
    isClosing.current = false;
    const initialSnapPoint = expanded ? "expanded" : "collapsed";
    animateTo(
      expanded ? 0 : collapsedTranslateY,
      initialSnapPoint,
      expanded ? onExpanded : undefined,
    );

    return () => {
      translateY.stopAnimation();
    };
  }, [
    animateTo,
    collapsedTranslateY,
    expanded,
    onExpanded,
    translateY,
    visible,
    windowHeight,
  ]);

  useEffect(() => {
    if (!visible || !wasVisible.current || !fullHeight) return;
    const nextSnapPoint = expanded ? "expanded" : "collapsed";
    if (snapPoint.current === nextSnapPoint) return;

    animateTo(
      expanded ? 0 : collapsedTranslateY,
      nextSnapPoint,
      expanded ? onExpanded : undefined,
    );
  }, [
    animateTo,
    collapsedTranslateY,
    expanded,
    fullHeight,
    onExpanded,
    visible,
  ]);

  const shouldStartDrag = useCallback(
    (_: GestureResponderEvent, gestureState: PanResponderGestureState) =>
      Math.abs(gestureState.dy) > 4 &&
      Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
    [],
  );
  const startDrag = useCallback(() => {
    translateY.stopAnimation();
    dragStartTranslateY.current = currentTranslateY.current;
  }, [translateY]);
  const moveDrag = useCallback(
    (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      translateY.setValue(
        Math.max(
          0,
          Math.min(windowHeight, dragStartTranslateY.current + gestureState.dy),
        ),
      );
    },
    [translateY, windowHeight],
  );
  const releaseDrag = useCallback(
    (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      if (fullHeight && collapsedTranslateY > 0) {
        if (snapPoint.current === "expanded") {
          if (gestureState.dy > 60 || gestureState.vy > 0.65) {
            animateTo(collapsedTranslateY, "collapsed");
            onExpandedChange?.(false);
          } else {
            animateTo(0, "expanded", onExpanded);
          }
          return;
        }

        if (gestureState.dy > 110 || gestureState.vy > 1) {
          closeSheet();
        } else if (gestureState.dy < -60 || gestureState.vy < -0.65) {
          animateTo(0, "expanded", onExpanded);
          onExpandedChange?.(true);
        } else {
          animateTo(collapsedTranslateY, "collapsed");
        }
        return;
      }

      if (gestureState.dy > 90 || gestureState.vy > 0.85) {
        closeSheet();
        return;
      }

      animateTo(0, "expanded");
    },
    [
      animateTo,
      closeSheet,
      collapsedTranslateY,
      fullHeight,
      onExpanded,
      onExpandedChange,
    ],
  );
  const cancelDrag = useCallback(() => {
    const isExpanded = snapPoint.current === "expanded";
    animateTo(isExpanded ? 0 : collapsedTranslateY, snapPoint.current);
  }, [animateTo, collapsedTranslateY]);
  const panResponder = useMemo(
    () =>
      // PanResponder stores callbacks; refs are read only after a gesture begins.
      PanResponder.create({
        onMoveShouldSetPanResponder: shouldStartDrag,
        onPanResponderGrant: startDrag,
        onPanResponderMove: moveDrag,
        onPanResponderRelease: releaseDrag,
        onPanResponderTerminate: cancelDrag,
      }),
    [cancelDrag, moveDrag, releaseDrag, shouldStartDrag, startDrag],
  );

  if (!visible) return null;

  const sheetLayer = (
    <View style={[styles.dim, embedded && styles.embeddedLayer]}>
      <Pressable
        accessibilityLabel="닫기"
        accessibilityRole="button"
        onPress={() => closeSheet()}
        style={styles.backdrop}
      />
      <Animated.View
        style={[
          styles.sheet,
          fullHeight && { height: fullSheetHeight },
          fixedSheetHeight !== undefined && { height: fixedSheetHeight },
          { transform: [{ translateY }] },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={hasConstrainedHeight ? styles.flex : undefined}
        >
          <SafeAreaView
            edges={["bottom"]}
            style={hasConstrainedHeight ? styles.flex : undefined}
          >
            <View style={styles.dragArea} {...panResponder.panHandlers}>
              <View style={styles.handle} />
            </View>
            {title && (
              <View style={styles.header}>
                <ThemedText typography="title-3-bold">{title}</ThemedText>
              </View>
            )}
            <View
              style={[
                styles.content,
                hasConstrainedHeight && styles.constrainedContent,
              ]}
            >
              {children}
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Animated.View>
      {overlay}
    </View>
  );

  if (embedded) return sheetLayer;

  return (
    <Modal
      animationType="none"
      onRequestClose={() => closeSheet()}
      transparent
      visible
    >
      {sheetLayer}
    </Modal>
  );
});

const styles = StyleSheet.create({
  dim: {
    backgroundColor: "rgba(23, 23, 25, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  embeddedLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  sheet: {
    backgroundColor: semanticColors["background-normal"],
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "96%",
    overflow: "hidden",
    position: "relative",
    zIndex: 1,
  },
  flex: {
    flex: 1,
  },
  dragArea: {
    alignItems: "center",
    height: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: 2,
    height: 4,
    width: 36,
  },
  header: {
    height: 47,
    justifyContent: "flex-start",
    marginTop: 10,
    paddingHorizontal: 20,
  },
  content: {
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  constrainedContent: {
    flex: 1,
    minHeight: 0,
  },
});
