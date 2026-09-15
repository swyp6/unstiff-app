import { useState } from "react";

import { IntensityBottomSheet } from "@/features/workout-plan/components/intensity-bottom-sheet";
import type { GoalType, Intensity } from "@/features/workout-plan/model";

import { ActualMeasureValueBottomSheet } from "./components/actual-measure-value-bottom-sheet";

// "강도"·"실제 시간/거리/횟수/세트" 시트는 manual-record.tsx(신규 기록)와
// record-editor-screen.tsx(연결된 기록)가 똑같이 쓴다 — 상태와 JSX를 한
// 군데에 모아서, 탭바 위로 띄우는 처리(embeddedBottomInset) 같은 걸 고칠 때
// 두 파일에 따로 반영하지 않아도 되게 한다.
export function useMeasureSheets({
  intensity,
  onChangeIntensity,
  values,
  onChangeValues,
  embeddedBottomInset,
}: {
  intensity: Intensity;
  onChangeIntensity: (value: Intensity) => void;
  values: Record<GoalType, number>;
  onChangeValues: (
    updater: (current: Record<GoalType, number>) => Record<GoalType, number>,
  ) => void;
  embeddedBottomInset: number;
}) {
  const [isIntensitySheetVisible, setIsIntensitySheetVisible] = useState(false);
  // 실제 시간/거리/횟수/세트 중 지금 휠 피커로 직접 입력 중인 항목(없으면
  // null) — ActualMeasureStepper의 라벨을 누르면 그 타입으로 켜진다.
  const [actualMeasureSheetType, setActualMeasureSheetType] =
    useState<GoalType | null>(null);

  return {
    openIntensitySheet: () => setIsIntensitySheetVisible(true),
    openMeasureSheet: (type: GoalType) => setActualMeasureSheetType(type),
    intensitySheet: isIntensitySheetVisible && (
      <IntensityBottomSheet
        embedded
        embeddedBottomInset={embeddedBottomInset}
        onClose={() => setIsIntensitySheetVisible(false)}
        onConfirm={(value) => {
          onChangeIntensity(value);
          setIsIntensitySheetVisible(false);
        }}
        value={intensity}
        visible
      />
    ),
    measureSheet: actualMeasureSheetType && (
      <ActualMeasureValueBottomSheet
        embedded
        embeddedBottomInset={embeddedBottomInset}
        onClose={() => setActualMeasureSheetType(null)}
        onConfirm={(nextValue) => {
          onChangeValues((current) => ({
            ...current,
            [actualMeasureSheetType]: nextValue,
          }));
          setActualMeasureSheetType(null);
        }}
        type={actualMeasureSheetType}
        value={values[actualMeasureSheetType]}
        visible
      />
    ),
  };
}
