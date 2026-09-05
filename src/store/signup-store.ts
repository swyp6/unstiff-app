import { create } from "zustand";

// In-memory only (no persist middleware) — this tracks a single
// SNS-login-to-signup-completion pass and must NOT survive an app restart.
// If it did, a returning existing user could get funneled back into the
// new-user nickname/profile screens by stale leftover state from a
// previous, unrelated signup attempt on the same device.
type SignupState = {
  isNewUser: boolean;
  nickname: string;
  // A local file URI the user has confirmed (via photo-adjust's "완료") as
  // their profile photo for this onboarding session — NOT a server-saved
  // profile URL. There is no backend endpoint yet to persist a profile
  // image, so this only ever feeds local preview UI (profile-photo,
  // signup-complete) until that endpoint exists.
  confirmedPhotoUri: string | null;
  setIsNewUser: (value: boolean) => void;
  setNickname: (value: string) => void;
  setConfirmedPhotoUri: (value: string | null) => void;
  reset: () => void;
};

const initialState = {
  isNewUser: false,
  nickname: "",
  confirmedPhotoUri: null,
};

export const useSignupStore = create<SignupState>((set) => ({
  ...initialState,
  setIsNewUser: (isNewUser) => set({ isNewUser }),
  setNickname: (nickname) => set({ nickname }),
  setConfirmedPhotoUri: (confirmedPhotoUri) => set({ confirmedPhotoUri }),
  reset: () => set(initialState),
}));
