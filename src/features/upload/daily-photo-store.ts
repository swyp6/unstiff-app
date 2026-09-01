import { create } from "zustand";

type DailyPhotoResult = {
  planItemId: string;
  secureUrl: string;
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
