export type OAuthProvider = "apple" | "kakao" | "google";

export type OAuth2SignInResponse = {
  accessToken: string;
  newUser: boolean;
};

export type UserProfile = {
  id: number;
  authType: "APPLE" | "KAKAO" | "GOOGLE";
  // null until the user completes profile setup (PUT /users/me/profile has
  // never been called for them).
  nickname: string | null;
  // Never null — a default-*.png character is assigned at signup, before
  // any real photo is ever uploaded.
  profileImageUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type TermsType = "SERVICE" | "PRIVACY" | "MARKETING";

export type Term = {
  id: number;
  type: TermsType;
  title: string;
  required: boolean;
  contentUrl: string;
  agreed: boolean;
  reagreementRequired: boolean;
  agreedAt: string | null;
};

export type TermsListResponse = {
  terms: Term[];
};

export type NicknameAvailabilityResponse = {
  available: boolean;
};

// Server saves only whatever fields are sent — omit a field entirely to
// leave it unchanged. Sending neither is a 400, and if both are sent, a
// failure on either means neither is saved.
export type UpdateProfileRequest = {
  nickname?: string;
  profileImageUrl?: string;
};
