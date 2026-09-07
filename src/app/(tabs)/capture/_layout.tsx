import { Stack } from "expo-router";

// 카메라 탭 내부 nested stack — index(카메라)에서 target(대상 선택,
// Figma 3642:42108)으로 넘어가는 동안에도 Native TabBar가 그대로 보이게
// 하기 위함이다(둘 다 root Stack의 fullScreenModal이 아니라 이 탭의
// 자식 route). record-editor/record-complete는 Figma에 탭바가 없어
// 여전히 root Stack의 fullScreenModal로 남아 있다(src/app/_layout.tsx).
export default function CaptureStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
