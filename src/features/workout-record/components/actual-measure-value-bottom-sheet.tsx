import { MeasureValueBottomSheet } from "@/features/workout-plan/components/measure-value-bottom-sheet";
import type { GoalType } from "@/features/workout-plan/model";

import { ACTUAL_MEASURE_CONFIG } from "../actual-measure";

type ActualMeasureValueBottomSheetProps = {
  type: GoalType;
  visible: boolean;
  embedded?: boolean;
  embeddedBottomInset?: number;
  value: number;
  onClose: () => void;
  onConfirm: (value: number) => void;
};

// 실제 시간/거리/횟수/세트 직접 입력 — 휠 UI는 계획 목표 입력과 공유하고,
// 범위·간격·제목만 실제 수행값 전용(ACTUAL_MEASURE_CONFIG, "실제 ○○")으로
// 넘긴다.
export function ActualMeasureValueBottomSheet({
  type,
  ...props
}: ActualMeasureValueBottomSheetProps) {
  const config = ACTUAL_MEASURE_CONFIG[type];
  return (
    <MeasureValueBottomSheet
      {...props}
      maximum={config.maximum}
      minimum={config.minimum}
      step={config.step}
      title={`실제 ${config.label}`}
      type={type}
    />
  );
}
