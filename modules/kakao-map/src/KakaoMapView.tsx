import { requireNativeViewManager } from "expo-modules-core";
import type { ComponentType } from "react";
import type { ViewProps } from "react-native";

export type KakaoMapViewProps = ViewProps;

const NativeKakaoMapView: ComponentType<KakaoMapViewProps> =
  requireNativeViewManager("KakaoMap");

export default function KakaoMapView(props: KakaoMapViewProps) {
  return <NativeKakaoMapView {...props} />;
}
