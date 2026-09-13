import { create } from "zustand";

type PhotoAdjustResultStore = {
  // Set right before pushing to profile-photo-adjust from outside the
  // onboarding flow — tells that screen's "완료" to hand the cropped uri
  // back here instead of its onboarding-only default (writing straight
  // into useSignupStore).
  isExternalRequest: boolean;
  resultUri: string | null;
  beginExternalRequest: () => void;
  resolve: (uri: string) => void;
  // Clears the request/result regardless of whether a result was ever
  // produced — used both by a cancelled crop (no result yet) and by
  // consume() below (result already read).
  reset: () => void;
  // Reads (and clears) whatever crop result is waiting — a store value
  // rather than a one-shot callback closure, since expo-router can
  // remount the screen that registered a callback before it ever fires,
  // silently dropping it. A store value survives that remount: the
  // remounted screen's own focus-effect just reads it fresh.
  consume: () => string | null;
};

export const usePhotoAdjustResultStore = create<PhotoAdjustResultStore>(
  (set, get) => ({
    isExternalRequest: false,
    resultUri: null,
    beginExternalRequest: () =>
      set({ isExternalRequest: true, resultUri: null }),
    resolve: (uri) => set({ resultUri: uri }),
    reset: () => set({ isExternalRequest: false, resultUri: null }),
    consume: () => {
      const { resultUri } = get();
      set({ isExternalRequest: false, resultUri: null });
      return resultUri;
    },
  }),
);
