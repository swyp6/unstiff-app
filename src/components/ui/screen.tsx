import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";

type ScreenProps = PropsWithChildren<{
  // 기기의 노치/다이나믹 아일랜드(상단), 홈 인디케이터(하단) 영역만큼 안전하게
  // 띄워준다 — 화면마다 따로 SafeAreaView를 챙기지 않아도 되게 하는 공통 래퍼.
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, edges, style }: ScreenProps) {
  return (
    <ThemedView style={[{ flex: 1 }, style]}>
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}
