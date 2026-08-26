import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import KakaoMapModule, { KakaoMapView } from "../../modules/kakao-map";

type InitializationStatus = "initializing" | "ready" | "error";

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

  if (initializationStatus === "ready") {
    return (
      <KakaoMapView
        style={{ flex: 1 }}
        latitude={37.566691}
        longitude={126.978365}
        level={17}
      />
    );
  }

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
        <ThemedText>
          {initializationStatus === "error"
            ? "지도를 불러올 수 없습니다."
            : "지도 SDK 초기화 중..."}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}
