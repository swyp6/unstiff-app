import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ActionButton } from "@/components/ui/action-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { semanticColors } from "@/constants/tokens";
import type { GoalType } from "@/features/workout-plan/model";

import { PickerColumn } from "./time-picker-bottom-sheet";

type PickerItem = { label: string; value: string };

function buildItems(
  min: number,
  max: number,
  format?: (value: number) => string,
): PickerItem[] {
  return Array.from({ length: max - min + 1 }, (_, index) => {
    const value = min + index;
    return {
      label: format ? format(value) : String(value),
      value: String(value),
    };
  });
}

const formatMinute = (value: number) => String(value).padStart(2, "0");
const MINUTE_ITEMS = buildItems(0, 59, formatMinute);
const DECIMAL_ITEMS = buildItems(0, 9);

// 각 타입의 "휠 1개당 어떤 값"과 "그 옆에 붙는 단위 글자"를 정의한다 — 시간은
// 시/분, 거리는 정수km/소수, 횟수·세트는 컬럼 하나만 쓴다. 휠 범위는 호출부가
// 넘긴 minimum/maximum으로 만든다(어느 설정을 쓸지는 호출부가 정한다).
function buildLayout(type: GoalType, minimum: number, maximum: number) {
  if (type === "time") {
    return {
      majorItems: buildItems(0, Math.floor(maximum / 60)),
      majorUnit: "시간",
      minorItems: MINUTE_ITEMS,
      minorUnit: "분",
      // 최대값(예: 600분=10시간)까지만 노출한다 — 마지막 시간대에서는 분도
      // 최대값의 나머지(00분)까지만 고를 수 있다.
      maxHourMinuteItems: buildItems(0, maximum % 60, formatMinute),
    };
  }
  if (type === "distance") {
    return {
      majorItems: buildItems(0, Math.trunc(maximum)),
      majorUnit: ".",
      minorItems: DECIMAL_ITEMS,
      minorUnit: "km",
    };
  }
  return {
    majorItems: buildItems(minimum, maximum),
    majorUnit: type === "reps" ? "회" : "세트",
  };
}

function toMajorMinor(type: GoalType, rawValue: number, maximum: number) {
  // 휠에 없는 값(최대값 초과)으로 시작하면 보이는 칸과 state가 어긋나므로
  // 휠이 가진 최대값에 맞춰 시작한다.
  const value = Math.min(maximum, rawValue);
  if (type === "time") {
    return { major: Math.floor(value / 60), minor: value % 60 };
  }
  if (type === "distance") {
    const integer = Math.trunc(value);
    const decimal = Math.round((value - Math.trunc(value)) * 10) % 10;
    return { major: integer, minor: decimal };
  }
  return { major: Math.round(value), minor: 0 };
}

function fromMajorMinor(
  type: GoalType,
  major: number,
  minor: number,
  range: { minimum: number; maximum: number },
) {
  if (type === "time") {
    return Math.max(range.minimum, Math.min(range.maximum, major * 60 + minor));
  }
  if (type === "distance") {
    const combined = Number((major + minor / 10).toFixed(1));
    return Math.max(range.minimum, Math.min(range.maximum, combined));
  }
  return Math.max(range.minimum, Math.min(range.maximum, major));
}

const PICKER_HEIGHT = 200;

type MeasureValueBottomSheetProps = {
  type: GoalType;
  title: string;
  // 휠 범위이자 선택 완료 시 clamp 범위 — 실제 기록은 ACTUAL_MEASURE_CONFIG,
  // 계획 목표는 GOAL_CONFIG에서 호출부가 골라 넘긴다.
  minimum: number;
  maximum: number;
  visible: boolean;
  embedded?: boolean;
  embeddedBottomInset?: number;
  value: number;
  onClose: () => void;
  onConfirm: (value: number) => void;
};

// "예상 시작 시간" 휠 피커(time-picker-bottom-sheet.tsx)를 그대로 재사용해,
// 시간/거리/횟수/세트를 스테퍼 대신 직접 돌려서 맞출 수 있게 한다.
// 시간·거리는 두 컬럼(시/분, 정수/소수), 횟수·세트는 한 컬럼이다. 열 때마다
// 새로 마운트되는 것을 전제로 value에서 한 번만 시작 위치를 잡는다.
export function MeasureValueBottomSheet({
  type,
  title,
  minimum,
  maximum,
  visible,
  embedded = false,
  embeddedBottomInset,
  value,
  onClose,
  onConfirm,
}: MeasureValueBottomSheetProps) {
  const layout = useMemo(
    () => buildLayout(type, minimum, maximum),
    [type, minimum, maximum],
  );
  const maxHour = Math.floor(maximum / 60);
  const initial = toMajorMinor(type, value, maximum);
  const [major, setMajor] = useState(initial.major);
  const [minor, setMinor] = useState(initial.minor);
  const isMaxHour = type === "time" && major === maxHour;

  return (
    <BottomSheet
      embedded={embedded}
      embeddedBottomInset={embeddedBottomInset}
      onClose={onClose}
      title={title}
      visible={visible}
    >
      <View style={styles.pickerFrame}>
        <View pointerEvents="none" style={styles.selectionOverlay} />
        <View style={styles.row}>
          <PickerColumn
            columnStyle={styles.column}
            items={layout.majorItems}
            loop={false}
            onChange={(next) => {
              const nextMajor = Number(next);
              setMajor(nextMajor);
              // 마지막 시간대로 바뀌면 분 휠에 00만 남는다 — 이전 분(예: 30)이
              // 화면에 없는 채로 state에 남지 않게 함께 00으로 맞춘다.
              if (type === "time" && nextMajor === maxHour) setMinor(0);
            }}
            selected={String(major)}
          />
          <View pointerEvents="none" style={styles.unit}>
            <ThemedText style={styles.unitText} typography="caption-1-regular">
              {layout.majorUnit}
            </ThemedText>
          </View>
          {layout.minorItems && (
            <>
              <PickerColumn
                columnStyle={styles.column}
                items={
                  isMaxHour && layout.maxHourMinuteItems
                    ? layout.maxHourMinuteItems
                    : layout.minorItems
                }
                // PickerColumn은 마운트 이후 selected를 다시 읽지 않는다 —
                // 분 목록이 바뀔 때 다시 마운트해 00 위치에서 시작하게 한다.
                key={isMaxHour ? "max-hour" : "default"}
                loop={false}
                onChange={(next) => setMinor(Number(next))}
                selected={String(minor)}
              />
              <View pointerEvents="none" style={styles.unit}>
                <ThemedText
                  style={styles.unitText}
                  typography="caption-1-regular"
                >
                  {layout.minorUnit}
                </ThemedText>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.confirmButtonWrapper}>
        <ActionButton
          label="선택 완료"
          onPress={() =>
            onConfirm(fromMajorMinor(type, major, minor, { minimum, maximum }))
          }
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  pickerFrame: {
    backgroundColor: semanticColors["fill-subtle"],
    borderRadius: 14,
    height: PICKER_HEIGHT,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  row: {
    alignItems: "center",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  column: {
    position: "relative",
    width: 60,
  },
  unit: {
    marginHorizontal: 4,
    zIndex: 2,
  },
  unitText: {
    color: semanticColors["label-subtle"],
  },
  selectionOverlay: {
    backgroundColor: semanticColors["background-normal"],
    borderRadius: 10,
    height: 44,
    left: 0,
    position: "absolute",
    right: 0,
    top: (PICKER_HEIGHT - 44) / 2,
  },
  confirmButtonWrapper: {
    marginTop: 30,
  },
});
