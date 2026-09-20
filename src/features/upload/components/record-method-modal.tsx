import { ConfirmModal } from "@/components/ui/confirm-modal";
import { primitiveColors } from "@/constants/tokens";

type RecordMethodModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickFromLibrary: () => void;
  onSkipPhoto: () => void;
};

// Figma "기록 방식 선택"(4305:35621) — 공통 ConfirmModal의 "모달(캡션)" 변형
// (4638:17007). 왼쪽 흰 pill이 카메라, 오른쪽 주황 pill이 앨범, 그 아래
// 캡션 링크가 "사진 없이 기록하기". 백드롭/뒤로가기는 카메라가 아니라
// onClose(체크 되돌리기)로 가야 해서 onDismiss를 따로 넘긴다.
export function RecordMethodModal({
  visible,
  title,
  onClose,
  onTakePhoto,
  onPickFromLibrary,
  onSkipPhoto,
}: RecordMethodModalProps) {
  return (
    <ConfirmModal
      cancelLabel="카메라"
      captionAction={{ label: "사진 없이 기록하기", onPress: onSkipPhoto }}
      confirmColor={primitiveColors.orange["500"]}
      confirmLabel="앨범"
      description="오늘 운동을 어떻게 남길까요?"
      onCancel={onTakePhoto}
      onConfirm={onPickFromLibrary}
      onDismiss={onClose}
      title={title}
      visible={visible}
    />
  );
}
