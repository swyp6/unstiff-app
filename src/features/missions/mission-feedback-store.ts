import { create } from "zustand";

// completeMission/dismissMission 응답의 requireUserFeedback이 true일 때,
// "완료/닫기 → (완료의 경우 record-complete까지 거쳐서) → 홈"으로 라우트가
// 바뀐 뒤에도 어떤 미션에 피드백을 물어야 하는지 기억해두는 용도.
//
// record-flow-store에 넣지 않는 이유: 그 store의 reset()은 workout record
// draft(photo/target/confirmed)의 생명주기와 묶여 있고, RecordEditor →
// RecordComplete로 넘어가는 과정에서 최소 한 번 호출된다. 이 피드백 요청은
// 그보다 오래 살아야(record-complete를 지나 홈에 도착할 때까지) 하므로 별도
// store로 둔다.
type MissionFeedbackState = {
  pendingMissionId: number | null;
  requestFeedback: (missionId: number) => void;
  clearFeedback: () => void;
};

export const useMissionFeedbackStore = create<MissionFeedbackState>((set) => ({
  pendingMissionId: null,
  requestFeedback: (missionId) => set({ pendingMissionId: missionId }),
  clearFeedback: () => set({ pendingMissionId: null }),
}));
