import { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { WorkoutPlanBottomSheet } from "@/features/workout-plan/components/workout-plan-bottom-sheet";
import { PrimaryActionButton } from "@/features/workout-plan/components/workout-plan-screen-ui";

const NUMBER_INPUT_STYLE = {
  flex: 1,
  fontFamily: "Pretendard-Bold",
  fontSize: 26,
  color: semanticColors["label-normal"],
  padding: 0,
};

// WorkoutPlanBottomSheet의 KeyboardAvoidingView는 시트 두 겹(메인 편집
// 시트 안에 이 값 입력 시트가 겹쳐 뜨는 구조)에서는 패딩 계산이 씹혀서
// 못 미덥다(workout-plan-detail-bottom-sheet.tsx와 동일한 이유) — 실제
// 키보드 높이를 직접 추적해서 그 아래 CTA 버튼이 가려지지 않게 한다.
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) =>
      setHeight(event.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

// Figma 4501:36153 "시간 입력 시트" — 분/초를 따로 입력한다. 스텝퍼의 5분
// 단위와 달리, 실제 기록은 초 단위까지 남아있어 그 정밀도를 유지해야 한다.
export function TimeValueInputSheet({
  minutes,
  seconds,
  onClose,
  onConfirm,
}: {
  minutes: number;
  seconds: number;
  onClose: () => void;
  onConfirm: (minutes: number, seconds: number) => void;
}) {
  const [minuteText, setMinuteText] = useState(String(minutes));
  const [secondText, setSecondText] = useState(String(seconds));
  const keyboardHeight = useKeyboardHeight();

  return (
    <WorkoutPlanBottomSheet
      embedded
      keyboardAvoiding={false}
      onClose={onClose}
      title="시간"
      visible
    >
      <View className="flex-row gap-2.5">
        <View className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-fill-subtle px-3 py-4">
          <TextInput
            keyboardType="number-pad"
            onChangeText={setMinuteText}
            style={NUMBER_INPUT_STYLE}
            textAlign="right"
            value={minuteText}
          />
          <ThemedText typography="body-2-medium" themeColor="textSecondary">
            분
          </ThemedText>
        </View>
        <View className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-fill-subtle px-3 py-4">
          <TextInput
            keyboardType="number-pad"
            onChangeText={setSecondText}
            style={NUMBER_INPUT_STYLE}
            textAlign="right"
            value={secondText}
          />
          <ThemedText typography="body-2-medium" themeColor="textSecondary">
            초
          </ThemedText>
        </View>
      </View>
      <View style={{ paddingTop: 20, paddingBottom: keyboardHeight }}>
        <PrimaryActionButton
          label="확인"
          onPress={() =>
            onConfirm(
              Number(minuteText) || 0,
              Math.min(59, Number(secondText) || 0),
            )
          }
        />
      </View>
    </WorkoutPlanBottomSheet>
  );
}

// Figma 4501:36156/36221/36286 "거리/횟수/세트 입력 시트" — 값 하나를 직접
// 입력한다. quickAddAmounts가 있으면(거리) 현재 입력값에 더해주는 칩을 보여준다.
export function NumberValueInputSheet({
  title,
  unit,
  initialValue,
  quickAddAmounts,
  onClose,
  onConfirm,
}: {
  title: string;
  unit: string;
  initialValue: number;
  quickAddAmounts?: number[];
  onClose: () => void;
  onConfirm: (value: number) => void;
}) {
  const [text, setText] = useState(String(initialValue));
  const keyboardHeight = useKeyboardHeight();

  return (
    <WorkoutPlanBottomSheet
      embedded
      keyboardAvoiding={false}
      onClose={onClose}
      title={title}
      visible
    >
      <View className="flex-row items-center justify-center gap-2 rounded-xl bg-fill-subtle px-4 py-4">
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setText}
          style={[NUMBER_INPUT_STYLE, { flex: 0, minWidth: 40 }]}
          textAlign="right"
          value={text}
        />
        <ThemedText typography="body-2-medium" themeColor="textSecondary">
          {unit}
        </ThemedText>
      </View>

      {quickAddAmounts && (
        <View className="flex-row gap-2 pt-3">
          {quickAddAmounts.map((amount) => (
            <Pressable
              accessibilityRole="button"
              className="rounded-full border border-line-normal px-[19px] py-2"
              key={amount}
              onPress={() =>
                setText(
                  String(
                    Math.round(((Number(text) || 0) + amount) * 100) / 100,
                  ),
                )
              }
            >
              <ThemedText typography="body-3-bold">
                +{amount}
                {unit}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ paddingTop: 20, paddingBottom: keyboardHeight }}>
        <PrimaryActionButton
          label="확인"
          onPress={() => onConfirm(Number(text) || 0)}
        />
      </View>
    </WorkoutPlanBottomSheet>
  );
}
