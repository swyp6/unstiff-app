import { apiClient } from "@/lib/api-client";

import type {
  OAuth2SignInResponse,
  OAuthProvider,
  TermsListResponse,
  UserProfile,
} from "./types";

export async function signIn(provider: OAuthProvider, credential: string) {
  const { data } = await apiClient.post<OAuth2SignInResponse>(
    `/api/v1/oauth2/${provider}/sign-in`,
    { credential },
  );
  return data;
}

export async function getMyProfile() {
  const { data } = await apiClient.get<UserProfile>("/api/v1/users/me");
  return data;
}

export async function unregister() {
  await apiClient.delete("/api/v1/users/me");
}

export async function getTerms() {
  const { data } = await apiClient.get<TermsListResponse>("/api/v1/terms");
  return data;
}

// `newUser` on the sign-in response only reflects whether an account was
// just created in *this* call, not whether required terms are agreed — a
// user who closes the app mid-onboarding keeps a valid accessToken and
// would never see `newUser: true` again. Terms agreement is checked here
// against the server's actual state instead.
export async function hasUnagreedRequiredTerms() {
  const { terms } = await getTerms();
  return terms.some((term) => term.required && !term.agreed);
}

export async function agreeToTerms(termsDocumentIds: number[]) {
  await apiClient.post("/api/v1/terms/agreements", { termsDocumentIds });
}
