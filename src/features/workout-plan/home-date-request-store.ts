import { router } from "expo-router";
import { create } from "zustand";

// 홈이 아닌 화면(카메라 탭의 대상 선택/신규 기록)에서 띄운 운동 5개 제한
// 모달의 "내일 운동 미리 계획하기"/"오늘 기록 보기"가 홈으로 넘어가면서
// 어떤 날짜를 보여줄지(그리고 그 날짜의 "운동 추가하기" 시트를 바로 열지)
// 전달하는 용도. 홈은 이 값을 구독해 한 번 소비하고 바로 지운다.
//
// route param 대신 store를 쓰는 이유: 홈은 탭 화면이라 param이 라우트 상태에
// 남아, 같은 날짜로 두 번째 요청이 와도 값이 안 바뀌어 다시 반응하지 않는다.
// mission-feedback-store와 같은 "화면 전환을 건너는 1회성 요청" 패턴이다.
// 날짜는 "YYYY-MM-DD" 문자열이 아니라 Date로 들고 다닌다 — 문자열을
// new Date()로 되돌리면 UTC 자정으로 해석돼 한국 시간에서 하루가 어긋난다.
type HomeDateRequestState = {
  pending: { date: Date; openAddSheet: boolean } | null;
  request: (date: Date, openAddSheet: boolean) => void;
  clear: () => void;
};

export const useHomeDateRequestStore = create<HomeDateRequestState>((set) => ({
  pending: null,
  request: (date, openAddSheet) => set({ pending: { date, openAddSheet } }),
  clear: () => set({ pending: null }),
}));

// 홈 탭으로 이동하면서 그 날짜를 보여달라고 요청한다. 홈은 네이티브 탭이라
// 항상 마운트돼 있어 store 변화에 먼저 반응하고, 그 뒤 탭 전환이 따라온다.
export function openHomeAtDate(date: Date, openAddSheet: boolean) {
  useHomeDateRequestStore.getState().request(date, openAddSheet);
  router.navigate("/home");
}
