export type OAuthProvider = "apple" | "kakao" | "google";

export type OAuth2SignInResponse = {
  accessToken: string;
  newUser: boolean;
};

export type UserProfile = {
  id: number;
  authType: "APPLE" | "KAKAO" | "GOOGLE";
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
