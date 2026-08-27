import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import KakaoMapModule, { KakaoMapView } from "../../modules/kakao-map";

type MapStatus =
  "loading" | "ready" | "permission-denied" | "services-disabled" | "error";

type CurrentLocation = {
  latitude: number;
  longitude: number;
};

export default function MapScreen() {
  const [status, setStatus] = useState<MapStatus>("loading");
  const [currentLocation, setCurrentLocation] =
    useState<CurrentLocation | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadMap = async () => {
      try {
        const initialized = await KakaoMapModule.initialize();

        if (!isMounted) {
          return;
        }

        if (!initialized) {
          setStatus("error");
          return;
        }

        const permission = await Location.getForegroundPermissionsAsync();

        if (!isMounted) {
          return;
        }

        const finalPermission =
          permission.status === Location.PermissionStatus.GRANTED
            ? permission
            : await Location.requestForegroundPermissionsAsync();

        if (!isMounted) {
          return;
        }

        if (finalPermission.status !== Location.PermissionStatus.GRANTED) {
          setStatus("permission-denied");
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();

        if (!isMounted) {
          return;
        }

        if (!servicesEnabled) {
          setStatus("services-disabled");
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!isMounted) {
          return;
        }

        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setStatus("ready");
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    };

    void loadMap();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === "ready" && currentLocation) {
    return (
      <KakaoMapView
        style={{ flex: 1 }}
        latitude={currentLocation.latitude}
        longitude={currentLocation.longitude}
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
          {status === "permission-denied"
            ? "현재 위치를 사용하려면 위치 권한이 필요합니다."
            : status === "services-disabled"
              ? "위치 서비스를 켜주세요."
              : status === "error"
                ? "현재 위치를 불러오지 못했습니다."
                : "현재 위치를 불러오는 중..."}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}
