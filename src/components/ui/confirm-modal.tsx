import { Modal, Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";

// 제목+설명+취소/확인 pill 버튼 두 개짜리 확인 모달 — 스톱워치 종료, 기록
// 리셋, 사진 삭제 등 문구만 다르고 생김새는 같은 확인 다이얼로그들의 공통
// 버전. delete-plan-modal.tsx처럼 세로로 쌓인 전체폭 버튼 스타일은 별개의
// 디자인이라 이 컴포넌트로 통합하지 않았다.
export function ConfirmModal({
  visible,
  title,
  description,
  cancelLabel,
  confirmLabel,
  confirmColor,
  onCancel,
  onConfirm,
  // 기록 리셋/사진 삭제처럼 확인(파괴적 동작) 버튼이 왼쪽에 와야 하는 경우 true.
  swapButtons = false,
}: {
  visible: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmColor: string;
  onCancel: () => void;
  onConfirm: () => void;
  swapButtons?: boolean;
}) {
  if (!visible) return null;

  const cancelButton = (
    <Pressable
      accessibilityRole="button"
      className="h-[50px] w-[125px] items-center justify-center rounded-full border border-charcoal-3 bg-white"
      key="cancel"
      onPress={onCancel}
    >
      <ThemedText
        style={{ color: primitiveColors.charcoal[11] }}
        typography="body-2-bold"
      >
        {cancelLabel}
      </ThemedText>
    </Pressable>
  );
  const confirmButton = (
    <Pressable
      accessibilityRole="button"
      className="h-[50px] w-[125px] items-center justify-center rounded-full"
      key="confirm"
      onPress={onConfirm}
      style={{ backgroundColor: confirmColor }}
    >
      <ThemedText
        style={{ color: semanticColors["label-inverse"] }}
        typography="body-2-bold"
      >
        {confirmLabel}
      </ThemedText>
    </Pressable>
  );
  const buttons = swapButtons
    ? [confirmButton, cancelButton]
    : [cancelButton, confirmButton];

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible>
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: "rgba(23, 23, 25, 0.45)" }}
      >
        <Pressable
          accessibilityLabel="닫기"
          accessibilityRole="button"
          className="absolute inset-0"
          onPress={onCancel}
        />
        <View className="w-[300px] items-center gap-5 rounded-[20px] bg-white px-5 pb-[18px] pt-[26px]">
          <View className="items-center gap-2">
            <ThemedText
              style={{
                color: primitiveColors.charcoal[11],
                textAlign: "center",
              }}
              typography="title-3-bold"
            >
              {title}
            </ThemedText>
            <ThemedText
              style={{
                color: primitiveColors.charcoal[5],
                textAlign: "center",
              }}
              typography="caption-1-regular"
            >
              {description}
            </ThemedText>
          </View>
          <View className="flex-row gap-2.5">{buttons}</View>
        </View>
      </View>
    </Modal>
  );
}
