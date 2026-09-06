import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { semanticColors } from "@/constants/tokens";
import { ActivitySummaryTab } from "@/features/mypage/components/activity-summary-tab";
import { BadgesTab } from "@/features/mypage/components/badges-tab";
import {
  type MyPageTab,
  MyPageTabs,
} from "@/features/mypage/components/mypage-tabs";
import { ProfileCard } from "@/features/mypage/components/profile-card";
import { StreakTab } from "@/features/mypage/components/streak-tab";
import { useMyProfileStore } from "@/features/mypage/profile-store";

export default function MyPageScreen() {
  const [tab, setTab] = useState<MyPageTab>("streak");
  const nickname = useMyProfileStore((state) => state.nickname);
  const avatar = useMyProfileStore((state) => state.avatar);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <View style={{ width: 20 }} />
          <ThemedText themeColor="textSecondary" typography="body-1-medium">
            마이페이지
          </ThemedText>
          <Pressable
            accessibilityLabel="설정"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push("/mypage/settings")}
          >
            <Ionicons
              color={semanticColors["label-normal"]}
              name="settings-outline"
              size={20}
            />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1 bg-fill-subtle"
          contentContainerClassName="gap-4 p-5"
        >
          <ProfileCard
            avatar={avatar}
            nickname={nickname}
            onEditPress={() => router.push("/mypage/edit-profile")}
          />
          <MyPageTabs onChange={setTab} value={tab} />

          {tab === "streak" && <StreakTab />}
          {tab === "badges" && <BadgesTab />}
          {tab === "summary" && <ActivitySummaryTab />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
