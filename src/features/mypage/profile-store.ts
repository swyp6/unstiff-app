import { create } from "zustand";

import type { AvatarSelection } from "@/features/mypage/avatar-presets";
import { MOCK_NICKNAME } from "@/features/mypage/mock-data";

// No backend field exists yet for nickname/avatar (see mock-data.ts), so
// edits here are in-memory only — not persisted, since faking persistence
// now would just get silently overwritten once a real API lands.
type MyProfileState = {
  nickname: string;
  avatar: AvatarSelection;
  setNickname: (nickname: string) => void;
  setAvatar: (avatar: AvatarSelection) => void;
};

export const useMyProfileStore = create<MyProfileState>((set) => ({
  nickname: MOCK_NICKNAME,
  avatar: null,
  setNickname: (nickname) => set({ nickname }),
  setAvatar: (avatar) => set({ avatar }),
}));
