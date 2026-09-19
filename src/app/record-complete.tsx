import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReanimatedAnimated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { RecordActionsMenu } from "@/components/ui/record-actions-menu";
import { RecordScreenHeader } from "@/components/ui/record-screen-header";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";
import { getWorkoutHistoryById } from "@/features/workout-history/api";
import { WorkoutHistoryEditSheet } from "@/features/workout-history/components/workout-history-edit-sheet";
import { formatMeasureValue } from "@/features/workout-history/model";
import type { WorkoutHistoryResponse } from "@/features/workout-history/types";
import { usePhotoRecordActions } from "@/features/workout-history/use-photo-record-actions";
import type {
  ExerciseMeasuresDto,
  IntensityDto,
} from "@/features/workout-plan/types";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";

const INTENSITY_LABELS: Record<IntensityDto, string> = {
  LIGHT: "가볍게",
  MODERATE: "보통",
  HARD: "빡세게",
};

const MEASURE_LABELS: Record<keyof ExerciseMeasuresDto, string> = {
  duration: "시간",
  distance: "거리",
  count: "횟수",
  sets: "세트",
};

// day-record.tsx "통계 그리드"와 같은 순서 — 강도 단독 행(있으면) 다음에
// 시간·거리, 횟수·세트를 각각 한 행으로 묶는다.
const MEASURE_ROW_PAIRS: (keyof ExerciseMeasuresDto)[][] = [
  ["duration", "distance"],
  ["count", "sets"],
];

// Figma 4305:45365 기준(375x824) 사진 영역의 top/height 비율 — 사진 영역
// 자체는 flex:1(디바이스마다 실제 높이가 다르다)이라, 절대 px 대신 이
// 비율로 앵커링해 같은 시각적 위치가 나오게 한다.
const PHOTO_TOP_FIGMA = 92;
const PHOTO_HEIGHT_FIGMA = 588;
// 그라데이션: top 380 ~ 사진 하단(680)까지, 즉 사진 높이의 아래쪽 51%.
const GRADIENT_HEIGHT_PERCENT = `${((PHOTO_TOP_FIGMA + PHOTO_HEIGHT_FIGMA - 380) / PHOTO_HEIGHT_FIGMA) * 100}%`;
// 통계 그리드/토스트는 사진 "하단"에서 고정 px만큼 떨어진 위치라(Figma
// bottom 앵커), 굳이 비율로 바꾸지 않고 그대로 쓴다 — position:absolute의
// bottom은 컨테이너 실제 높이에 상관없이 항상 그 가장자리 기준으로 계산된다.
const STATS_BOTTOM_OFFSET = 28;
const TOAST_BOTTOM_OFFSET = 15;

const TOAST_ENTER_MS = 220;
const TOAST_HOLD_MS = 1500;
const TOAST_EXIT_MS = 190;

// "사진 없이 기록하기"로 사진이 없을 때 사진 자리에 대신 보여주는 스탬프.
const STAMP_IMAGE = require("@/assets/home/stamp.png");

function formatHeaderDate(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// Figma 4305:45365 "[완료] -> 홈으로" — POST /api/v1/workouts 성공 직후에만
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

  // 점세개 메뉴(사진 저장/변경/기록 수정/사진 삭제)는 day-record.tsx와 같은
  // WorkoutHistoryResponse 모양이 있어야 동작한다 — confirmed 스냅샷엔
  // exerciseType/iconUrl 등이 없어서, 방금 저장한 기록을 id로 다시 읽어온다.
  // 로드되기 전까지는 화면 자체는 confirmed 값으로 바로 보여준다(아래
  // display* 값 참고).
  const [entry, setEntry] = useState<WorkoutHistoryResponse | null>(null);
  useEffect(() => {
    if (!confirmed) return;
    getWorkoutHistoryById(confirmed.id)
      .then(setEntry)
      .catch((error) => {
        console.error("Failed to load saved workout record", error);
      });
  }, [confirmed]);

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const {
    isPhotoActionPending,
    handleSavePhoto,
    handleChangePhoto,
    handleDeletePhoto,
  } = usePhotoRecordActions(entry, setEntry);

  if (!confirmed) return null;

  // entry가 로드된 뒤로는(수정/사진 변경이 반영되도록) entry를 우선한다 —
  // 로드 전까지는 confirmed 스냅샷을 그대로 보여준다.
  const displayImageUrl = entry ? entry.imageUrl : confirmed.secureUrl;
  const displayMeasures = entry ? entry.measures : confirmed.measures;
  const displayIntensity = entry ? entry.intensity : confirmed.intensity;

  const measureRows = MEASURE_ROW_PAIRS.map((pair) =>
    pair.filter((key) => displayMeasures[key] != null),
  ).filter((row) => row.length > 0);

  // 성공 흐름의 명시적 마무리: draft를 지운 뒤 dismissTo("/home")로
  // record-complete/record-editor/camera(및 standalone 경로의 capture 탭
  // nested stack에 남아있는 target)까지 전부 걷어내고 홈으로 이동한다.
  // 다른 화면(target 등)이 store 변화를 감시하다가 알아서 자신을
  // pop하는 방식은 쓰지 않는다 — 이 확인 동작 하나에서 끝까지 명시적으로
  // 처리한다. 헤더의 X도 같은 동작이다 — 이미 저장이 끝난 화면이라
  // "닫기"와 "선택 완료"가 다른 곳으로 갈 이유가 없다.
  function handleConfirm() {
    reset();
    router.dismissTo("/home");
  }

  return (
    <View style={{ flex: 1, backgroundColor: primitiveColors.charcoal["12"] }}>
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <RecordScreenHeader
          dateLabel={formatHeaderDate(confirmed.date)}
          onClose={handleConfirm}
          onMenuPress={() => setIsMenuVisible(true)}
          variant="dark"
        />

        <RecordActionsMenu
          hasPhoto={Boolean(displayImageUrl)}
          isPhotoActionPending={isPhotoActionPending || !entry}
          onChangePhoto={handleChangePhoto}
          onClose={() => setIsMenuVisible(false)}
          onDeletePhoto={() => setIsDeleteConfirmVisible(true)}
          onEditRecord={() => setIsEditSheetVisible(true)}
          onSavePhoto={handleSavePhoto}
          topOffset={insets.top + 52}
          visible={isMenuVisible}
        />

        <ConfirmModal
          cancelLabel="취소하기"
          confirmColor={semanticColors["status-negative-normal"]}
          confirmLabel="삭제하기"
          description="기록은 남고 스티커로 바뀌어요"
          onCancel={() => setIsDeleteConfirmVisible(false)}
          onConfirm={() => {
            setIsDeleteConfirmVisible(false);
            handleDeletePhoto();
          }}
          swapButtons
          title="사진을 삭제할까요?"
          visible={isDeleteConfirmVisible}
        />

        {entry && (
          <WorkoutHistoryEditSheet
            entry={entry}
            key={entry.id}
            onClose={() => setIsEditSheetVisible(false)}
            onSaved={setEntry}
            visible={isEditSheetVisible}
          />
        )}

        <View style={{ flex: 1 }}>
          {displayImageUrl ? (
            <Image
              source={{
                uri: getOptimizedImageUrl(displayImageUrl, {
                  width: 750,
                }),
              }}
              style={{ flex: 1 }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                backgroundColor: primitiveColors.charcoal["12"],
              }}
            >
              <Image
                source={STAMP_IMAGE}
                style={{ flex: 1 }}
                contentFit="cover"
              />
            </View>
          )}

          {displayImageUrl && (
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
          )}

          <View
            style={{
              position: "absolute",
              left: 24,
              bottom: STATS_BOTTOM_OFFSET,
              gap: 14,
            }}
          >
            {displayIntensity && (
              <View style={{ width: 100 }}>
                <ThemedText
                  typography="display-1-bold"
                  style={{ color: "#ffffff" }}
                >
                  {INTENSITY_LABELS[displayIntensity]}
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
                      {formatMeasureValue(key, displayMeasures[key]!)}
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
                  gap: 10,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderRadius: 999,
                  backgroundColor: primitiveColors.charcoal["11"],
                  shadowColor: "#001736",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.16,
                  shadowRadius: 24,
                  elevation: 6,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    backgroundColor: "#ffffff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="checkmark"
                    size={11}
                    color={primitiveColors.charcoal["11"]}
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
                borderRadius: 999,
                backgroundColor: primitiveColors.orange["500"],
                alignItems: "center",
                justifyContent: "center",
                marginBottom: Math.max(insets.bottom, 12),
              }}
            >
              <ThemedText typography="body-1-bold" style={{ color: "#ffffff" }}>
                선택 완료
              </ThemedText>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
