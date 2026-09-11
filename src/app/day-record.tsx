import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";
import { getWorkoutHistory } from "@/features/workout-history/api";
import { WorkoutHistoryEditSheet } from "@/features/workout-history/components/workout-history-edit-sheet";
import { formatMeasureValue } from "@/features/workout-history/model";
import type {
  ExerciseMeasuresDto,
  IntensityDto,
} from "@/features/workout-plan/types";
import type { WorkoutHistoryResponse } from "@/features/workout-history/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Figma 4501:31551 "사진 영역"은 프레임(375 너비) 기준 445 고정 높이다 —
// flex:1로 남는 공간을 다 채우지 않고, 너비 비율만큼만 스케일한다. 기기가
// 더 길면 아래 정보 영역 밑으로 여백이 남는다(디자인의 "여백" 스페이서와
// 같은 효과).
const PHOTO_HEIGHT = 445 * (SCREEN_WIDTH / 375);

const MEASURE_LABELS: Record<keyof ExerciseMeasuresDto, string> = {
  duration: "시간",
  distance: "거리",
  count: "횟수",
  sets: "세트",
};

const INTENSITY_LABELS: Record<IntensityDto, string> = {
  LIGHT: "가볍게",
  MODERATE: "보통",
  HARD: "빡세게",
};

const BOT_AVATAR = require("@/assets/chat/bot-avatar.png");

// Figma 4501:31546-31547 "Touch / More" 메뉴 항목. 저장/변경/수정/삭제는
// 아직 실제 동작이 없다 — UI만 붙여둔 상태(별도 작업 필요).
const MENU_ITEMS: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "사진 저장", icon: "download-outline" },
  { label: "사진 변경", icon: "swap-horizontal-outline" },
  { label: "기록 수정", icon: "create-outline" },
  { label: "사진 삭제", icon: "trash-outline" },
];

function parseDateParam(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLabel(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 캘린더 > "지난 운동" 카드의 기록 하나를 탭하면 여기로 온다. GET
// /api/v1/workouts?date= 로 그 날 전체 기록을 다시 불러와, 탭한 기록부터
// 좌우로 스와이프하며 사진과 세부 기록을 볼 수 있다.
export default function DayRecordScreen() {
  const params = useLocalSearchParams<{ date: string; index?: string }>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [workouts, setWorkouts] = useState<WorkoutHistoryResponse[] | null>(
    null,
  );
  const [currentIndex, setCurrentIndex] = useState(
    Number(params.index ?? 0) || 0,
  );
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);

  useEffect(() => {
    getWorkoutHistory(params.date)
      .then(({ workouts }) => setWorkouts(workouts))
      .catch((error) => {
        console.error("Failed to load workout history", error);
        setWorkouts([]);
      });
    // params.date는 이 화면이 떠 있는 동안 바뀌지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleMomentumScrollEnd(
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: semanticColors["background-normal"],
        paddingTop: insets.top,
      }}
    >
      <View className="h-12 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          className="h-12 w-12 items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons
            color={semanticColors["label-normal"]}
            name="close"
            size={24}
          />
        </Pressable>
        <ThemedText typography="body-2-regular">
          {formatDateLabel(parseDateParam(params.date))}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="더보기"
          className="h-12 w-12 items-center justify-center"
          onPress={() => setIsMenuVisible(true)}
        >
          <Ionicons
            color={semanticColors["label-normal"]}
            name="ellipsis-horizontal"
            size={24}
          />
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
        transparent
        visible={isMenuVisible}
      >
        <Pressable
          accessibilityLabel="메뉴 닫기"
          accessibilityRole="button"
          onPress={() => setIsMenuVisible(false)}
          style={{ flex: 1 }}
        >
          <View
            style={{
              position: "absolute",
              top: insets.top + 52,
              right: 12,
              width: 168,
              borderRadius: 16,
              paddingVertical: 4,
              backgroundColor: semanticColors["background-normal"],
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                className="flex-row items-center gap-2 px-4 py-3"
                onPress={() => {
                  setIsMenuVisible(false);
                  if (item.label === "기록 수정") setIsEditSheetVisible(true);
                }}
              >
                <Ionicons
                  color={semanticColors["label-normal"]}
                  name={item.icon}
                  size={18}
                />
                <ThemedText typography="body-3-medium">{item.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {workouts !== null && workouts.length > 0 && (
        <WorkoutHistoryEditSheet
          entry={workouts[currentIndex]}
          key={workouts[currentIndex].id}
          onClose={() => setIsEditSheetVisible(false)}
          onSaved={(updated) =>
            setWorkouts((current) =>
              current!.map((entry, index) =>
                index === currentIndex ? updated : entry,
              ),
            )
          }
          visible={isEditSheetVisible}
        />
      )}

      {workouts === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={semanticColors["label-subtle"]} />
        </View>
      ) : workouts.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ThemedText typography="body-3-medium" themeColor="textSecondary">
            이 날의 기록이 없어요
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          // 스와이프 속도가 느려 관성(momentum)이 거의 없으면 페이지는
          // 넘어갔는데도 onMomentumScrollEnd가 안 불려서(RN paging 특유의
          // 동작) 점 표시가 그대로 남는 문제가 있었다 — 드래그가 끝날 때도
          // 같은 계산으로 한 번 더 맞춰준다.
          onScrollEndDrag={handleMomentumScrollEnd}
          contentOffset={{ x: currentIndex * SCREEN_WIDTH, y: 0 }}
          style={{ flex: 1 }}
        >
          {workouts.map((entry) => (
            <RecordPage
              currentIndex={currentIndex}
              entry={entry}
              key={entry.id}
              pageCount={workouts.length}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// Figma 4501:31556-31572 "통계 그리드" — 강도 단독 행(있으면) 다음에
// 시간·거리, 횟수·세트를 각각 한 행으로 묶어 보여준다. 항목 폭은 100px
// 고정이고 행 안에서는 간격이 없다(두 칸이 붙어 총 200px).
const MEASURE_ROW_PAIRS: (keyof ExerciseMeasuresDto)[][] = [
  ["duration", "distance"],
  ["count", "sets"],
];

function RecordPage({
  entry,
  currentIndex,
  pageCount,
}: {
  entry: WorkoutHistoryResponse;
  currentIndex: number;
  pageCount: number;
}) {
  const measureRows = MEASURE_ROW_PAIRS.map((pair) =>
    pair.filter((key) => entry.measures[key] != null),
  ).filter((row) => row.length > 0);
  const typeLabel = entry.exerciseType ?? "미션";

  return (
    <View style={{ width: SCREEN_WIDTH }}>
      <View style={{ height: PHOTO_HEIGHT }}>
        {entry.imageUrl ? (
          <Image
            source={{
              uri: getOptimizedImageUrl(entry.imageUrl, { width: 750 }),
            }}
            style={{ flex: 1 }}
            contentFit="cover"
          />
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {(entry.intensity || measureRows.length > 0) && (
          <LinearGradient
            colors={["rgba(13,15,20,0)", "rgba(13,15,20,0.92)"]}
            end={{ x: 0, y: 1 }}
            pointerEvents="none"
            start={{ x: 0, y: 0 }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "60%",
            }}
          />
        )}

        <View style={{ position: "absolute", left: 24, bottom: 24, gap: 14 }}>
          {entry.intensity && (
            <View style={{ width: 100 }}>
              <ThemedText
                typography="display-1-bold"
                style={{ color: "#ffffff" }}
              >
                {INTENSITY_LABELS[entry.intensity]}
              </ThemedText>
              <ThemedText
                typography="caption-2-regular"
                style={{ color: "#c3c3c6" }}
              >
                강도
              </ThemedText>
            </View>
          )}
          {measureRows.map((row) => (
            <View key={row.join("-")} style={{ flexDirection: "row" }}>
              {row.map((key) => (
                <View key={key} style={{ width: 100 }}>
                  <ThemedText
                    typography="display-1-bold"
                    style={{ color: "#ffffff" }}
                  >
                    {formatMeasureValue(key, entry.measures[key]!)}
                  </ThemedText>
                  <ThemedText
                    typography="caption-2-regular"
                    style={{ color: "#c3c3c6" }}
                  >
                    {MEASURE_LABELS[key]}
                  </ThemedText>
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>

      {pageCount > 1 && (
        <View className="flex-row items-center justify-center gap-1.5 pb-3.5 pt-4">
          {Array.from({ length: pageCount }, (_, index) => (
            <View
              key={index}
              className={`h-1.5 rounded-full ${
                index === currentIndex ? "w-4" : "w-1.5"
              }`}
              style={{
                backgroundColor:
                  index === currentIndex
                    ? semanticColors["label-normal"]
                    : semanticColors["line-normal"],
              }}
            />
          ))}
        </View>
      )}

      <View className="gap-4 px-6 pb-6 pt-4">
        <View className="gap-1.5">
          <ThemedText
            typography="body-2-medium"
            style={{ color: primitiveColors.orange["500"] }}
          >
            {typeLabel}
          </ThemedText>
          <ThemedText typography="title-2-bold">{entry.name}</ThemedText>
        </View>

        {entry.memo && (
          <View className="flex-row items-center gap-3">
            <View className="flex-1 flex-row items-stretch">
              <View
                className="rounded-sm"
                style={{
                  width: 3,
                  backgroundColor: primitiveColors.orange["500"],
                }}
              />
              <View className="flex-1 gap-2 pl-3.5">
                <ThemedText
                  typography="body-3-regular"
                  style={{ color: "#8c8c92" }}
                >
                  한 줄 메모
                </ThemedText>
                <ThemedText typography="body-2-bold">{entry.memo}</ThemedText>
              </View>
            </View>
            <View
              className="items-center justify-center overflow-hidden rounded-full"
              style={{
                width: 63,
                height: 63,
                backgroundColor: primitiveColors.orange["50"],
              }}
            >
              <Image
                contentFit="cover"
                source={BOT_AVATAR}
                style={{ width: 63, height: 63 }}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
