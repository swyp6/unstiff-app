import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReanimatedAnimated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

// Figma 2211:14045 "피드백 완료 (토스트)".
const TOAST_ENTER_MS = 220;
const TOAST_HOLD_MS = 1500;
const TOAST_EXIT_MS = 190;

type MissionFeedbackToastProps = {
  // hold + exit가 끝난 뒤 부모에게 알려서 이 컴포넌트 자체를 트리에서
  // 걷어내게 한다 — record-complete.tsx의 토스트와 달리 이 토스트는 홈 화면
  // 안에서 별도 컴포넌트로 마운트/언마운트되므로, 스스로 사라졌다는 신호가
  // 없으면 부모의 "토스트 보이는 중" state가 그대로 남는다.
  onHide: () => void;
};

// record-complete.tsx에서 구현한 토스트와 같은 등장(fade in)→유지→소멸
// (fade out) lifecycle을 따르되, 그 화면 코드에 결합하지 않고 재사용 가능한
// 컴포넌트로 분리했다. 홈 화면 트리의 최상위 형제로 렌더돼야(레이아웃 흐름
// 밖) 나타나고 사라져도 홈 레이아웃이 전혀 움직이지 않는다.
export function MissionFeedbackToast({ onHide }: MissionFeedbackToastProps) {
  const insets = useSafeAreaInsets();
  const [isToastVisible, setIsToastVisible] = useState(true);

  useEffect(() => {
    const hideTimer = setTimeout(() => setIsToastVisible(false), TOAST_HOLD_MS);
    // exiting 애니메이션이 재생될 시간까지 준 뒤에야 부모에게 언마운트를
    // 요청한다 — 그 전에 onHide를 부르면 페이드아웃이 중간에 잘린다.
    const unmountTimer = setTimeout(
      () => onHide(),
      TOAST_HOLD_MS + TOAST_EXIT_MS,
    );
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(unmountTimer);
    };
    // onHide는 최초 마운트 시점 값만 캡처한다 — 부모 리렌더로 매번 새
    // 함수가 내려와도 타이머를 다시 잡지 않는다(record-complete.tsx의 같은
    // 패턴 참고).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isToastVisible) return null;

  return (
    <ReanimatedAnimated.View
      entering={FadeIn.duration(TOAST_ENTER_MS)}
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
          다음 미션에 반영할게요
        </ThemedText>
      </View>
    </ReanimatedAnimated.View>
  );
}
