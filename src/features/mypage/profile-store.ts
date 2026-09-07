import { create } from "zustand";

import type { AvatarSelection } from "@/features/mypage/avatar-presets";

// GET /api/v1/users/me is this store's source of truth — hydrated once per
// app session from mypage/index.tsx on mount. nickname can genuinely be
// null server-side (profile setup never completed — see UserProfile in
// features/auth/types.ts) and is shown as-is, never replaced with a fake
// placeholder name. profileImageUrl is never null (a default-*.png
// character is assigned at signup), so avatar only stays null before the
// very first hydrate()/setAvatar() call of the session.
//
// setNickname/setAvatar are also called directly (not via hydrate) right
// after a PUT /users/me/profile succeeds, in nickname.tsx (onboarding) and
// edit-profile.tsx (mypage) — never optimistically, only once the server
// call has actually succeeded.
//
// `revision` guards against a GET started earlier resolving *after* a
// newer local change: it bumps on every setNickname/setAvatar/reset, and
// hydrate() only applies its result if the store's revision is still the
// one its caller captured before starting the request — otherwise
// something more authoritative (a successful PUT, or a logout/reset)
// already happened in the meantime, so the stale GET is silently dropped.
type MyProfileState = {
  nickname: string | null;
  avatar: AvatarSelection;
  revision: number;
  setNickname: (nickname: string) => void;
  setAvatar: (avatar: AvatarSelection) => void;
  hydrate: (
    nickname: string | null,
    profileImageUrl: string,
    expectedRevision: number,
  ) => void;
  reset: () => void;
};

const initialState = {
  nickname: null as string | null,
  avatar: null as AvatarSelection,
};

export const useMyProfileStore = create<MyProfileState>((set) => ({
  ...initialState,
  revision: 0,
  setNickname: (nickname) =>
    set((state) => ({ nickname, revision: state.revision + 1 })),
  setAvatar: (avatar) =>
    set((state) => ({ avatar, revision: state.revision + 1 })),
  hydrate: (nickname, profileImageUrl, expectedRevision) =>
    set((state) => {
      if (state.revision !== expectedRevision) return state;
      return { nickname, avatar: { type: "photo", uri: profileImageUrl } };
    }),
  // Not persisted, but the store instance itself outlives any one user's
  // session — without this, logging out and into a different account on
  // the same app process would still show the previous account's
  // nickname/avatar until the next hydrate() completed. Called from
  // logout() so every logout path (including withdrawal) clears it. Also
  // bumps revision, so a GET started under the previous account can never
  // land after this and reinsert that account's profile.
  reset: () =>
    set((state) => ({ ...initialState, revision: state.revision + 1 })),
}));
