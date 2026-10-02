import { router } from "expo-router";

import { uploadPickedImage } from "@/features/upload/upload-image";

import { useRecordFlowStore } from "./record-flow-store";
import type { WorkoutRefType } from "./types";

// 기록용으로 확정된 로컬 사진 — 사진을 어디서 얻었든(시스템 카메라, 앨범
// 확인 화면) 업로드에는 이 세 값만 필요하다.
export type RecordPhotoFile = {
  uri: string;
  width: number;
  height: number;
};

export type LinkedRecordRef = {
  refType: WorkoutRefType;
  refId: number;
};

type SubmitRecordPhotoOptions = {
  // 있으면(PLAN/MISSION에서 진입) 대상 선택을 건너뛰고 바로 기록 입력
  // (record-editor)으로, 없으면(하단 카메라 탭) 대상 선택(capture/target)으로.
  linkedTarget: LinkedRecordRef | null;
  title?: string;
  // 업로드가 끝난 시점에 호출한다. false면 업로드 결과로 store를 건드리거나
  // 다음 화면으로 넘기지 않는다 — 그 사이 사용자가 화면을 떠났다면 이미 새
  // 기록을 시작했을 수 있고(store에 새 photo/target), 예상 밖의 화면 전환이
  // 생기기 때문이다.
  shouldContinue?: () => boolean;
};

// 사진이 확정된 뒤의 공통 흐름: Cloudinary 업로드 → record-flow-store →
// 다음 화면. 업로드 실패는 그대로 throw하므로 호출부가 자기 화면의 오류
// UI로 처리한다. 다음 화면으로 넘어갔으면 true.
export async function submitRecordPhoto(
  photo: RecordPhotoFile,
  { linkedTarget, title, shouldContinue }: SubmitRecordPhotoOptions,
): Promise<boolean> {
  const secureUrl = await uploadPickedImage(
    photo.uri,
    photo.width,
    photo.height,
    "DAILY_PHOTO",
  );

  if (shouldContinue && !shouldContinue()) return false;

  useRecordFlowStore.getState().setPhoto({ secureUrl });

  if (linkedTarget) {
    // 홈이 사진을 얻기 전에(촬영/앨범 선택 확정 시점) 이미 PLAN 목표값
    // (initialGoalTypes/initialGoalValues)까지 포함한 full target을 store에
    // 심어둔다 — 지금 대상(refType/refId)과 정확히 같은 대상이면 그 target을
    // 그대로 두고 덮어쓰지 않는다. 여기서 무조건 refType/refId만으로 새
    // target을 만들면 그 초기 목표값이 사라진다. store에 남아있는 target이
    // 다른 PLAN/MISSION의 것이거나(예: 이전 기록을 하다 만 상태) 아예
    // 없으면(딥링크로 곧장 들어온 경우 등) 재사용하지 않고 최소 target으로
    // 새로 만든다 — stale target을 현재 사진에 잘못 연결하지 않기 위함이다.
    const existingTarget = useRecordFlowStore.getState().target;
    const hasMatchingExistingTarget =
      existingTarget?.mode === "LINKED" &&
      existingTarget.refType === linkedTarget.refType &&
      existingTarget.refId === linkedTarget.refId;

    if (!hasMatchingExistingTarget) {
      useRecordFlowStore.getState().setTarget({
        mode: "LINKED",
        refType: linkedTarget.refType,
        refId: linkedTarget.refId,
        title: title ?? "",
      });
    }
    router.push("/record-editor");
  } else {
    // 하단 카메라 탭에서 시작한 경우 — 대상 선택 화면은 그 탭의 nested
    // route(capture/target)라 Native TabBar가 계속 보인다.
    router.push("/capture/target");
  }
  return true;
}
