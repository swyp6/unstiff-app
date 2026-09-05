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

// Figma "1.9 기록 방식 모달" (node 2697:22772) — same centered-dialog Modal
// pattern as DeletePlanModal (transparent + fade, dim backdrop dismiss).
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
        <View style={styles.card}>
          <View style={styles.copy}>
            <ThemedText style={styles.title} typography="title-3-bold">
              {title}
            </ThemedText>
            <ThemedText style={styles.subtitle} typography="body-3-regular">
              오늘 운동을 어떻게 남길까요?
            </ThemedText>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onTakePhoto}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                style={styles.primaryButtonText}
                typography="body-2-bold"
              >
                사진 촬영
              </ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onPickFromLibrary}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                style={styles.secondaryButtonText}
                typography="body-3-bold"
              >
                앨범에서 선택
              </ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onSkipPhoto}
              style={({ pressed }) => [
                styles.tertiaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                style={styles.tertiaryButtonText}
                typography="caption-1-bold"
              >
                사진 없이 기록하기
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: {
    alignItems: "center",
    // Figma "Dim" layer: primitiveColors.charcoal["12"] (#171719) at 45% opacity.
    backgroundColor: "rgba(23, 23, 25, 0.45)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    borderRadius: 20,
    gap: 20,
    paddingBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 26,
    width: 300,
    zIndex: 1,
  },
  copy: {
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  title: {
    color: semanticColors["label-normal"],
    textAlign: "center",
  },
  subtitle: {
    color: semanticColors["label-subtle"],
    textAlign: "center",
  },
  actions: {
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: semanticColors["label-normal"],
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    width: "100%",
  },
  primaryButtonText: {
    color: semanticColors["label-inverse"],
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: semanticColors["line-strong"],
    borderRadius: 12,
    borderWidth: 1,
    height: 50,
    justifyContent: "center",
    width: "100%",
  },
  secondaryButtonText: {
    color: semanticColors["label-normal"],
  },
  tertiaryButton: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    paddingTop: 4,
    width: "100%",
  },
  tertiaryButtonText: {
    color: semanticColors["label-subtle"],
  },
  pressed: {
    opacity: 0.7,
  },
});
