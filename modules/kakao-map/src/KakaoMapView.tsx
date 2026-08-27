import { requireNativeViewManager } from "expo-modules-core";
import type { ComponentType } from "react";

import type { KakaoMapViewProps } from "./KakaoMap.types";

const NativeKakaoMapView: ComponentType<KakaoMapViewProps> =
  requireNativeViewManager("KakaoMap");

export default function KakaoMapView(props: KakaoMapViewProps) {
  return <NativeKakaoMapView {...props} />;
}
