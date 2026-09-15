import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

function MenuRow({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className="flex-row items-center gap-2 px-4 py-3"
      disabled={disabled}
      onPress={onPress}
      style={disabled && { opacity: 0.4 }}
    >
      <Ionicons color={semanticColors["label-normal"]} name={icon} size={18} />
      <ThemedText typography="body-3-medium">{label}</ThemedText>
    </Pressable>
  );
}

type RecordActionsMenuProps = {
  visible: boolean;
  onClose: () => void;
  // 헤더 바로 아래 드는 위치 — day-record/record-complete 둘 다 헤더 높이가
  // 같아 insets.top + 52로 같이 쓴다.
  topOffset: number;
  isPhotoActionPending: boolean;
  hasPhoto: boolean;
  onSavePhoto: () => void;
  onChangePhoto: () => void;
  onEditRecord: () => void;
  onDeletePhoto: () => void;
};

// day-record.tsx("운동 기록")와 record-complete.tsx("완료 -> 홈으로")가
// 같은 점세개 메뉴(사진 저장/변경/기록 수정/사진 삭제)를 쓴다 — 각 액션은
// 누르면 먼저 메뉴부터 닫고 호출된다.
export function RecordActionsMenu({
  visible,
  onClose,
  topOffset,
  isPhotoActionPending,
  hasPhoto,
  onSavePhoto,
  onChangePhoto,
  onEditRecord,
  onDeletePhoto,
}: RecordActionsMenuProps) {
  function runAndClose(action: () => void) {
    onClose();
    action();
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="메뉴 닫기"
        accessibilityRole="button"
        onPress={onClose}
        style={{ flex: 1 }}
      >
        <View
          style={{
            position: "absolute",
            top: topOffset,
            right: 12,
            width: 168,
            borderRadius: 16,
            paddingVertical: 4,
            backgroundColor: semanticColors["background-normal"],
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <MenuRow
            disabled={isPhotoActionPending || !hasPhoto}
            icon="download-outline"
            label="사진 저장"
            onPress={() => runAndClose(onSavePhoto)}
          />
          <MenuRow
            disabled={isPhotoActionPending}
            icon="swap-horizontal-outline"
            label="사진 변경"
            onPress={() => runAndClose(onChangePhoto)}
          />
          <MenuRow
            disabled={isPhotoActionPending}
            icon="create-outline"
            label="기록 수정"
            onPress={() => runAndClose(onEditRecord)}
          />
          <MenuRow
            disabled={isPhotoActionPending || !hasPhoto}
            icon="trash-outline"
            label="사진 삭제"
            onPress={() => runAndClose(onDeletePhoto)}
          />
        </View>
      </Pressable>
    </Modal>
  );
}
