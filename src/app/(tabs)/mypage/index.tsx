import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";
import { trackClick } from "@/features/analytics/analytics";
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
import { useWorkoutActivity } from "@/features/mypage/use-workout-activity";

// Figma surface/background. tokens.ts(auto-generated)에 대응 semantic 토큰이
// 없어 notifications.tsx와 같은 방식으로 화면 로컬 상수로 둔다.
const SURFACE_BACKGROUND = "#fafafa";

// Figma "Navigation / Top" (4573:35558) — 72px, 배경 없음(화면의
// surface/background가 비침). 제목은 heading/1/bold charcoal/12를 화면 전체
// 폭 기준 가운데, 설정 아이콘 24×24는 x325/y24(오른쪽 inset 26). Figma에
// 별도 터치 영역 노드는 없어 hitSlop으로만 넓힌다.
const HEADER_HEIGHT = 72;
const SETTINGS_ICON_SIZE = 24;
const SETTINGS_ICON_RIGHT = 375 - 325 - SETTINGS_ICON_SIZE;

// 탭 아래 콘텐츠 영역. 뱃지 탭(Figma 4573:35563)과 활동 리포트 탭(Figma
// 4573:35652)은 pt 12 / px 20 / pb 24 — NativeWind rem=14라 rem 클래스(pt-3
// 등)는 0.875배로 렌더되므로 px 값으로 쓴다. 활동 기록 탭은 기존 클래스
// (gap-4/px-5/pb-5)를 그대로 옮겨 기존 렌더 결과를 유지한다.
const TAB_REGION_CLASS: Record<MyPageTab, string> = {
  streak: "px-5 pb-5 pt-4",
  badges: "px-[20px] pb-[24px] pt-[12px]",
  summary: "px-[20px] pb-[24px] pt-[12px]",
};

export default function MyPageScreen() {
  const [tab, setTab] = useState<MyPageTab>("streak");
  const nickname = useMyProfileStore((state) => state.nickname);
  const avatar = useMyProfileStore((state) => state.avatar);
  // Lives here rather than in StreakTab so switching between mypage tabs
  // (which unmounts StreakTab) doesn't drop the data and refetch — the
  // hook itself refreshes on every focus of this screen.
  const workoutActivity = useWorkoutActivity();

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
    <View style={{ backgroundColor: SURFACE_BACKGROUND, flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View
          className="items-center justify-center"
          style={{ height: HEADER_HEIGHT }}
        >
          <ThemedText
            style={{ color: primitiveColors.charcoal["12"] }}
            typography="heading-1-bold"
          >
            마이페이지
          </ThemedText>
          <Pressable
            accessibilityLabel="설정"
            accessibilityRole="button"
            className="absolute"
            hitSlop={12}
            onPress={() => {
              trackClick("mypage", "open_settings");
              router.push("/mypage/settings");
            }}
            style={{
              right: SETTINGS_ICON_RIGHT,
              top: (HEADER_HEIGHT - SETTINGS_ICON_SIZE) / 2,
            }}
          >
            <Image
              contentFit="contain"
              source={require("@/assets/mypage/icon-settings.svg")}
              style={{ height: SETTINGS_ICON_SIZE, width: SETTINGS_ICON_SIZE }}
            />
          </Pressable>
        </View>

        <ScrollView className="flex-1">
          <ProfileCard
            avatar={avatar}
            nickname={nickname}
            onEditPress={() => router.push("/mypage/edit-profile")}
          />

          <MyPageTabs onChange={setTab} value={tab} />

          <View className={TAB_REGION_CLASS[tab]}>
            {tab === "streak" && <StreakTab {...workoutActivity} />}
            {tab === "badges" && <BadgesTab />}
            {tab === "summary" && <ActivitySummaryTab />}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
