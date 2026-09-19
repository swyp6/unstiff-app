import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReanimatedAnimated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

// mission-feedback-toast.tsx와 같은 등장(fade in)→유지→소멸(fade out)
// lifecycle. 신고 완료 전용이라 문구를 공유하는 대신 같은 패턴으로 따로 둔다.
const TOAST_HOLD_MS = 1500;
const TOAST_EXIT_MS = 190;

export function AiContentReportToast({ onHide }: { onHide: () => void }) {
  const insets = useSafeAreaInsets();
  const [isToastVisible, setIsToastVisible] = useState(true);

  useEffect(() => {
    const hideTimer = setTimeout(() => setIsToastVisible(false), TOAST_HOLD_MS);
    const unmountTimer = setTimeout(
      () => onHide(),
      TOAST_HOLD_MS + TOAST_EXIT_MS,
    );
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(unmountTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isToastVisible) return null;

  return (
    <ReanimatedAnimated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(TOAST_EXIT_MS)}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: insets.bottom + 12,
        alignItems: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          height: 48,
          paddingLeft: 16,
          paddingRight: 20,
          borderRadius: 999,
          backgroundColor: semanticColors["label-normal"],
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.24,
          shadowRadius: 20,
          elevation: 6,
        }}
      >
        <Ionicons
          color={semanticColors["label-inverse"]}
          name="checkmark-circle"
          size={20}
        />
        <ThemedText
          accessibilityLiveRegion="polite"
          typography="body-3-bold"
          style={{ color: semanticColors["label-inverse"] }}
        >
          신고가 접수되었어요
        </ThemedText>
      </View>
    </ReanimatedAnimated.View>
  );
}
