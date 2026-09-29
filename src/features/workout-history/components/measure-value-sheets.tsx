import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PrimaryActionButton } from "@/features/workout-plan/components/workout-plan-screen-ui";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

const NUMBER_INPUT_STYLE = {
  flex: 1,
  fontFamily: "Pretendard-Bold",
  fontSize: 26,
  color: semanticColors["label-normal"],
  padding: 0,
};

// Figma 4501:36153 "시간 입력 시트" — 분/초를 따로 입력한다. 스텝퍼의 5분
// 단위와 달리, 실제 기록은 초 단위까지 남아있어 그 정밀도를 유지해야 한다.
export function TimeValueInputSheet({
  minutes,
  seconds,
  minimumSeconds,
  maximumSeconds,
  onClose,
  onConfirm,
}: {
  minutes: number;
  seconds: number;
  // 주어지면 합계(초)가 이 범위를 벗어날 때 확인 버튼을 막는다.
  minimumSeconds?: number;
  maximumSeconds?: number;
  onClose: () => void;
  onConfirm: (minutes: number, seconds: number) => void;
}) {
  const [minuteText, setMinuteText] = useState(String(minutes));
  const [secondText, setSecondText] = useState(String(seconds));
  const keyboardHeight = useKeyboardHeight();
  // 입력값을 0/59로 끌어다 맞추지 않는다 — number-pad여도 붙여넣기 등으로
  // 소수·음수·문자가 들어올 수 있으니, 입력 그대로가 유효할 때만 확인을
  // 허용한다. 빈 칸은 Number("")가 0이라 0으로 본다.
  const nextMinutes = Number(minuteText);
  const nextSeconds = Number(secondText);
  const totalSeconds = nextMinutes * 60 + nextSeconds;
  const isValid =
    Number.isInteger(nextMinutes) &&
    nextMinutes >= 0 &&
    Number.isInteger(nextSeconds) &&
    nextSeconds >= 0 &&
    nextSeconds <= 59 &&
    (minimumSeconds == null || totalSeconds >= minimumSeconds) &&
    (maximumSeconds == null || totalSeconds <= maximumSeconds);

  return (
    <BottomSheet
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
          disabled={!isValid}
          label="확인"
          onPress={() => {
            if (!isValid) return;
            onConfirm(nextMinutes, nextSeconds);
          }}
        />
      </View>
    </BottomSheet>
  );
}

// Figma 4501:36156/36221/36286 "거리/횟수/세트 입력 시트" — 값 하나를 직접
// 입력한다. quickAddAmounts가 있으면(거리) 현재 입력값에 더해주는 칩을 보여준다.
export function NumberValueInputSheet({
  title,
  unit,
  initialValue,
  minimum,
  maximum,
  integerOnly = false,
  quickAddAmounts,
  onClose,
  onConfirm,
}: {
  title: string;
  unit: string;
  initialValue: number;
  // 주어지면 입력값이 이 범위를 벗어나거나(integerOnly면) 정수가 아닐 때
  // 확인 버튼을 막는다.
  minimum?: number;
  maximum?: number;
  integerOnly?: boolean;
  quickAddAmounts?: number[];
  onClose: () => void;
  onConfirm: (value: number) => void;
}) {
  const [text, setText] = useState(String(initialValue));
  const keyboardHeight = useKeyboardHeight();
  const nextValue = Math.max(0, Number(text) || 0);
  const isValid =
    (minimum == null || nextValue >= minimum) &&
    (maximum == null || nextValue <= maximum) &&
    (!integerOnly || Number.isInteger(nextValue));

  return (
    <BottomSheet
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
          disabled={!isValid}
          label="확인"
          onPress={() => {
            if (!isValid) return;
            onConfirm(nextValue);
          }}
        />
      </View>
    </BottomSheet>
  );
}
