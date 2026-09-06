import { create } from "zustand";

// In-memory only (no persist middleware) — this tracks a single
// SNS-login-to-signup-completion pass and must NOT survive an app restart.
// If it did, a returning existing user could get funneled back into the
// new-user nickname/profile screens by stale leftover state from a
// previous, unrelated signup attempt on the same device.
//
// hasAgreedToRequiredTerms / hasCompletedProfileStep exist purely to
// enforce this *session's* screen order (so a new user can't jump straight
// to /nickname or /signup-complete before actually finishing the step
// before it) — they are not a source of truth for anything server-side.
// The server's own agreement state (hasUnagreedRequiredTerms()) is still
// the real source of truth; this is local UI sequencing only, and — like
// the rest of this store — does not survive a cold restart. Resuming an
// interrupted onboarding across an app restart is a known gap, tracked
// separately as a backend blocker (no server field yet exposes "nickname
// set" / "profile step done"), not solved here.
type SignupState = {
  isNewUser: boolean;
  hasAgreedToRequiredTerms: boolean;
  nickname: string;
  // A local file URI the user has confirmed (via photo-adjust's "완료") as
  // their profile photo for this onboarding session — NOT a server-saved
  // profile URL. There is no backend endpoint yet to persist a profile
  // image, so this only ever feeds local preview UI (profile-photo,
  // signup-complete) until that endpoint exists.
  confirmedPhotoUri: string | null;
  // True once profile-photo's Next (photo selected) or Skip (no photo) has
  // actually been pressed — distinct from confirmedPhotoUri being set,
  // since "skipped, no photo" and "never reached this step" both leave
  // confirmedPhotoUri null and would otherwise be indistinguishable.
  hasCompletedProfileStep: boolean;
  setIsNewUser: (value: boolean) => void;
  setHasAgreedToRequiredTerms: (value: boolean) => void;
  setNickname: (value: string) => void;
  setConfirmedPhotoUri: (value: string | null) => void;
  setHasCompletedProfileStep: (value: boolean) => void;
  reset: () => void;
};

const initialState = {
  isNewUser: false,
  hasAgreedToRequiredTerms: false,
  nickname: "",
  confirmedPhotoUri: null,
  hasCompletedProfileStep: false,
};

export const useSignupStore = create<SignupState>((set) => ({
  ...initialState,
  setIsNewUser: (isNewUser) => set({ isNewUser }),
  setHasAgreedToRequiredTerms: (hasAgreedToRequiredTerms) =>
    set({ hasAgreedToRequiredTerms }),
  setNickname: (nickname) => set({ nickname }),
  setConfirmedPhotoUri: (confirmedPhotoUri) => set({ confirmedPhotoUri }),
  setHasCompletedProfileStep: (hasCompletedProfileStep) =>
    set({ hasCompletedProfileStep }),
  reset: () => set(initialState),
}));
