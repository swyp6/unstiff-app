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

const CURRENT_LOCATION_TIMEOUT_MS = 10_000;
const LAST_KNOWN_LOCATION_MAX_AGE_MS = 3 * 60 * 1_000;
const LAST_KNOWN_LOCATION_REQUIRED_ACCURACY_M = 300;

export default function MapScreen() {
  const [status, setStatus] = useState<MapStatus>("loading");
  const [currentLocation, setCurrentLocation] =
    useState<CurrentLocation | null>(null);
  const [nativeErrorMessage, setNativeErrorMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;
    let locationTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const getCurrentPositionWithTimeout = async () => {
      try {
        return await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<never>((_, reject) => {
            locationTimeoutId = setTimeout(() => {
              reject(new Error("Current location request timed out"));
            }, CURRENT_LOCATION_TIMEOUT_MS);
          }),
        ]);
      } finally {
        if (locationTimeoutId !== undefined) {
          clearTimeout(locationTimeoutId);
          locationTimeoutId = undefined;
        }
      }
    };

    const loadMap = async () => {
      try {
        await KakaoMapModule.initialize();

        if (!isMounted) {
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

        let location: Location.LocationObject | null;

        try {
          location = await getCurrentPositionWithTimeout();
        } catch {
          location = await Location.getLastKnownPositionAsync({
            maxAge: LAST_KNOWN_LOCATION_MAX_AGE_MS,
            requiredAccuracy: LAST_KNOWN_LOCATION_REQUIRED_ACCURACY_M,
          });
        }

        if (!isMounted) {
          return;
        }

        if (!location) {
          setStatus("error");
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

      if (locationTimeoutId !== undefined) {
        clearTimeout(locationTimeoutId);
        locationTimeoutId = undefined;
      }
    };
  }, []);

  if (status === "ready" && currentLocation) {
    return (
      <KakaoMapView
        style={{ flex: 1 }}
        latitude={currentLocation.latitude}
        longitude={currentLocation.longitude}
        level={17}
        onError={({ nativeEvent }) => {
          setNativeErrorMessage(nativeEvent.message);
          setStatus("error");
        }}
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
                ? nativeErrorMessage || "현재 위치를 불러오지 못했습니다."
                : "현재 위치를 불러오는 중..."}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}
