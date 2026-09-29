import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ActionButton } from "@/components/ui/action-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { semanticColors } from "@/constants/tokens";
import { PickerColumn } from "@/features/workout-plan/components/time-picker-bottom-sheet";
import type { GoalType } from "@/features/workout-plan/model";

import { ACTUAL_MEASURE_CONFIG } from "../actual-measure";

function buildItems(
  min: number,
  max: number,
  format?: (value: number) => string,
) {
  return Array.from({ length: max - min + 1 }, (_, index) => {
    const value = min + index;
    return {
      label: format ? format(value) : String(value),
      value: String(value),
    };
  });
}

const formatMinute = (value: number) => String(value).padStart(2, "0");
// 최대값(600분=10시간)까지만 노출한다 — 마지막 시간대(10시간)에서는 분도
// 최대값의 나머지(00분)까지만 고를 수 있다.
const TIME_MAX_HOUR = Math.floor(ACTUAL_MEASURE_CONFIG.time.maximum / 60);
const HOUR_ITEMS = buildItems(0, TIME_MAX_HOUR);
const MINUTE_ITEMS = buildItems(0, 59, formatMinute);
const MAX_HOUR_MINUTE_ITEMS = buildItems(
  0,
  ACTUAL_MEASURE_CONFIG.time.maximum % 60,
  formatMinute,
);
const DECIMAL_ITEMS = buildItems(0, 9);
const REPS_ITEMS = buildItems(
  ACTUAL_MEASURE_CONFIG.reps.minimum,
  ACTUAL_MEASURE_CONFIG.reps.maximum,
);
const SETS_ITEMS = buildItems(
  ACTUAL_MEASURE_CONFIG.sets.minimum,
  ACTUAL_MEASURE_CONFIG.sets.maximum,
);
const DISTANCE_INTEGER_ITEMS = buildItems(
  0,
  Math.trunc(ACTUAL_MEASURE_CONFIG.distance.maximum),
);

// 각 타입의 "휠 1개당 어떤 값"과 "그 옆에 붙는 단위 글자"를 정의한다 — 시간은
// 시/분, 거리는 정수km/소수, 횟수·세트는 컬럼 하나만 쓴다.
const TYPE_LAYOUT: Record<
  GoalType,
  {
    majorItems: { label: string; value: string }[];
    majorUnit: string;
    minorItems?: { label: string; value: string }[];
    minorUnit?: string;
  }
> = {
  time: {
    majorItems: HOUR_ITEMS,
    majorUnit: "시간",
    minorItems: MINUTE_ITEMS,
    minorUnit: "분",
  },
  distance: {
    majorItems: DISTANCE_INTEGER_ITEMS,
    majorUnit: ".",
    minorItems: DECIMAL_ITEMS,
    minorUnit: "km",
  },
  reps: { majorItems: REPS_ITEMS, majorUnit: "회" },
  sets: { majorItems: SETS_ITEMS, majorUnit: "세트" },
};

function toMajorMinor(type: GoalType, rawValue: number) {
  // 휠에 없는 값(최대값 초과)으로 시작하면 보이는 칸과 state가 어긋나므로
  // 휠이 가진 최대값에 맞춰 시작한다.
  const value = Math.min(ACTUAL_MEASURE_CONFIG[type].maximum, rawValue);
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
  config: { minimum: number; maximum: number },
) {
  if (type === "time") {
    return Math.max(
      config.minimum,
      Math.min(config.maximum, major * 60 + minor),
    );
  }
  if (type === "distance") {
    const combined = Number((major + minor / 10).toFixed(1));
    return Math.max(config.minimum, Math.min(config.maximum, combined));
  }
  return Math.max(config.minimum, Math.min(config.maximum, major));
}

const PICKER_HEIGHT = 200;

type ActualMeasureValueBottomSheetProps = {
  type: GoalType;
  visible: boolean;
  embedded?: boolean;
  embeddedBottomInset?: number;
  value: number;
  onClose: () => void;
  onConfirm: (value: number) => void;
};

// "예상 시작 시간" 휠 피커(time-picker-bottom-sheet.tsx)를 그대로 재사용해,
// 실제 시간/거리/횟수/세트를 스테퍼 대신 직접 돌려서 맞출 수 있게 한다.
// 시간·거리는 두 컬럼(시/분, 정수/소수), 횟수·세트는 한 컬럼이다.
export function ActualMeasureValueBottomSheet({
  type,
  visible,
  embedded = false,
  embeddedBottomInset,
  value,
  onClose,
  onConfirm,
}: ActualMeasureValueBottomSheetProps) {
  const config = ACTUAL_MEASURE_CONFIG[type];
  const layout = TYPE_LAYOUT[type];
  const initial = toMajorMinor(type, value);
  const [major, setMajor] = useState(initial.major);
  const [minor, setMinor] = useState(initial.minor);
  const isMaxHour = type === "time" && major === TIME_MAX_HOUR;

  return (
    <BottomSheet
      embedded={embedded}
      embeddedBottomInset={embeddedBottomInset}
      onClose={onClose}
      title={`실제 ${config.label}`}
      visible={visible}
    >
      <View style={styles.pickerFrame}>
        <View pointerEvents="none" style={styles.selectionOverlay} />
        <PickerColumn
          columnStyle={
            layout.minorItems ? styles.majorColumn : styles.soloColumn
          }
          items={layout.majorItems}
          loop={false}
          onChange={(next) => {
            const nextMajor = Number(next);
            setMajor(nextMajor);
            // 10시간으로 바뀌면 분 휠에 00만 남는다 — 이전 분(예: 30)이
            // 화면에 없는 채로 state에 남지 않게 함께 00으로 맞춘다.
            if (type === "time" && nextMajor === TIME_MAX_HOUR) setMinor(0);
          }}
          selected={String(major)}
        />
        <View
          pointerEvents="none"
          style={[
            styles.unit,
            layout.minorItems ? styles.majorUnit : styles.soloUnit,
          ]}
        >
          <ThemedText style={styles.unitText} typography="caption-1-regular">
            {layout.majorUnit}
          </ThemedText>
        </View>
        {layout.minorItems && (
          <>
            <PickerColumn
              columnStyle={styles.minorColumn}
              items={isMaxHour ? MAX_HOUR_MINUTE_ITEMS : layout.minorItems}
              // PickerColumn은 마운트 이후 selected를 다시 읽지 않는다 —
              // 분 목록이 바뀔 때 다시 마운트해 00 위치에서 시작하게 한다.
              key={isMaxHour ? "max-hour" : "default"}
              loop={false}
              onChange={(next) => setMinor(Number(next))}
              selected={String(minor)}
            />
            <View pointerEvents="none" style={[styles.unit, styles.minorUnit]}>
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

      <View style={styles.confirmButtonWrapper}>
        <ActionButton
          label="선택 완료"
          onPress={() => onConfirm(fromMajorMinor(type, major, minor, config))}
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
  unit: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    position: "absolute",
    top: (PICKER_HEIGHT - 44) / 2,
    zIndex: 2,
  },
  majorUnit: {
    left: "52%",
  },
  minorUnit: {
    left: "80%",
  },
  soloUnit: {
    left: "65%",
  },
  unitText: {
    color: semanticColors["label-subtle"],
  },
  majorColumn: {
    left: "25%",
    width: "20%",
  },
  minorColumn: {
    left: "58%",
    width: "20%",
  },
  soloColumn: {
    left: "40%",
    width: "20%",
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
