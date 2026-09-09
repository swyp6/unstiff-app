import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import { WorkoutPlanBottomSheet } from "@/features/workout-plan/components/workout-plan-bottom-sheet";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const MONTH_ROWS = [
  MONTHS.slice(0, 3),
  MONTHS.slice(3, 6),
  MONTHS.slice(6, 9),
  MONTHS.slice(9, 12),
];

type MonthPickerSheetProps = {
  visible: boolean;
  year: number;
  month: number;
  onClose: () => void;
  onSelect: (year: number, month: number) => void;
};

// Figma "03 월 이동 / 연월 직접 선택"(node 4305:37874) — 연도는 시트 안에서만
// 넘기다가(화살표), 달을 실제로 고를 때만 캘린더에 반영한다.
export function MonthPickerSheet({
  visible,
  year,
  month,
  onClose,
  onSelect,
}: MonthPickerSheetProps) {
  const [displayedYear, setDisplayedYear] = useState(year);
  // 열릴 때마다 시트 안 연도를 실제 보고 있는 연도로 되돌린다 — effect 대신
  // 렌더 중에 이전 visible과 비교해서 반영한다(React 권장 패턴: "prop이
  // 바뀔 때 state 맞추기"는 effect가 아니라 렌더 중 처리).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDisplayedYear(year);
  }

  return (
    <WorkoutPlanBottomSheet onClose={onClose} visible={visible}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="이전 연도"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setDisplayedYear((current) => current - 1)}
        >
          <Ionicons
            color={primitiveColors.charcoal[12]}
            name="caret-back"
            size={24}
          />
        </Pressable>
        <ThemedText
          style={{ color: primitiveColors.charcoal[11] }}
          typography="title-3-bold"
        >
          {displayedYear}
        </ThemedText>
        <Pressable
          accessibilityLabel="다음 연도"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setDisplayedYear((current) => current + 1)}
        >
          <Ionicons
            color={primitiveColors.charcoal[12]}
            name="caret-forward"
            size={24}
          />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {MONTH_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((monthNumber) => {
              const isSelected =
                displayedYear === year && monthNumber === month;
              return (
                <Pressable
                  accessibilityLabel={`${displayedYear}년 ${monthNumber}월`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={monthNumber}
                  onPress={() => onSelect(displayedYear, monthNumber)}
                  style={[styles.cell, isSelected && styles.selectedCell]}
                >
                  <ThemedText
                    style={isSelected ? styles.selectedText : styles.text}
                    typography="body-2-medium"
                  >
                    {monthNumber}월
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </WorkoutPlanBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingTop: 4,
  },
  grid: {
    gap: 10,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  cell: {
    alignItems: "center",
    backgroundColor: "#fafafa",
    borderRadius: 14,
    flex: 1,
    paddingVertical: 16,
  },
  selectedCell: {
    backgroundColor: primitiveColors.charcoal[11],
  },
  text: {
    color: primitiveColors.charcoal[11],
  },
  selectedText: {
    color: semanticColors["label-inverse"],
  },
});
