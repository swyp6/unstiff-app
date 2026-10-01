import Ionicons from "@expo/vector-icons/Ionicons";
import { TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import { SectionLabel } from "@/features/workout-plan/components/workout-plan-screen-ui";

// 운동 추가하기 시트(workout-plan-edit-sheet.tsx)의 한 줄 메모와 동일한 길이.
// 서버 WorkoutHistoryCreate/UpdateRequest의 memo @Size(max = 50)와 같다.
export const RECORD_MEMO_MAX_LENGTH = 50;

export function isRecordMemoTooLong(memo: string) {
  return memo.length > RECORD_MEMO_MAX_LENGTH;
}

// "한 줄 기록" 입력 — 신규 기록(record-editor-screen.tsx·manual-record.tsx)과
// 기록 수정 시트(workout-history-edit-sheet.tsx)가 같은 글자수 제한·오류
// 표시를 쓰도록 한 군데에 둔다. maxLength로 입력을 자르지 않고, 넘치면 빨간
// 테두리·안내 문구로 알리고 호출부가 isRecordMemoTooLong으로 저장을 막는다.
export function RecordMemoField({
  value,
  onChangeText,
  onFocus,
  onBlur,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const isMemoTooLong = isRecordMemoTooLong(value);

  return (
    <View>
      <SectionLabel
        optional
        trailing={
          <ThemedText
            typography="caption-1-regular"
            style={{
              color: isMemoTooLong
                ? primitiveColors.red["6"]
                : semanticColors["label-disabled"],
            }}
          >
            {value.length} / {RECORD_MEMO_MAX_LENGTH}
          </ThemedText>
        }
      >
        한 줄 기록
      </SectionLabel>
      <TextInput
        accessibilityLabel="한 줄 기록"
        multiline
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder="기록을 남겨보세요"
        placeholderTextColor={semanticColors["label-disabled"]}
        returnKeyType="done"
        style={{
          backgroundColor: semanticColors["fill-subtle"],
          borderColor: isMemoTooLong ? primitiveColors.red["6"] : "transparent",
          borderRadius: 12,
          borderWidth: 1,
          color: semanticColors["label-normal"],
          fontFamily: "Pretendard-Medium",
          fontSize: 16,
          lineHeight: 24,
          minHeight: 50,
          paddingBottom: 14,
          paddingHorizontal: 16,
          paddingTop: 10,
          textAlignVertical: "top",
        }}
        value={value}
      />
      {isMemoTooLong && (
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            gap: 4,
            marginTop: 6,
          }}
        >
          <Ionicons
            color={primitiveColors.red["6"]}
            name="alert-circle"
            size={14}
          />
          <ThemedText
            typography="caption-1-regular"
            style={{ color: primitiveColors.red["6"] }}
          >
            {RECORD_MEMO_MAX_LENGTH}자까지 쓸 수 있어요
          </ThemedText>
        </View>
      )}
    </View>
  );
}
