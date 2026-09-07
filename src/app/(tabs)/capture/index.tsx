import CameraScreen from "../../camera";

// 탭바의 "카메라" 탭은 모달로 띄우지 않고 카메라 화면을 탭 콘텐츠로 직접 보여준다.
//
// focus에 따라 카메라를 껐다 켜는 lifecycle은 CameraScreen 내부의
// useIsFocused()/CameraView 게이팅 하나로만 처리한다(camera.tsx 참고,
// 원래 root `/camera`도 그 메커니즘 하나로 정상 동작해왔다). 여기서 또
// isFocused를 확인해 CameraScreen 자체를 마운트/언마운트하면 같은 focus
// 신호를 두 곳(이 화면 + CameraScreen 내부)이 각자 따로 구독하게 돼
// — 실제로 이 이중 게이팅이 하단 카메라 탭에서만 셔터가 먹통이 되는
// 회귀의 원인으로 지목됐다. CameraScreen은 다른 탭으로 이동하거나 같은
// 탭 안에서 ./target으로 넘어가 포커스를 잃으면 스스로 CameraView를
// 내리고 isCameraReady를 리셋하므로, 이 화면에서 따로 마운트/언마운트할
// 필요가 없다.
export default function CaptureTabScreen() {
  return <CameraScreen />;
}
