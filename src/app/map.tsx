import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import KakaoMapModule from "../../modules/kakao-map";

type InitializationStatus = "initializing" | "ready" | "error";

const statusMessage: Record<InitializationStatus, string> = {
  initializing: "지도 SDK 초기화 중...",
  ready: "지도 SDK 초기화 완료",
  error: "지도 SDK 초기화에 실패했습니다.",
};

export default function MapScreen() {
  const [initializationStatus, setInitializationStatus] =
    useState<InitializationStatus>("initializing");

  useEffect(() => {
    let isMounted = true;

    const initializeKakaoMap = async () => {
      try {
        const initialized = await KakaoMapModule.initialize();

        if (isMounted) {
          setInitializationStatus(initialized ? "ready" : "error");
        }
      } catch {
        if (isMounted) {
          setInitializationStatus("error");
        }
      }
    };

    void initializeKakaoMap();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: Spacing.four,
          gap: Spacing.six,
        }}
      >
        <ThemedText type="title">지도 화면</ThemedText>
        <ThemedText>{statusMessage[initializationStatus]}</ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}
