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

// 서버 TermsType enum 그대로 (unstiff-api terms/TermsType.java, 선언 순서 =
// GET /terms 응답 순서). EXTERNAL_AI만 선택 약관이라 동의 철회(DELETE)의
// 대상이 된다.
export type TermsType = "PRIVACY" | "SERVICE" | "SENSITIVE" | "EXTERNAL_AI";

export type Term = {
  id: number;
  type: TermsType;
  title: string;
  required: boolean;
  // 절대 주소. 전문이 없는 약관은 null — 이때는 링크 없이 체크박스만 보여준다.
  contentUrl: string | null;
  agreed: boolean;
  reagreementRequired: boolean;
  // 서버 LocalDateTime("2026-09-12T13:20:00", timezone 없음). agreed가 true일
  // 때만 내려온다.
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
