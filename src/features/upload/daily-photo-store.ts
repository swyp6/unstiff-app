import { create } from "zustand";

import type { WorkoutRefType } from "@/features/workout-record/types";

type DailyPhotoResult = {
  planItemId: string;
  secureUrl: string;
  // PLAN 항목일 때만 채워진다 — 오늘의 운동 서버 id(refId)와 그 타입.
  // 실제 수행값(measures) 입력 UI가 없어 POST /api/v1/workouts 호출은 아직
  // 이 값들을 쓰지 않지만, 그 UI가 생기면 바로 이어붙일 수 있도록 여기까지는
  // 미리 전달해둔다.
  refType?: WorkoutRefType;
  refId?: number;
};

type DailyPhotoStore = {
  result: DailyPhotoResult | null;
  setResult: (result: DailyPhotoResult) => void;
  clearResult: () => void;
};

// 카메라 화면(src/app/camera.tsx)은 라우트 파라미터로만 결과를 되돌려줄 수
// 없으므로, 완료 대상 화면(홈)이 돌아온 뒤 소비할 수 있게 이 스토어에 담아둔다.
export const useDailyPhotoStore = create<DailyPhotoStore>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clearResult: () => set({ result: null }),
}));
