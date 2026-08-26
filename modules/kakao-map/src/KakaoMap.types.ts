import type { ViewProps } from "react-native";

export type KakaoMapViewProps = ViewProps & {
  latitude: number;
  longitude: number;
  level?: number;
};
