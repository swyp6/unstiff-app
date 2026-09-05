import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

export function WorkoutPlanDragIndicator() {
  return <View style={styles.dragIndicator} />;
}

export function WorkoutPlanHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack: () => void;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
        style={styles.headerSide}
      >
        <Ionicons
          color={semanticColors["label-normal"]}
          name="chevron-back"
          size={22}
        />
      </Pressable>
      <ThemedText
        numberOfLines={1}
        style={styles.headerTitle}
        typography="title-2-bold"
      >
        {title}
      </ThemedText>
      <View style={[styles.headerSide, styles.headerAction]}>{action}</View>
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <ThemedText style={styles.sectionLabel} typography="caption-1-bold">
      {children}
    </ThemedText>
  );
}

export function SelectionRow({
  value,
  onPress,
  placeholder = "선택하세요",
  accessibilityLabel,
}: {
  value: string;
  onPress?: () => void;
  placeholder?: string;
  accessibilityLabel?: string;
}) {
  const hasValue = value.length > 0;
  const content = (
    <>
      <ThemedText
        style={!hasValue && { color: semanticColors["label-disabled"] }}
        typography="body-2-bold"
      >
        {hasValue ? value : placeholder}
      </ThemedText>
      <View style={styles.selectionValue}>
        {onPress && (
          <Ionicons
            color={semanticColors["label-subtle"]}
            name="chevron-forward"
            size={24}
          />
        )}
      </View>
    </>
  );

  if (!onPress) return <View style={styles.selectionRow}>{content}</View>;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectionPressable,
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={styles.selectionRow}>
        {content}
      </View>
    </Pressable>
  );
}

export function PrimaryActionButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => pressed && !disabled && styles.pressed}
    >
      <View
        style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
      >
        <ThemedText
          style={[styles.primaryText, disabled && styles.primaryTextDisabled]}
          typography="body-2-bold"
        >
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dragIndicator: {
    alignSelf: "center",
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: 2,
    height: 4,
    marginBottom: 18,
    marginTop: 8,
    width: 36,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 68,
  },
  headerSide: {
    alignItems: "flex-start",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerAction: {
    alignItems: "flex-end",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  sectionLabel: {
    color: semanticColors["label-normal"],
    marginBottom: 6,
  },
  selectionRow: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-subtle"],
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    height: 50,
    paddingHorizontal: 16,
  },
  selectionPressable: {
    minHeight: 50,
    width: "100%",
  },
  selectionValue: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: semanticColors["label-normal"],
    borderRadius: 14,
    justifyContent: "center",
    height: 54,
  },
  primaryText: {
    color: semanticColors["label-inverse"],
  },
  primaryButtonDisabled: {
    backgroundColor: semanticColors["fill-subtle"],
  },
  primaryTextDisabled: {
    color: semanticColors["label-disabled"],
  },
  pressed: {
    opacity: 0.7,
  },
});
