import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import {
  formatMeasureValue,
  MEASURE_ORDER,
} from "@/features/workout-history/model";
import type {
  ExerciseMeasuresDto,
  IntensityDto,
} from "@/features/workout-plan/types";
import type { WorkoutHistoryResponse } from "@/features/workout-history/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
      <View className="h-11 flex-row items-center justify-between px-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <Ionicons
            color={semanticColors["label-normal"]}
            name="close"
            size={24}
          />
        </Pressable>
        <ThemedText typography="body-2-bold">
          {formatDateLabel(parseDateParam(params.date))}
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

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
        <>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            contentOffset={{ x: currentIndex * SCREEN_WIDTH, y: 0 }}
            style={{ flex: 1 }}
          >
            {workouts.map((entry) => (
              <RecordPage key={entry.id} entry={entry} />
            ))}
          </ScrollView>

          {workouts.length > 1 && (
            <View className="flex-row items-center justify-center gap-1.5 py-2">
              {workouts.map((entry, index) => (
                <View
                  key={entry.id}
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
        </>
      )}
    </View>
  );
}

function RecordPage({ entry }: { entry: WorkoutHistoryResponse }) {
  const measureEntries = MEASURE_ORDER.filter(
    (key) => entry.measures[key] != null,
  );
  const typeLabel = entry.exerciseType ?? "미션";

  return (
    <View style={{ width: SCREEN_WIDTH }}>
      <View style={{ flex: 1 }}>
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

        {(entry.intensity || measureEntries.length > 0) && (
          <LinearGradient
            colors={["rgba(13,15,20,0)", "rgba(13,15,20,0.9)"]}
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

        <View style={{ position: "absolute", left: 24, bottom: 24, gap: 12 }}>
          {entry.intensity && (
            <ThemedText typography="title-3-bold" style={{ color: "#ffffff" }}>
              {INTENSITY_LABELS[entry.intensity]}
            </ThemedText>
          )}
          {measureEntries.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 24 }}>
              {measureEntries.map((key) => (
                <View key={key} style={{ width: 100 }}>
                  <ThemedText
                    typography="title-2-bold"
                    style={{ color: "#ffffff" }}
                  >
                    {formatMeasureValue(key, entry.measures[key]!)}
                  </ThemedText>
                  <ThemedText
                    typography="caption-2-regular"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    {MEASURE_LABELS[key]}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View className="gap-1.5 px-5 pb-6 pt-4">
        <ThemedText
          typography="body-2-bold"
          style={{ color: primitiveColors.orange["500"] }}
        >
          {typeLabel}
        </ThemedText>
        <ThemedText typography="title-3-bold">{entry.name}</ThemedText>

        {entry.memo && (
          <View className="mt-2 flex-row gap-2">
            <View
              className="w-1 rounded-full"
              style={{ backgroundColor: primitiveColors.orange["500"] }}
            />
            <View className="flex-1 gap-1">
              <ThemedText
                typography="caption-1-medium"
                themeColor="textSecondary"
              >
                한 줄 메모
              </ThemedText>
              <ThemedText typography="body-3-medium">{entry.memo}</ThemedText>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
