import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { semanticColors } from "@/constants/tokens";
import { ActivityBarChart } from "@/features/mypage/components/activity/activity-bar-chart";
import { ActivityCompositionCard } from "@/features/mypage/components/activity/activity-composition-card";
import { RecentActivityList } from "@/features/mypage/components/activity/recent-activity-list";
import { BadgeGrid } from "@/features/mypage/components/badges/badge-grid";
import { MyPageHeader } from "@/features/mypage/components/mypage-header";
import {
  MyPageTabs,
  type MyPageTabKey,
} from "@/features/mypage/components/mypage-tabs";
import { ProfileCard } from "@/features/mypage/components/profile-card";
import { StreakDotMatrix } from "@/features/mypage/components/streak/streak-dot-matrix";
import { StreakRingGraph } from "@/features/mypage/components/streak/streak-ring-graph";
import { StreakSummaryCard } from "@/features/mypage/components/streak/streak-summary-card";
import {
  MOCK_ACTIVITY,
  MOCK_BADGES,
  MOCK_STREAK,
} from "@/features/mypage/mock-data";

export default function MyPageScreen() {
  const [activeTab, setActiveTab] = useState<MyPageTabKey>("streak");

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <MyPageHeader onPressSettings={() => router.push("/mypage/settings")} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileCard />

        <View style={styles.tabsSection}>
          <MyPageTabs active={activeTab} onChange={setActiveTab} />

          <View style={styles.tabContent}>
            {activeTab === "streak" && (
              <>
                <StreakSummaryCard
                  currentStreakDays={MOCK_STREAK.currentStreakDays}
                />
                <StreakRingGraph
                  lastMonthRate={MOCK_STREAK.lastMonthRate}
                  monthLabel={MOCK_STREAK.monthLabel}
                  thisMonthRate={MOCK_STREAK.thisMonthRate}
                />
                <StreakDotMatrix weeks={MOCK_STREAK.weeks} />
              </>
            )}

            {activeTab === "badge" && <BadgeGrid badges={MOCK_BADGES} />}

            {activeTab === "activity" && (
              <>
                <ActivityBarChart
                  deltaLabel={MOCK_ACTIVITY.deltaLabel}
                  totalDays={MOCK_ACTIVITY.totalDays}
                  weekly={MOCK_ACTIVITY.weekly}
                />
                <ActivityCompositionCard
                  dailyMissionCount={MOCK_ACTIVITY.dailyMissionCount}
                  workoutPlanCount={MOCK_ACTIVITY.workoutPlanCount}
                />
                <RecentActivityList items={MOCK_ACTIVITY.recent} />
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: semanticColors["fill-subtle"],
    flex: 1,
  },
  content: {
    gap: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  tabsSection: {
    backgroundColor: semanticColors["background-normal"],
    borderRadius: 12,
  },
  tabContent: {
    gap: 16,
    paddingTop: 16,
  },
});
