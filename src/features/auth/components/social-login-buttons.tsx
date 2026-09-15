import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { login as kakaoLogin } from "@react-native-seoul/kakao-login";
import axios from "axios";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { Alert, Platform, View } from "react-native";

import { hasUnagreedRequiredTerms, signIn } from "@/features/auth/api";
import type { OAuth2SignInResponse } from "@/features/auth/types";
import { useAuthStore } from "@/store/auth-store";
import { useSignupStore } from "@/store/signup-store";

import { SocialLoginButton } from "./social-login-button";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

// `newUser` is the OAuth response's own signal for "this account was just
// created" — the authoritative branch point per the sign-in contract, not
// a guess based on whether the backend happens to have a nickname on file
// (it never does yet; see nickname.tsx). A brand-new account always still
// has its required terms unagreed, so routing it straight to
// terms-agreement without the extra hasUnagreedRequiredTerms() round trip
// is safe. An existing user may still have newly-added required terms to
// accept, so that check is kept for them.
async function routeAfterSignIn({
  accessToken,
  newUser,
}: OAuth2SignInResponse) {
  useAuthStore.getState().setAccessToken(accessToken);
  useSignupStore.getState().reset();
  useSignupStore.getState().setIsNewUser(newUser);

  if (newUser) {
    router.replace("/terms-agreement");
    return;
  }

  router.replace(
    (await hasUnagreedRequiredTerms()) ? "/terms-agreement" : "/home",
  );
}

// 로그인 실패 로그 — AxiosError 전체(config.headers.Authorization, 요청
// body의 idToken/identityToken 등)나 응답 본문 전문은 남기지 않고, 개발
// 빌드에서 status/code/message만 남긴다.
function logSignInError(provider: string, error: unknown) {
  if (!__DEV__) return;
  if (axios.isAxiosError(error)) {
    console.error(`${provider} login failed`, {
      status: error.response?.status,
      code: error.code,
      message: error.message,
    });
  } else if (error instanceof Error) {
    console.error(`${provider} login failed`, {
      name: error.name,
      message: error.message,
    });
  } else {
    console.error(`${provider} login failed`);
  }
}

async function handleGoogleLogin() {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      return;
    }

    const googleIdToken = response.data.idToken;
    if (!googleIdToken) {
      throw new Error("Google sign-in did not return an idToken");
    }

    const signInResponse = await signIn("google", googleIdToken);
    await routeAfterSignIn(signInResponse);
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) {
      return;
    }

    logSignInError("google", error);
    Alert.alert("로그인 실패", "Google 로그인 중 문제가 발생했습니다.");
  }
}

async function handleAppleLogin() {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("Apple sign-in did not return an identityToken");
    }

    const signInResponse = await signIn("apple", credential.identityToken);
    await routeAfterSignIn(signInResponse);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ERR_REQUEST_CANCELED"
    ) {
      return;
    }

    logSignInError("apple", error);
    Alert.alert("로그인 실패", "Apple 로그인 중 문제가 발생했습니다.");
  }
}

async function handleKakaoLogin() {
  try {
    // Backend verifies Kakao sign-in via the OIDC ID token, not the OAuth
    // access token (unlike Apple, this isn't obvious from the SDK alone —
    // confirmed with the backend team, requires OpenID Connect enabled on
    // the Kakao app, which it is).
    const { idToken: kakaoIdToken } = await kakaoLogin();
    if (!kakaoIdToken) {
      throw new Error("Kakao sign-in did not return an idToken");
    }

    const signInResponse = await signIn("kakao", kakaoIdToken);
    await routeAfterSignIn(signInResponse);
  } catch (error) {
    logSignInError("kakao", error);
    Alert.alert("로그인 실패", "카카오 로그인 중 문제가 발생했습니다.");
  }
}

export function SocialLoginButtons() {
  return (
    <View className="items-center gap-3">
      {Platform.OS === "ios" && (
        <SocialLoginButton
          provider="apple"
          label="Apple로 계속하기"
          onPress={handleAppleLogin}
        />
      )}
      <SocialLoginButton
        provider="kakao"
        label="카카오로 계속하기"
        onPress={handleKakaoLogin}
      />
      <SocialLoginButton
        provider="google"
        label="Google로 계속하기"
        onPress={handleGoogleLogin}
      />
    </View>
  );
}
