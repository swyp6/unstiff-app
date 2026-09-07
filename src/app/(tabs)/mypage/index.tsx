import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { semanticColors } from "@/constants/tokens";
import { getMyProfile } from "@/features/auth/api";
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

  // GET is the source of truth for nickname/profileImageUrl — this runs
  // once per mount (the tab bar keeps this screen mounted across tab
  // switches, so this isn't repeated per switch) and is what makes a saved
  // profile survive a cold app restart or a fresh login, not just a PUT
  // made earlier in the same session. Best-effort: a failure here just
  // leaves whatever the store already had (pre-hydration defaults, or a
  // still-valid value from a PUT made earlier this session) rather than
  // blocking this screen or showing an error for a background refresh.
  //
  // The revision captured here before the request starts is checked again
  // by hydrate() itself when the response arrives — if a PUT (edit-profile)
  // or a logout/reset happened in between, that revision has moved on and
  // this GET's now-stale result is dropped instead of overwriting it.
  useEffect(() => {
    const requestRevision = useMyProfileStore.getState().revision;
    let cancelled = false;
    getMyProfile()
      .then((profile) => {
        if (cancelled) return;
        useMyProfileStore
          .getState()
          .hydrate(profile.nickname, profile.profileImageUrl, requestRevision);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
