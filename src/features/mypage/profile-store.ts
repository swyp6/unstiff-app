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
  reset: () => void;
};

const initialState = {
  nickname: MOCK_NICKNAME,
  avatar: null as AvatarSelection,
};

export const useMyProfileStore = create<MyProfileState>((set) => ({
  ...initialState,
  setNickname: (nickname) => set({ nickname }),
  setAvatar: (avatar) => set({ avatar }),
  // Not persisted, but the store instance itself outlives any one user's
  // session — without this, logging out and into a different account on
  // the same app process would still show the previous account's
  // nickname/avatar until edit-profile was opened again. Called from
  // logout() so every logout path (including withdrawal) clears it.
  reset: () => set(initialState),
}));
