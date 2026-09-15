import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";

type ChatRetryActionProps = {
  onPress: () => void;
  disabled?: boolean;
};

// 질문 로드 실패(B-02)와 답변 저장 실패(B-08) 말풍선 아래 가운데에 놓는
// "다시 시도". Figma NavButtons: 화면 폭 컨테이너 안 103×36 pill, charcoal/1
// 배경에 charcoal/5 caption/1/medium — 비활성처럼 보이지만 실제 버튼이다.
export function ChatRetryAction({ onPress, disabled }: ChatRetryActionProps) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="다시 시도"
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={styles.button}
      >
        <ThemedText style={styles.label} typography="caption-1-medium">
          다시 시도
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    height: 60,
    justifyContent: "center",
  },
  button: {
    alignItems: "center",
    backgroundColor: primitiveColors.charcoal["1"],
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 20,
    width: 103,
  },
  label: {
    color: primitiveColors.charcoal["5"],
  },
});
