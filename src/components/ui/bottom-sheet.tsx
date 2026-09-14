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
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  type Edge,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  title?: string;
  fullHeight?: boolean;
  fixedHeightRatio?: number;
  embedded?: boolean;
  expanded?: boolean;
  initialHeightRatio?: number;
  // "펼침" 스와이프가 도달하는 높이 비율 — 생략하면 기존처럼 fullSheetHeight
  // (거의 화면 전체)까지 펼쳐진다. 값을 주면 그 비율까지만 펼쳐지고, 화면
  // 맨 위까지는 올라가지 않는다.
  expandedHeightRatio?: number;
  overlay?: ReactNode;
  // 시트 안의 KeyboardAvoidingView가 이 fullHeight 시트(Modal + 애니메이션
  // transform 중첩) 구조에서는 신뢰할 수 없어서(계산이 안 먹거나 스크롤
  // 가능 범위를 예측 못 하게 줄여버림), 직접 키보드 높이를 추적해 처리하는
  // 호출부는 이 값을 false로 줘서 끌 수 있게 한다.
  keyboardAvoiding?: boolean;
  // "inline"으로 임베드해 화면의 콘텐츠 영역(=탭바 위)에서만 겹쳐 그릴 때는
  // 시트 아래가 기기 바닥이 아니라 이미 safe-area를 지키는 Native TabBar라,
  // bottom 여백을 또 더하면 빈 공간이 생긴다 — 그런 호출부는 []를 넘긴다.
  safeAreaEdges?: Edge[];
  onClose: () => void;
  onExpanded?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
}>;

// Lets a parent (e.g. a delete confirmation) trigger the same slide-down
// animation used for every other close path, instead of unmounting the
// sheet immediately — `afterClose` runs once the animation finishes.
export type BottomSheetHandle = {
  close: (afterClose?: () => void) => void;
};

export const BottomSheet = forwardRef<BottomSheetHandle, BottomSheetProps>(
  function BottomSheet(
    {
      visible,
      title,
      fullHeight = false,
      fixedHeightRatio,
      embedded = false,
      expanded = false,
      initialHeightRatio = 1,
      expandedHeightRatio,
      overlay,
      keyboardAvoiding = true,
      safeAreaEdges = ["bottom"],
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
    const expandedTranslateY =
      fullHeight && expandedHeightRatio != null
        ? Math.max(0, fullSheetHeight - windowHeight * expandedHeightRatio)
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
        expanded ? expandedTranslateY : collapsedTranslateY,
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
      expandedTranslateY,
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
        expanded ? expandedTranslateY : collapsedTranslateY,
        nextSnapPoint,
        expanded ? onExpanded : undefined,
      );
    }, [
      animateTo,
      collapsedTranslateY,
      expanded,
      expandedTranslateY,
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
            Math.min(
              windowHeight,
              dragStartTranslateY.current + gestureState.dy,
            ),
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
              animateTo(expandedTranslateY, "expanded", onExpanded);
            }
            return;
          }

          if (gestureState.dy > 110 || gestureState.vy > 1) {
            closeSheet();
          } else if (gestureState.dy < -60 || gestureState.vy < -0.65) {
            animateTo(expandedTranslateY, "expanded", onExpanded);
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

        animateTo(expandedTranslateY, "expanded");
      },
      [
        animateTo,
        closeSheet,
        collapsedTranslateY,
        expandedTranslateY,
        fullHeight,
        onExpanded,
        onExpandedChange,
      ],
    );
    const cancelDrag = useCallback(() => {
      const isExpanded = snapPoint.current === "expanded";
      animateTo(
        isExpanded ? expandedTranslateY : collapsedTranslateY,
        snapPoint.current,
      );
    }, [animateTo, collapsedTranslateY, expandedTranslateY]);
    const panResponder = useMemo(
      () =>
        // PanResponder stores callbacks; refs are read only after a gesture begins.
        PanResponder.create({
          // RN Modal 안에서는 이걸 안 주면 onMoveShouldSetPanResponder 자체가
          // 아예 호출 안 되는 오래된 RN 버그가 있다(facebook/react-native#14295).
          onStartShouldSetPanResponder: () => false,
          onMoveShouldSetPanResponder: shouldStartDrag,
          onPanResponderGrant: startDrag,
          onPanResponderMove: moveDrag,
          onPanResponderRelease: releaseDrag,
          onPanResponderTerminate: cancelDrag,
          onPanResponderTerminationRequest: () => false,
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
            behavior={
              keyboardAvoiding && Platform.OS === "ios" ? "padding" : undefined
            }
            style={hasConstrainedHeight ? styles.flex : undefined}
          >
            <SafeAreaView
              edges={safeAreaEdges}
              style={hasConstrainedHeight ? styles.flex : undefined}
            >
              {/* 손잡이(20px)만 잡히면 너무 좁아서 놓치기 쉬우니, 그 아래
                  제목 줄까지 한 덩어리로 드래그 영역을 넓힌다. */}
              <View {...panResponder.panHandlers}>
                {/* RN Modal 안에서는 PanResponder가 responder를 제대로 못
                    가져가는 오래된 버그가 있다(facebook/react-native#14295) —
                    TouchableWithoutFeedback으로 한 번 감싸는 게 커뮤니티에서
                    확인된 우회법이다. */}
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View>
                    <View style={styles.dragArea}>
                      <View style={styles.handle} />
                    </View>
                    {title && (
                      <View style={styles.header}>
                        <ThemedText typography="title-3-bold">
                          {title}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </TouchableWithoutFeedback>
              </View>
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
        {/* RN Modal은 별도 네이티브 윈도우라 루트의 GestureHandlerRootView
            (_layout.tsx) 밖에 있다 — 이게 없으면 이 안의 PanResponder 드래그가
            터치를 아예 못 받는다(실기기·시뮬레이터에서 실측 확인). */}
        <GestureHandlerRootView style={styles.flex}>
          {sheetLayer}
        </GestureHandlerRootView>
      </Modal>
    );
  },
);

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
