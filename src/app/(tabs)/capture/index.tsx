import { SystemCameraCapture } from "@/features/camera/system-camera-capture";

// 탭바의 "카메라" 탭 — 앱 안에 카메라 프리뷰를 그리지 않고 OS 기본 카메라를
// 띄운다. 자동 실행/재진입 정책과 촬영 이후 흐름(업로드 → capture/target)은
// SystemCameraCapture 참고.
export default function CaptureTabScreen() {
  return <SystemCameraCapture />;
}
