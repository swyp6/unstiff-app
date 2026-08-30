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

export async function agreeToTerms(termsDocumentIds: number[]) {
  await apiClient.post("/api/v1/terms/agreements", { termsDocumentIds });
}
