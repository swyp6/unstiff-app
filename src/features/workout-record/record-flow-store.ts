import { create } from "zustand";

import type { ExerciseMeasuresDto } from "@/features/workout-plan/types";

import type { WorkoutRefType } from "./types";

// 카메라(루트 /camera 또는 하단 카메라 탭) → (대상 선택) → 기록 입력 →
// 완료 화면까지 이어지는 여러 라우트 사이에서 사진/대상을 주고받는 용도.
// route param에 JSON을 실어 보내는 대신(기존 프로젝트에서도 피하는
// 패턴 — daily-photo-store 참고) 이 store를 거친다.
//
// LINKED(기존 PLAN/MISSION에 연결)와 MANUAL(신규 직접 입력)을 명확히
// 구분한다 — MANUAL은 서버로 보낼 refType/refId가 없다(POST /api/v1/workouts가
// 아직 refType/refId를 필수로 요구해 MANUAL 기록을 저장할 서버 계약 자체가
// 없다. 절대 0/-1 같은 sentinel refId를 만들어 보내지 않는다).
export type RecordFlowTarget =
  | {
      mode: "LINKED";
      refType: WorkoutRefType;
      refId: number;
      // 기록 입력/완료 화면 헤더에 보여줄 표시용 제목 — 서버에 보내지 않는다.
      title: string;
    }
  | {
      mode: "MANUAL";
      title: string;
      exerciseType: string;
    };

type RecordFlowPhoto = {
  secureUrl: string;
};

// POST /api/v1/workouts 성공 시점에 실제로 서버에 저장한 값을 그대로
// 얼려둔 스냅샷. 완료 화면은 이 값만 읽는다 — 입력 중이던 draft(photo/
// target)가 그 사이 초기화되거나 바뀌어도 완료 화면 표시에는 영향이 없다.
export type ConfirmedWorkoutRecord = {
  target: RecordFlowTarget;
  secureUrl?: string;
  measures: ExerciseMeasuresDto;
  memo?: string;
  date: Date;
};

type RecordFlowState = {
  photo: RecordFlowPhoto | null;
  target: RecordFlowTarget | null;
  confirmed: ConfirmedWorkoutRecord | null;
  setPhoto: (photo: RecordFlowPhoto | null) => void;
  setTarget: (target: RecordFlowTarget | null) => void;
  setConfirmed: (confirmed: ConfirmedWorkoutRecord) => void;
  reset: () => void;
};

export const useRecordFlowStore = create<RecordFlowState>((set) => ({
  photo: null,
  target: null,
  confirmed: null,
  setPhoto: (photo) => set({ photo }),
  setTarget: (target) => set({ target }),
  setConfirmed: (confirmed) => set({ confirmed }),
  reset: () => set({ photo: null, target: null, confirmed: null }),
}));
