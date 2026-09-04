import { Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

type DeletePlanModalProps = {
  visible: boolean;
  embedded?: boolean;
  onCancel: () => void;
  onDelete: () => void;
};

export function DeletePlanModal({
  visible,
  embedded = false,
  onCancel,
  onDelete,
}: DeletePlanModalProps) {
  if (!visible) return null;

  const dialogLayer = (
    <SafeAreaView style={[styles.dim, embedded && styles.embeddedLayer]}>
      <Pressable
        accessibilityLabel="삭제 확인 닫기"
        accessibilityRole="button"
        onPress={onCancel}
        style={styles.backdrop}
      />
      <View style={styles.dialog}>
        <View style={styles.copy}>
          <ThemedText style={styles.center} typography="title-3-bold">
            이 계획을 삭제할까요?
          </ThemedText>
          <ThemedText
            style={[styles.center, styles.description]}
            typography="body-3-regular"
          >
            이미 남긴 기록은 그대로 남아요
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onDelete}
          style={styles.buttonPressable}
        >
          {({ pressed }) => (
            <View
              pointerEvents="none"
              style={[styles.deleteButton, pressed && styles.pressed]}
            >
              <ThemedText style={styles.deleteText} typography="body-2-bold">
                계획 삭제
              </ThemedText>
            </View>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={[styles.buttonPressable, styles.cancelPressable]}
        >
          {({ pressed }) => (
            <View
              pointerEvents="none"
              style={[styles.cancelButton, pressed && styles.pressed]}
            >
              <ThemedText typography="body-3-bold">취소</ThemedText>
            </View>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );

  if (embedded) return dialogLayer;

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible>
      {dialogLayer}
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  embeddedLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialog: {
    backgroundColor: semanticColors["background-normal"],
    borderRadius: 24,
    maxWidth: 340,
    padding: 24,
    width: "100%",
    zIndex: 1,
  },
  copy: {
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  center: {
    textAlign: "center",
  },
  description: {
    color: semanticColors["label-subtle"],
  },
  buttonPressable: {
    height: 50,
    width: "100%",
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: semanticColors["label-normal"],
    borderRadius: 16,
    justifyContent: "center",
    height: 50,
  },
  deleteText: {
    color: semanticColors["label-inverse"],
  },
  cancelButton: {
    alignItems: "center",
    borderColor: semanticColors["line-normal"],
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    height: 50,
  },
  cancelPressable: {
    marginTop: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});
