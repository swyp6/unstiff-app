import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";
import { AVATAR_OPTIONS } from "@/features/mypage/avatar-options";
import { AvatarSwatch } from "@/features/mypage/components/avatar-swatch";

type AvatarPickerSheetProps = {
  visible: boolean;
  selectedId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
};

export function AvatarPickerSheet({
  visible,
  selectedId,
  onClose,
  onSelect,
}: AvatarPickerSheetProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="닫기"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}
      />

      {/* Remounted each time the sheet opens so preview state always
          starts from the currently saved avatar. */}
      {visible && (
        <AvatarPickerSheetContent
          initialSelectedId={selectedId}
          onClose={onClose}
          onSelect={onSelect}
        />
      )}
    </Modal>
  );
}

type AvatarPickerSheetContentProps = {
  initialSelectedId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
};

function AvatarPickerSheetContent({
  initialSelectedId,
  onClose,
  onSelect,
}: AvatarPickerSheetContentProps) {
  const insets = useSafeAreaInsets();
  const [previewId, setPreviewId] = useState(initialSelectedId);

  const previewOption =
    AVATAR_OPTIONS.find((option) => option.id === previewId) ??
    AVATAR_OPTIONS[1]!;

  return (
    <View style={[styles.sheet, { marginBottom: insets.bottom + 12 }]}>
      <View style={styles.handle} />
      <ThemedText style={styles.title} typography="body-2-bold">
        프로필 이미지 선택
      </ThemedText>

      <View style={styles.previewWrap}>
        <AvatarSwatch option={previewOption} size={96} />
      </View>

      <View style={styles.grid}>
        {AVATAR_OPTIONS.map((option) => (
          <Pressable
            accessibilityLabel={
              option.kind === "upload" ? "직접 업로드" : "프로필 이미지"
            }
            accessibilityRole="button"
            accessibilityState={{ selected: previewId === option.id }}
            key={option.id}
            onPress={() => setPreviewId(option.id)}
            style={[
              styles.optionButton,
              previewId === option.id && styles.optionButtonSelected,
            ]}
          >
            <AvatarSwatch option={option} size={48} />
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityLabel="닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.footerButton, styles.closeButton]}
        >
          <ThemedText typography="body-2-bold">닫기</ThemedText>
        </Pressable>
        <Pressable
          accessibilityLabel="선택"
          accessibilityRole="button"
          onPress={() => onSelect(previewId)}
          style={[styles.footerButton, styles.selectButton]}
        >
          <ThemedText typography="body-2-bold">선택</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(25, 31, 40, 0.18)",
    flex: 1,
  },
  sheet: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-subtle"],
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 12,
    paddingBottom: 17,
    paddingTop: 9,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: 2,
    height: 4,
    width: 44,
  },
  title: {
    color: semanticColors["label-normal"],
    marginLeft: 23,
    marginTop: 20,
  },
  previewWrap: {
    alignItems: "center",
    marginTop: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 27,
    paddingHorizontal: 23,
  },
  optionButton: {
    borderRadius: 28,
    marginBottom: 14,
    padding: 4,
  },
  optionButtonSelected: {
    borderColor: semanticColors["primary-normal"],
    borderWidth: 2,
  },
  footer: {
    flexDirection: "row",
    gap: 15,
    marginTop: 8,
    paddingHorizontal: 17,
  },
  footerButton: {
    alignItems: "center",
    borderRadius: radius.default,
    flex: 1,
    height: 52,
    justifyContent: "center",
  },
  closeButton: {
    backgroundColor: semanticColors["fill-normal"],
  },
  selectButton: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-subtle"],
    borderWidth: 1,
  },
});
