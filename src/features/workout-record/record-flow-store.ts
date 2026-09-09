import { create } from "zustand";

import type { ExerciseMeasuresDto } from "@/features/workout-plan/types";

import type { WorkoutRefType } from "./types";

// 카메라(루트 /camera 또는 하단 카메라 탭) → (대상 선택) → 기록 입력 →
// 완료 화면까지 이어지는 여러 라우트 사이에서 사진/대상을 주고받는 용도.
// route param에 JSON을 실어 보내는 대신(기존 프로젝트에서도 피하는
// 패턴 — daily-photo-store 참고) 이 store를 거친다.
//
// LINKED(기존 PLAN/MISSION에 연결)와 MANUAL(신규 직접 입력)을 명확히
// 구분한다 — MANUAL은 화면 진입 시점에는 연결 대상이 없고, 저장할 때 먼저
// daily-plan을 만든 뒤 그 실제 id를 PLAN refId로 사용한다. 0/-1 같은 sentinel
// refId는 만들거나 보내지 않는다.
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
//
// measures는 "서버로 보낸 그대로", 즉 API 단위(초/m)다. 완료 화면은 사용자에게
// 보여줄 때 measure-units.ts로 UI 단위(분/km)로 되돌린다 — 여기 값을 미리
// 분/km로 바꿔두면 "API DTO인데 UI 단위"인 애매한 상태가 된다.
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
  // POST /api/v1/workouts가 성공한 마지막 시각(Date.now()). 홈이 이 값의
  // 변화를 구독해 오늘의 운동/미션/캘린더를 서버에서 다시 읽는다 — 저장이
  // 실제로 일어났을 때만 바뀌므로 화면 포커스마다 API를 난사하지 않는다.
  savedRecordAt: number | null;
  setPhoto: (photo: RecordFlowPhoto | null) => void;
  setTarget: (target: RecordFlowTarget | null) => void;
  setConfirmed: (confirmed: ConfirmedWorkoutRecord) => void;
  markRecordSaved: () => void;
  reset: () => void;
};

export const useRecordFlowStore = create<RecordFlowState>((set) => ({
  photo: null,
  target: null,
  confirmed: null,
  savedRecordAt: null,
  setPhoto: (photo) => set({ photo }),
  setTarget: (target) => set({ target }),
  setConfirmed: (confirmed) => set({ confirmed }),
  markRecordSaved: () => set({ savedRecordAt: Date.now() }),
  // savedRecordAt은 draft가 아니라 "서버에 저장이 일어났다"는 신호라 초기화
  // 대상이 아니다 — 완료 화면의 "확인"이 reset()을 부른 뒤에야 홈이 포커스를
  // 받는 경우가 있어, 여기서 지우면 그 갱신 신호를 놓친다.
  reset: () => set({ photo: null, target: null, confirmed: null }),
}));
