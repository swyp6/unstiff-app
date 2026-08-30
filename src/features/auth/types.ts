export type OAuthProvider = "apple" | "kakao" | "google";

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
  authType: "APPLE" | "KAKAO" | "GOOGLE";
  createdAt: string;
  updatedAt: string;
};
