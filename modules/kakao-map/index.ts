// Re-export the native module. On web, it will be resolved to KakaoMapModule.web.ts
// and on native platforms to KakaoMapModule.ts
export { default } from "./src/KakaoMapModule";
export { default as KakaoMapView } from "./src/KakaoMapView";
export type { KakaoMapViewProps } from "./src/KakaoMapView";
export * from "./src/KakaoMap.types";
