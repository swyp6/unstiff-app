export type OAuthProvider = "apple" | "kakao";

export type SignInStatus = "AUTHENTICATED" | "SIGN_UP_REQUIRED";

export type OAuth2SignInResponse = {
  status: SignInStatus;
  accessToken?: string;
  onboardingToken?: string;
};

export type SignUpResponse = {
  accessToken: string;
};

export type UserProfile = {
  id: number;
  authType: "APPLE" | "KAKAO";
  createdAt: string;
  updatedAt: string;
};
