import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark } from "@/components/brand-mark";
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
        <BrandMark size={200} />
        <SocialLoginButtons />
      </SafeAreaView>
    </ThemedView>
  );
}
