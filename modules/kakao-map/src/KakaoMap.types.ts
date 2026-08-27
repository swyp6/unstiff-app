import type { ViewProps } from "react-native";

export type KakaoMapErrorEvent = {
  code: number;
  message: string;
};

export type KakaoMapViewProps = ViewProps & {
  latitude: number;
  longitude: number;
  level?: number;
  onError?: (event: { nativeEvent: KakaoMapErrorEvent }) => void;
};
