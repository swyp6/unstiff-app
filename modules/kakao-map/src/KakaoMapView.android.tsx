import type { KakaoMapViewProps } from "./KakaoMap.types";

// See KakaoMapModule.android.ts — no native Android implementation exists
// yet. src/app/map.tsx never reaches a "ready" state on Android (since
// KakaoMapModule.initialize() always rejects there), so this component
// should never actually render; it exists only so importing it doesn't
// crash the app at module-load time the way requireNativeViewManager would.
export default function KakaoMapView(_props: KakaoMapViewProps) {
  return null;
}
