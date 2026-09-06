import { Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

type RecordMethodModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickFromLibrary: () => void;
  onSkipPhoto: () => void;
};

// DeletePlanModal(features/workout-plan/components/delete-plan-modal.tsx)과
// 같은 dialog 프레임(디밍/배경/버튼 구조)을 그대로 따른다 — Pressable이 직접
// 스타일을 갖는 대신 pointerEvents="none" View를 감싸는 패턴까지 동일하게
// 맞춰서 두 모달의 스타일이 갈라지지 않게 한다.
export function RecordMethodModal({
  visible,
  title,
  onClose,
  onTakePhoto,
  onPickFromLibrary,
  onSkipPhoto,
}: RecordMethodModalProps) {
  if (!visible) return null;

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <SafeAreaView style={styles.dim}>
        <Pressable
          accessibilityLabel="닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.dialog}>
          <View style={styles.copy}>
            <ThemedText style={styles.center} typography="title-3-bold">
              {title}
            </ThemedText>
            <ThemedText
              style={[styles.center, styles.description]}
              typography="body-3-regular"
            >
              오늘 운동을 어떻게 남길까요?
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onTakePhoto}
            style={styles.buttonPressable}
          >
            {({ pressed }) => (
              <View
                pointerEvents="none"
                style={[styles.primaryButton, pressed && styles.pressed]}
              >
                <ThemedText style={styles.primaryText} typography="body-2-bold">
                  사진 촬영
                </ThemedText>
              </View>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onPickFromLibrary}
            style={[styles.buttonPressable, styles.secondaryPressable]}
          >
            {({ pressed }) => (
              <View
                pointerEvents="none"
                style={[styles.secondaryButton, pressed && styles.pressed]}
              >
                <ThemedText typography="body-3-bold">앨범에서 선택</ThemedText>
              </View>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onSkipPhoto}
            style={styles.tertiaryPressable}
          >
            {({ pressed }) => (
              <View pointerEvents="none" style={pressed && styles.pressed}>
                <ThemedText
                  style={[styles.center, styles.skipText]}
                  typography="caption-1-bold"
                >
                  사진 없이 기록하기
                </ThemedText>
              </View>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
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
  secondaryPressable: {
    marginTop: 8,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: semanticColors["label-normal"],
    borderRadius: 16,
    height: 50,
    justifyContent: "center",
  },
  primaryText: {
    color: semanticColors["label-inverse"],
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: semanticColors["line-normal"],
    borderRadius: 16,
    borderWidth: 1,
    height: 50,
    justifyContent: "center",
  },
  tertiaryPressable: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingVertical: 4,
    width: "100%",
  },
  skipText: {
    color: semanticColors["label-subtle"],
  },
  pressed: {
    opacity: 0.7,
  },
});
