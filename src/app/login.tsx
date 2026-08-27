import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
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
        <ThemedText type="title">환영합니다</ThemedText>
        <View className="items-center">
          <SocialLoginButtons />
          <Link href="/dev/ui-playground" asChild>
            <Pressable className="mt-4 px-3 py-2">
              <Text className="text-center text-xs text-[#8B95A1]">
                UI 컴포넌트 테스트
              </Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
