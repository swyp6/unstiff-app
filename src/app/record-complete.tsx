import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";

const MEASURE_DISPLAY: {
  key: "duration" | "distance" | "count" | "sets";
  label: string;
  format: (value: number) => string;
}[] = [
  { key: "duration", label: "시간", format: (v) => `${v}분` },
  { key: "distance", label: "거리", format: (v) => `${v.toFixed(1)}km` },
  { key: "count", label: "횟수", format: (v) => `${v}회` },
  { key: "sets", label: "세트", format: (v) => `${v}세트` },
];

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
}

// Figma 2117:11386 "[완료] -> 홈으로" — POST /api/v1/workouts 성공 직후에만
// 진입한다(record-editor.tsx 참고). confirmed는 저장에 실제 사용한 값의
// 스냅샷이라, 이 화면이 떠 있는 동안 draft(photo/target)가 초기화돼도
// 표시값에는 영향이 없다.
export default function RecordCompleteScreen() {
  const insets = useSafeAreaInsets();
  const confirmed = useRecordFlowStore((state) => state.confirmed);
  const reset = useRecordFlowStore((state) => state.reset);

  // 이 화면으로 잘못 진입한 경우(confirmed 없음) 저장 성공 화면을 지어내지
  // 않고 바로 홈으로 보낸다. dismissTo로 이 화면(및 그 위에 쌓인 게 있다면
  // 그것까지)을 확실히 걷어내고 이동한다.
  useEffect(() => {
    if (!confirmed) router.dismissTo("/home");
  }, [confirmed]);

  if (!confirmed) return null;

  const measureEntries = MEASURE_DISPLAY.filter(
    ({ key }) => confirmed.measures[key] != null,
  );

  // 성공 흐름의 명시적 마무리: draft를 지운 뒤 dismissTo("/home")로
  // record-complete/record-editor/camera(및 standalone 경로의 capture 탭
  // nested stack에 남아있는 target)까지 전부 걷어내고 홈으로 이동한다.
  // 다른 화면(target 등)이 store 변화를 감시하다가 알아서 자신을
  // pop하는 방식은 쓰지 않는다 — 이 확인 동작 하나에서 끝까지 명시적으로
  // 처리한다.
  function handleConfirm() {
    reset();
    router.dismissTo("/home");
  }

  return (
    <View style={{ flex: 1, backgroundColor: semanticColors["label-normal"] }}>
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <View style={{ flex: 1 }}>
          {confirmed.secureUrl ? (
            <Image
              source={{
                uri: getOptimizedImageUrl(confirmed.secureUrl, {
                  width: 750,
                }),
              }}
              style={{ flex: 1 }}
              contentFit="cover"
            />
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "55%",
              backgroundColor: "rgba(13,15,20,0.55)",
            }}
          />
          <View
            style={{ position: "absolute", left: 24, right: 24, bottom: 24 }}
          >
            <ThemedText
              typography="caption-2-bold"
              style={{ color: "rgba(255,255,255,0.7)", marginBottom: 6 }}
            >
              {formatDate(confirmed.date)}
            </ThemedText>
            <ThemedText
              typography="title-3-bold"
              style={{ color: "#ffffff", marginBottom: 12 }}
            >
              {confirmed.target.title}
            </ThemedText>
            <View style={{ flexDirection: "row", gap: 24 }}>
              {measureEntries.map(({ key, label, format }) => (
                <View key={key}>
                  <ThemedText
                    typography="title-2-bold"
                    style={{ color: "#ffffff" }}
                  >
                    {format(confirmed.measures[key]!)}
                  </ThemedText>
                  <ThemedText
                    typography="caption-2-regular"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    {label}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={{
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              height: 48,
              paddingHorizontal: 16,
              borderRadius: 999,
              backgroundColor: semanticColors["label-normal"],
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.24,
              shadowRadius: 20,
              elevation: 6,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.16)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="checkmark" size={13} color="#ffffff" />
            </View>
            <ThemedText typography="body-3-bold" style={{ color: "#ffffff" }}>
              운동 기록을 등록했어요!
            </ThemedText>
          </Animated.View>

          <ThemedText
            typography="body-3-medium"
            style={{
              textAlign: "center",
              color: "rgba(255,255,255,0.75)",
              marginBottom: 12,
            }}
          >
            오늘 기록에 담았어요
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            onPress={handleConfirm}
            style={({ pressed }) => pressed && { opacity: 0.85 }}
          >
            <View
              style={{
                height: 54,
                borderRadius: 14,
                backgroundColor: semanticColors["background-normal"],
                alignItems: "center",
                justifyContent: "center",
                marginBottom: Math.max(insets.bottom, 12),
              }}
            >
              <ThemedText typography="body-2-bold">확인</ThemedText>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
