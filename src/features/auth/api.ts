import { apiClient } from "@/lib/api-client";

import type {
  OAuth2SignInResponse,
  OAuthProvider,
  SignUpResponse,
  UserProfile,
} from "./types";

export async function signIn(provider: OAuthProvider, credential: string) {
  const { data } = await apiClient.post<OAuth2SignInResponse>(
    `/api/v1/oauth2/${provider}/sign-in`,
    { credential },
  );
  return data;
}

export async function signUp(onboardingToken: string) {
  const { data } = await apiClient.post<SignUpResponse>(
    "/api/v1/sign-up",
    undefined,
    { headers: { "Jpd-Onboarding-Token": onboardingToken } },
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

// Shared by every provider: exchange a provider credential for our own
// accessToken, transparently completing sign-up when the backend reports
// this is a first-time user (sign-up needs no extra input beyond the
// onboarding token, so no separate screen is required).
export async function completeOAuthSignIn(
  provider: OAuthProvider,
  credential: string,
) {
  const result = await signIn(provider, credential);

  if (result.status === "AUTHENTICATED" && result.accessToken) {
    return result.accessToken;
  }

  if (result.status === "SIGN_UP_REQUIRED" && result.onboardingToken) {
    const { accessToken } = await signUp(result.onboardingToken);
    return accessToken;
  }

  throw new Error(`Unexpected sign-in response: ${JSON.stringify(result)}`);
}
