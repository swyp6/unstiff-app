import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

type ChatHeaderProps = {
  // 가장 최근 메시지의 시각 — 아직 대화가 시작되지 않았으면 생략한다.
  subtitle?: string;
};

// 탭 루트 화면이라 뒤로가기 버튼은 없음 — 제목 아래에 마지막 대화 시각만 보여준다.
export function ChatHeader({ subtitle }: ChatHeaderProps) {
  return (
    <View style={styles.header}>
      <ThemedText typography="body-2-bold">대화</ThemedText>
      {!!subtitle && (
        <ThemedText style={styles.subtitle} typography="caption-2-regular">
          {subtitle}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    borderBottomColor: semanticColors["line-normal"],
    borderBottomWidth: 1,
    gap: 2,
    height: 56,
    justifyContent: "center",
  },
  subtitle: {
    color: semanticColors["label-disabled"],
  },
});
