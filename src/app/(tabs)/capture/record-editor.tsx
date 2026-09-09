import { Stack } from "expo-router";

import { RecordEditorScreen } from "@/features/workout-record/components/record-editor-screen";

// 하단 카메라 탭에서 시작한 기록이 쓰는 라우트 — 이 탭의 nested Stack
// (capture/_layout.tsx) 안이라 Figma 4173:31231처럼 Native TabBar(카메라 활성)가
// 계속 보인다. 홈에서 시작한 흐름은 같은 화면을 root 라우트로 띄운다
// (src/app/record-editor.tsx).
//
// animation="none": target → 이 화면은 "사진은 그대로 두고 그 아래 내용만
// 바뀌는" 전환이라 화면 전체가 옆으로 미끄러지면 안 된다. 두 화면이 같은
// 위치·크기로 같은 사진을 렌더하므로 전환 애니메이션을 끄면 사진이 고정된
// 것처럼 보이고, 아래 콘텐츠만 각자의 fade/slide-up으로 교체된다. 이 옵션을
// capture/_layout.tsx에 선언하지 않는 이유는 그쪽 주석 참고.
export default function CaptureRecordEditorRoute() {
  return (
    <>
      <Stack.Screen options={{ animation: "none" }} />
      <RecordEditorScreen />
    </>
  );
}
