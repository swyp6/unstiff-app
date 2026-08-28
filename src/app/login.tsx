import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { SocialLoginButtons } from "@/features/auth/components/social-login-buttons";

export default function LoginScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: Spacing.four,
          gap: Spacing.six,
        }}
      >
        <ThemedText typography="title-1-bold">환영합니다</ThemedText>
        <SocialLoginButtons />
      </SafeAreaView>
    </ThemedView>
  );
}
