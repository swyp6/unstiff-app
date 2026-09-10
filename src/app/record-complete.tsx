import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReanimatedAnimated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";
import {
  apiMetersToKm,
  apiSecondsToMinutes,
} from "@/features/workout-plan/measure-units";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";

// confirmed.measures는 서버로 보낸 그대로의 API 단위(duration=초, distance=m)다.
// 사용자에게는 앱의 UI 단위(분/km)로 되돌려 보여준다 — 변환을 빠뜨리면 20분이
// 1200분, 3km가 3000km로 보인다.
const MEASURE_DISPLAY: {
  key: "duration" | "distance" | "count" | "sets";
  label: string;
  format: (apiValue: number) => string;
}[] = [
  {
    key: "duration",
    label: "시간",
    format: (v) => `${apiSecondsToMinutes(v)}분`,
  },
  {
    key: "distance",
    label: "거리",
    format: (v) => `${apiMetersToKm(v).toFixed(1)}km`,
  },
  { key: "count", label: "횟수", format: (v) => `${v}회` },
  { key: "sets", label: "세트", format: (v) => `${v}세트` },
];

// Figma 4173:30847 기준(375x812) 사진 영역의 top/height와, 그 안에서 각
// 요소가 차지하는 상대 위치 — 사진 영역 자체는 flex:1(디바이스마다 실제
// 높이가 다르다)이라, 절대 px 대신 이 비율로 앵커링해 같은 시각적 위치가
// 나오게 한다.
const PHOTO_TOP_FIGMA = 60;
const PHOTO_HEIGHT_FIGMA = 620;
// 그라데이션: top 380 ~ 사진 하단(680)까지, 즉 사진 높이의 아래쪽 48.4%.
const GRADIENT_HEIGHT_PERCENT = `${((PHOTO_TOP_FIGMA + PHOTO_HEIGHT_FIGMA - 380) / PHOTO_HEIGHT_FIGMA) * 100}%`;
const DATE_TOP_PERCENT = `${((470 - PHOTO_TOP_FIGMA) / PHOTO_HEIGHT_FIGMA) * 100}%`;
const TITLE_TOP_PERCENT = `${((490 - PHOTO_TOP_FIGMA) / PHOTO_HEIGHT_FIGMA) * 100}%`;
const MEASURES_TOP_PERCENT = `${((526 - PHOTO_TOP_FIGMA) / PHOTO_HEIGHT_FIGMA) * 100}%`;
// 토스트는 사진 하단에서 17px 위(사진 bottom 680 - 토스트 bottom 663)에
// 뜬다 — 디바이스별 사진 높이가 달라도 "사진이 끝나기 직전" 위치가
// 유지되도록 사진 영역의 bottom 기준으로 고정 오프셋을 준다.
const TOAST_BOTTOM_OFFSET = 17;

const TOAST_ENTER_MS = 220;
const TOAST_HOLD_MS = 1500;
const TOAST_EXIT_MS = 190;

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
}

// Figma 4173:30847 "[완료] -> 홈으로" — POST /api/v1/workouts 성공 직후에만
// 진입한다(record-editor.tsx 참고). confirmed는 저장에 실제 사용한 값의
// 스냅샷이라, 이 화면이 떠 있는 동안 draft(photo/target)가 초기화돼도
// 표시값에는 영향이 없다.
export default function RecordCompleteScreen() {
  const insets = useSafeAreaInsets();
  const confirmed = useRecordFlowStore((state) => state.confirmed);
  const reset = useRecordFlowStore((state) => state.reset);

  // 토스트는 등장 → 일정 시간 유지 → 사라짐을 한 번만 재생한다. absolute라
  // 사라져도 아래 "오늘 기록에 담았어요"/확인 버튼 레이아웃은 전혀 영향받지
  // 않는다 — 조건부 렌더(false가 되면 exiting 애니메이션 후 실제로
  // unmount)만으로 전체 lifecycle을 표현한다.
  const [isToastVisible, setIsToastVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsToastVisible(false), TOAST_HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

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
              height: GRADIENT_HEIGHT_PERCENT,
            }}
          />

          <ThemedText
            typography="caption-2-bold"
            style={{
              position: "absolute",
              left: 24,
              top: DATE_TOP_PERCENT,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {formatDate(confirmed.date)}
          </ThemedText>
          <ThemedText
            typography="title-3-bold"
            style={{
              position: "absolute",
              left: 24,
              top: TITLE_TOP_PERCENT,
              color: "#ffffff",
            }}
          >
            {confirmed.target.title}
          </ThemedText>
          <View
            style={{
              position: "absolute",
              left: 24,
              top: MEASURES_TOP_PERCENT,
              flexDirection: "row",
              gap: 24,
            }}
          >
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

          {isToastVisible && (
            <ReanimatedAnimated.View
              entering={FadeIn.duration(TOAST_ENTER_MS)}
              exiting={FadeOut.duration(TOAST_EXIT_MS)}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: TOAST_BOTTOM_OFFSET,
                alignItems: "center",
              }}
            >
              <View
                style={{
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
                }}
              >
                <View
                  style={{
                    width: 27,
                    height: 27,
                    borderRadius: 999,
                    backgroundColor: "#ffffff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={semanticColors["label-normal"]}
                  />
                </View>
                <ThemedText
                  typography="body-3-bold"
                  style={{ color: "#ffffff" }}
                >
                  운동 기록을 등록했어요!
                </ThemedText>
              </View>
            </ReanimatedAnimated.View>
          )}
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
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
