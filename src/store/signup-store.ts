import { create } from "zustand";

// In-memory only (no persist middleware) — this tracks a single
// SNS-login-to-signup-completion pass and must NOT survive an app restart.
// If it did, a returning existing user could get funneled back into the
// new-user nickname/profile screens by stale leftover state from a
// previous, unrelated signup attempt on the same device.
type SignupState = {
  isNewUser: boolean;
  nickname: string;
  profileImageUrl: string | null;
  setIsNewUser: (value: boolean) => void;
  setNickname: (value: string) => void;
  setProfileImageUrl: (value: string | null) => void;
  reset: () => void;
};

const initialState = {
  isNewUser: false,
  nickname: "",
  profileImageUrl: null,
};

export const useSignupStore = create<SignupState>((set) => ({
  ...initialState,
  setIsNewUser: (isNewUser) => set({ isNewUser }),
  setNickname: (nickname) => set({ nickname }),
  setProfileImageUrl: (profileImageUrl) => set({ profileImageUrl }),
  reset: () => set(initialState),
}));
