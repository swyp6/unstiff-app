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

import { signIn } from "@/features/auth/api";
import { useAuthStore } from "@/store/auth-store";

import { SocialLoginButton } from "./social-login-button";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

async function handleGoogleLogin() {
  console.log("구글 로그인 클릭");
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

    const { accessToken, newUser } = await signIn("google", googleIdToken);
    useAuthStore.getState().setAccessToken(accessToken);
    console.log("google login success!");
    router.replace(newUser ? "/terms-agreement" : "/home");
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) {
      return;
    }

    if (axios.isAxiosError(error)) {
      console.error("google login failed", {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });
    } else {
      console.error("google login failed", error);
    }
    Alert.alert("로그인 실패", "Google 로그인 중 문제가 발생했습니다.");
  }
}

async function handleAppleLogin() {
  console.log("애플 로그인 클릭");
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

    const { accessToken, newUser } = await signIn(
      "apple",
      credential.identityToken,
    );
    useAuthStore.getState().setAccessToken(accessToken);
    console.log("apple login success! ");
    router.replace(newUser ? "/terms-agreement" : "/home");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ERR_REQUEST_CANCELED"
    ) {
      return;
    }

    if (axios.isAxiosError(error)) {
      console.error("apple login failed", {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });
    } else {
      console.error("apple login failed", error);
    }
    Alert.alert("로그인 실패", "Apple 로그인 중 문제가 발생했습니다.");
  }
}

async function handleKakaoLogin() {
  console.log("카카오 로그인 클릭");
  try {
    // Backend verifies Kakao sign-in via the OIDC ID token, not the OAuth
    // access token (unlike Apple, this isn't obvious from the SDK alone —
    // confirmed with the backend team, requires OpenID Connect enabled on
    // the Kakao app, which it is).
    const { idToken: kakaoIdToken } = await kakaoLogin();
    const { accessToken, newUser } = await signIn("kakao", kakaoIdToken);
    useAuthStore.getState().setAccessToken(accessToken);
    console.log("kakao login success!");
    router.replace(newUser ? "/terms-agreement" : "/home");
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("kakao login failed", {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });
    } else {
      console.error("kakao login failed", error);
    }
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
