import { Stack } from "expo-router";

// 카메라 탭 내부 nested stack — index(카메라)에서 target(대상 선택,
// Figma 3642:42108)으로 넘어가는 동안에도 Native TabBar가 그대로 보이게
// 하기 위함이다(둘 다 root Stack의 fullScreenModal이 아니라 이 탭의
// 자식 route). record-editor/record-complete는 Figma에 탭바가 없어
// 여전히 root Stack의 fullScreenModal로 남아 있다(src/app/_layout.tsx).
// 여기에 <Stack.Screen>을 선언하지 않는다 — expo-router의 getSortedChildren은
// 명시 선언한 화면을 목록 맨 앞에 놓아 그게 이 Stack의 초기 라우트가 돼버린다
// (record-editor만 선언했더니 카메라 탭 진입 시 index 대신 그 화면이 떠서
// 카메라가 아예 열리지 않았다). 화면별 옵션은 각 라우트 파일에서
// <Stack.Screen options={...} />로 지정한다.
export default function CaptureStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
