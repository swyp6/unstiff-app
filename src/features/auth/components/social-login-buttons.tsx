import { login as kakaoLogin } from "@react-native-seoul/kakao-login";
import axios from "axios";
import { router } from "expo-router";
import { Alert, View } from "react-native";

import { completeOAuthSignIn } from "@/features/auth/api";
import { useAuthStore } from "@/store/auth-store";

import { SocialLoginButton } from "./social-login-button";

async function handleKakaoLogin() {
  console.log("카카오 로그인 클릭");
  try {
    // Backend verifies Kakao sign-in via the OIDC ID token, not the OAuth
    // access token (unlike Apple, this isn't obvious from the SDK alone —
    // confirmed with the backend team, requires OpenID Connect enabled on
    // the Kakao app, which it is).
    const { idToken: kakaoIdToken } = await kakaoLogin();
    const accessToken = await completeOAuthSignIn("kakao", kakaoIdToken);
    useAuthStore.getState().setAccessToken(accessToken);
    console.log("kakao login success!!!! ", { accessToken });
    router.replace("/");
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
      <SocialLoginButton
        provider="apple"
        label="Apple로 계속하기"
        onPress={() => console.log("apple login pressed")}
      />
      <SocialLoginButton
        provider="kakao"
        label="카카오로 계속하기"
        onPress={handleKakaoLogin}
      />
      <SocialLoginButton
        provider="google"
        label="Google로 계속하기"
        onPress={() => console.log("google login pressed")}
      />
    </View>
  );
}
