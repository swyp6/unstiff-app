import { Modal, Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

// RecordActionsMenu(components/ui)와 같은 Modal + 절대 위치 카드 뼈대지만,
// 그 메뉴는 헤더에 고정된 한 자리(topOffset)만 있는 반면 이건 채팅 목록이나
// 미션 카드 등 여러 화면 어디서든 뜰 수 있어 누른 지점(top)을 그때그때
// 받는다. 항목이 "AI 콘텐츠 신고" 하나뿐이라 RecordActionsMenu의 MenuRow
// 목록 구조까지는 가져오지 않는다.
export function AiContentReportMenu({
  visible,
  top,
  onClose,
  onSelectReport,
}: {
  visible: boolean;
  top: number;
  onClose: () => void;
  onSelectReport: () => void;
}) {
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
            top,
            right: 20,
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
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClose();
              onSelectReport();
            }}
            style={{ paddingHorizontal: 16, paddingVertical: 12 }}
          >
            <ThemedText typography="body-3-medium">AI 콘텐츠 신고</ThemedText>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
