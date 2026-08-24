import { View } from "react-native";

import { SocialLoginButton } from "./social-login-button";

export function SocialLoginButtons() {
  return (
    <View className="w-full gap-3">
      <SocialLoginButton
        provider="apple"
        label="Apple로 계속하기"
        onPress={() => console.log("apple login pressed")}
      />
      <SocialLoginButton
        provider="kakao"
        onPress={() => console.log("kakao login pressed")}
      />
      <SocialLoginButton
        provider="google"
        label="Google로 계속하기"
        onPress={() => console.log("google login pressed")}
      />
    </View>
  );
}
