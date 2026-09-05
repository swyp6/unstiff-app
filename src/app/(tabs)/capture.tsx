import { useIsFocused } from "expo-router";
import { View } from "react-native";

import CameraScreen from "../camera";

// 탭바의 "카메라" 탭은 모달로 띄우지 않고 카메라 화면을 탭 콘텐츠로 직접 보여준다.
// 촬영 후 운동/미션과 연결하는 화면(촬영결과기입)은 별도 작업에서 이어서 구현한다.
//
// NativeTabs는 포커스 여부와 관계없이 모든 탭의 콘텐츠를 계속 마운트해 두므로,
// 여기서 focus 상태에 따라 CameraView를 직접 마운트/언마운트해 다른 탭에
// 있을 때 카메라가 계속 켜져 있지 않도록 한다.
export default function CaptureTabScreen() {
  const isFocused = useIsFocused();

  if (!isFocused) return <View className="flex-1 bg-background-normal" />;

  return <CameraScreen />;
}
