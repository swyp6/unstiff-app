import CameraScreen from "../camera";

// 탭바의 "카메라" 탭은 모달로 띄우지 않고 카메라 화면을 탭 콘텐츠로 직접 보여준다.
// 촬영 후 운동/미션과 연결하는 화면(촬영결과기입)은 별도 작업에서 이어서 구현한다.
export default function CaptureTabScreen() {
  return <CameraScreen />;
}
