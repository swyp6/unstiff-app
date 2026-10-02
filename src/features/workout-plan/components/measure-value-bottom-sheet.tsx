import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ActionButton } from "@/components/ui/action-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { semanticColors } from "@/constants/tokens";
import type { GoalType } from "@/features/workout-plan/model";

import { PickerColumn } from "./time-picker-bottom-sheet";

type PickerItem = { label: string; value: string };

// 값을 정수 "칸"(tick)으로 바꿔 다룬다 — 시간은 1분, 거리는 0.1km, 횟수·세트는
// 1이 한 칸이다. 시간·거리는 큰 단위(60분=1시간, 10칸=1km)를 기준으로 두
// 컬럼(시/분, 정수/소수)에 나누고, 횟수·세트는 컬럼 하나만 쓴다.
const TYPE_LAYOUT: Record<
  GoalType,
  {
    ticksPerUnit: number;
    ticksPerMajor?: number;
    majorUnit: string;
    minorUnit?: string;
    formatMinor?: (value: number) => string;
  }
> = {
  time: {
    ticksPerUnit: 1,
    ticksPerMajor: 60,
    majorUnit: "시간",
    minorUnit: "분",
    formatMinor: (value) => String(value).padStart(2, "0"),
  },
  distance: {
    ticksPerUnit: 10,
    ticksPerMajor: 10,
    majorUnit: ".",
    minorUnit: "km",
  },
  reps: { ticksPerUnit: 1, majorUnit: "회" },
  sets: { ticksPerUnit: 1, majorUnit: "세트" },
};

type TickRange = { first: number; last: number; step: number };

// 휠에는 저장 가능한 값(minimum~maximum 안의 step 배수)만 노출한다 — 고른
// 값을 선택 완료 때 다른 값으로 바꾸지 않기 위해서다.
function getTickRange(
  type: GoalType,
  minimum: number,
  maximum: number,
  step: number,
): TickRange {
  const { ticksPerUnit } = TYPE_LAYOUT[type];
  const stepTicks = Math.round(step * ticksPerUnit);
  return {
    first:
      Math.ceil(Math.round(minimum * ticksPerUnit) / stepTicks) * stepTicks,
    last:
      Math.floor(Math.round(maximum * ticksPerUnit) / stepTicks) * stepTicks,
    step: stepTicks,
  };
}

function rangeValues(from: number, to: number, step: number) {
  const values: number[] = [];
  for (let value = from; value <= to; value += step) values.push(value);
  return values;
}

function toItems(values: number[], format: (value: number) => string = String) {
  return values.map((value): PickerItem => ({
    label: format(value),
    value: String(value),
  }));
}

// 큰 단위 하나(예: 0시간)에서 고를 수 있는 작은 단위 값들 — 범위 끝에 걸친
// 시간대는 일부만 남는다(계획 시간 0시간 → 05~55분, 10시간 → 00분).
function getMinorValues(major: number, perMajor: number, range: TickRange) {
  const low = Math.max(range.first, major * perMajor);
  const high = Math.min(range.last, major * perMajor + perMajor - 1);
  return rangeValues(
    Math.ceil(low / range.step) * range.step,
    high,
    range.step,
  ).map((tick) => tick - major * perMajor);
}

function nearest(values: number[], target: number) {
  return values.reduce((best, value) =>
    Math.abs(value - target) < Math.abs(best - target) ? value : best,
  );
}

// 휠은 저장 가능한 값만 가지므로, 그 밖의 값(최대값 초과 또는 step에 안
// 맞는 값)으로 열리면 가장 가까운 칸에서 시작한다. 이건 시작 위치일 뿐이라
// 닫으면 원래 값이 그대로 남고, 선택 완료를 눌러야만 보이는 값으로 바뀐다.
function toInitialTick(type: GoalType, value: number, range: TickRange) {
  const tick = Math.round(
    Math.round(value * TYPE_LAYOUT[type].ticksPerUnit) / range.step,
  );
  return Math.min(range.last, Math.max(range.first, tick * range.step));
}

function fromTick(type: GoalType, tick: number) {
  const value = tick / TYPE_LAYOUT[type].ticksPerUnit;
  return type === "distance" ? Number(value.toFixed(1)) : value;
}

const PICKER_HEIGHT = 200;

type MeasureValueBottomSheetProps = {
  type: GoalType;
  title: string;
  // 휠에 노출할 값의 범위와 간격 — 실제 기록은 ACTUAL_MEASURE_CONFIG, 계획
  // 목표는 GOAL_CONFIG에서 호출부가 골라 넘긴다.
  minimum: number;
  maximum: number;
  step: number;
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
  step,
  visible,
  embedded = false,
  embeddedBottomInset,
  value,
  onClose,
  onConfirm,
}: MeasureValueBottomSheetProps) {
  const layout = TYPE_LAYOUT[type];
  const perMajor = layout.ticksPerMajor;
  const range = useMemo(
    () => getTickRange(type, minimum, maximum, step),
    [type, minimum, maximum, step],
  );
  const [tick, setTick] = useState(() => toInitialTick(type, value, range));
  const major = perMajor ? Math.floor(tick / perMajor) : tick;
  const minor = perMajor ? tick % perMajor : 0;
  const majorItems = useMemo(
    () =>
      perMajor
        ? toItems(
            rangeValues(
              Math.floor(range.first / perMajor),
              Math.floor(range.last / perMajor),
              1,
            ),
          )
        : toItems(rangeValues(range.first, range.last, range.step)),
    [perMajor, range],
  );
  const minorItems = useMemo(
    () =>
      perMajor
        ? toItems(getMinorValues(major, perMajor, range), layout.formatMinor)
        : undefined,
    [major, perMajor, range, layout.formatMinor],
  );

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
            items={majorItems}
            loop={false}
            onChange={(next) => {
              const nextMajor = Number(next);
              if (!perMajor) {
                setTick(nextMajor);
                return;
              }
              // 시간대가 바뀌어 지금 분이 새 목록에 없으면(예: 1시간 00분 →
              // 0시간, 0시간엔 05분부터) 가장 가까운 칸으로 옮긴다 — 화면에
              // 없는 분이 state에 남지 않게 한다.
              setTick((current) => {
                const minors = getMinorValues(nextMajor, perMajor, range);
                const currentMinor = current % perMajor;
                const nextMinor = minors.includes(currentMinor)
                  ? currentMinor
                  : nearest(minors, currentMinor);
                return nextMajor * perMajor + nextMinor;
              });
            }}
            selected={String(major)}
          />
          <View pointerEvents="none" style={styles.unit}>
            <ThemedText style={styles.unitText} typography="caption-1-regular">
              {layout.majorUnit}
            </ThemedText>
          </View>
          {perMajor !== undefined && minorItems && (
            <>
              <PickerColumn
                columnStyle={styles.column}
                items={minorItems}
                // PickerColumn은 마운트 이후 selected를 다시 읽지 않는다 —
                // 목록이 바뀔 때(범위 끝 시간대 진입/이탈) 다시 마운트해 옮긴
                // 칸에서 시작하게 한다. 목록은 연속 구간이라 첫 값+길이로 구분된다.
                key={`${minorItems[0]?.value}-${minorItems.length}`}
                loop={false}
                onChange={(next) =>
                  setTick(
                    (current) =>
                      Math.floor(current / perMajor) * perMajor + Number(next),
                  )
                }
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
          // 휠에는 저장 가능한 값만 있으므로 보이는 값이 그대로 전달된다.
          onPress={() => onConfirm(fromTick(type, tick))}
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
