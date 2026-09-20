import { Modal, Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import { cn } from "@/lib/utils";

// 제목+설명+취소/확인 pill 버튼 두 개짜리 확인 모달 — 스톱워치 종료, 기록
// 리셋, 사진 삭제 등 문구만 다르고 생김새는 같은 확인 다이얼로그들의 공통
// 버전. delete-plan-modal.tsx처럼 세로로 쌓인 전체폭 버튼 스타일은 별개의
// 디자인이라 이 컴포넌트로 통합하지 않았다.
//
// Figma 컴포넌트 "모달"(300 고정, radius 20, padding 26/20/18)과 그 변형
// "모달(캡션)"(버튼 아래 보조 링크 한 줄, padding bottom 14)을 모두 그린다 —
// captionAction을 넘기면 캡션 변형이 된다(RecordMethodModal 참고).
export function ConfirmModal({
  visible,
  title,
  description,
  cancelLabel,
  confirmLabel,
  confirmColor,
  onCancel,
  onConfirm,
  // 백드롭 탭·Android 뒤로가기로 닫을 때 호출. 기본은 onCancel — 왼쪽 버튼이
  // "취소"가 아니라 별개 동작(카메라 등)인 모달만 따로 넘긴다.
  onDismiss,
  // 기록 리셋/사진 삭제처럼 확인(파괴적 동작) 버튼이 왼쪽에 와야 하는 경우 true.
  swapButtons = false,
  // 버튼 두 개 아래에 놓이는 보조 액션(Figma "모달(캡션)" 변형) — 예: "사진 없이
  // 기록하기". 260x36 영역 안에 caption-1-bold charcoal/5로 그린다.
  captionAction,
}: {
  visible: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmColor: string;
  onCancel: () => void;
  onConfirm: () => void;
  onDismiss?: () => void;
  swapButtons?: boolean;
  captionAction?: { label: string; onPress: () => void };
}) {
  if (!visible) return null;

  const handleDismiss = onDismiss ?? onCancel;

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
    <Modal
      animationType="fade"
      // Android: 둘 다 켜야 dim(surface/dim)이 status bar·navigation bar 뒤까지
      // 이어진다 — Figma는 화면 전체를 덮는다. WorkoutLimitModal과 같은 설정.
      navigationBarTranslucent
      onRequestClose={handleDismiss}
      statusBarTranslucent
      transparent
      visible
    >
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: "rgba(23, 23, 25, 0.45)" }}
      >
        <Pressable
          accessibilityLabel="닫기"
          accessibilityRole="button"
          className="absolute inset-0"
          onPress={handleDismiss}
        />
        <View
          className={cn(
            "w-[300px] items-center gap-5 rounded-[20px] bg-white px-5 pt-[26px]",
            captionAction ? "pb-[14px]" : "pb-[18px]",
          )}
        >
          {/* w-full(=260) — 긴 제목이 카드 안에서 줄바꿈되게 한다. */}
          <View className="w-full items-center gap-2">
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
          <View className="w-full items-center">
            <View className="flex-row gap-2.5">{buttons}</View>
            {captionAction && (
              <Pressable
                accessibilityRole="button"
                className="h-[36px] w-full items-center justify-center"
                onPress={captionAction.onPress}
              >
                <ThemedText
                  style={{
                    color: primitiveColors.charcoal[5],
                    textAlign: "center",
                  }}
                  typography="caption-1-bold"
                >
                  {captionAction.label}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
