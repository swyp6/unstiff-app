// KakaoMap has no native Android implementation yet (see
// modules/kakao-map/expo-module.config.json — platforms: ["ios"]). Without
// this stub, requireNativeModule("KakaoMap") throws at *import* time
// (module evaluation), crashing the whole app on Android startup rather
// than just the map screen — expo-router eagerly imports every route,
// including src/app/map.tsx, to build its typed-route manifest.
// src/app/map.tsx already treats a thrown initialize() as a normal
// "error" state and shows a message instead of the map.
class UnsupportedKakaoMapModule {
  async initialize(): Promise<void> {
    throw new Error("KakaoMap is not supported on Android yet.");
  }
}

export default new UnsupportedKakaoMapModule();
