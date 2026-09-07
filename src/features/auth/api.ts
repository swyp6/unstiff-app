import axios from "axios";

import { apiClient } from "@/lib/api-client";

import type {
  NicknameAvailabilityResponse,
  OAuth2SignInResponse,
  OAuthProvider,
  TermsListResponse,
  UpdateProfileRequest,
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

export async function checkNicknameAvailability(nickname: string) {
  const { data } = await apiClient.get<NicknameAvailabilityResponse>(
    "/api/v1/users/nickname/availability",
    { params: { nickname } },
  );
  return data.available;
}

// Response body isn't part of the documented contract — only the success
// status is needed by any current caller, so this resolves to nothing
// rather than guessing at a shape.
export async function updateMyProfile(payload: UpdateProfileRequest) {
  await apiClient.put("/api/v1/users/me/profile", payload);
}

// NICKNAME_ALREADY_USED is returned with no `errors` array, just this code
// and a human-readable `detail` — distinguishing it from a generic
// network/5xx failure lets callers route the user back to fix the nickname
// specifically instead of showing a generic retry message.
export function isNicknameAlreadyUsedError(error: unknown) {
  return (
    axios.isAxiosError(error) &&
    (error.response?.data as { code?: string } | undefined)?.code ===
      "NICKNAME_ALREADY_USED"
  );
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
