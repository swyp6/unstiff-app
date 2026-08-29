import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";

type LogoutConfirmDialogProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const BACKDROP_COLOR = "rgba(0, 0, 0, 0.5)";

export function LogoutConfirmDialog({
  visible,
  onCancel,
  onConfirm,
}: LogoutConfirmDialogProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        importantForAccessibility="yes"
        style={styles.backdrop}
      >
        <View style={styles.dialog}>
          <ThemedText style={styles.title} typography="heading-1-bold">
            로그아웃할까요?
          </ThemedText>
          <ThemedText style={styles.body} typography="body-3-regular">
            다시 이용하려면 계정 로그인이 필요해요.
          </ThemedText>
          <View style={styles.buttonGroup}>
            <Pressable
              accessibilityLabel="취소"
              accessibilityRole="button"
              onPress={onCancel}
              style={[styles.button, styles.cancelButton]}
            >
              <ThemedText
                style={styles.cancelButtonText}
                typography="body-1-medium"
              >
                취소
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityLabel="로그아웃"
              accessibilityRole="button"
              onPress={onConfirm}
              style={[styles.button, styles.logoutButton]}
            >
              <ThemedText
                style={styles.logoutButtonText}
                typography="body-1-medium"
              >
                로그아웃
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: BACKDROP_COLOR,
    flex: 1,
    justifyContent: "center",
  },
  dialog: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    borderRadius: 16,
    gap: 8,
    height: 166,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
    width: 300,
  },
  title: {
    color: semanticColors["label-normal"],
    textAlign: "center",
    width: "100%",
  },
  body: {
    color: semanticColors["label-subtle"],
    textAlign: "center",
    width: "100%",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 8,
    height: 68,
    paddingTop: 16,
    width: "100%",
  },
  button: {
    alignItems: "center",
    borderRadius: radius.default,
    flex: 1,
    height: 52,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  cancelButton: {
    backgroundColor: semanticColors["fill-normal"],
  },
  logoutButton: {
    backgroundColor: semanticColors["status-negative-normal"],
  },
  cancelButtonText: {
    color: semanticColors["label-normal"],
  },
  logoutButtonText: {
    color: semanticColors["label-inverse"],
  },
});
