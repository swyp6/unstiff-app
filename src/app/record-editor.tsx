import { RecordEditorScreen } from "@/features/workout-record/components/record-editor-screen";

// 홈에서 시작한 기록(대상이 이미 정해진 contextual 흐름)이 쓰는 root 라우트 —
// root Stack의 fullScreenModal이라 하단 TabBar가 보이지 않는다. 하단 카메라
// 탭에서 시작한 흐름은 같은 화면을 그 탭의 nested route로 띄운다
// (src/app/(tabs)/capture/record-editor.tsx).
export default function RecordEditorRoute() {
  return <RecordEditorScreen />;
}
