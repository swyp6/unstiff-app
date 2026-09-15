import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

// 오늘 대화가 끝난 뒤 composer 자리에 놓는 잠금 바(Figma DisabledInput / Daily
// Locked): h68, fill-subtle, 위 1px line-normal, 가운데 body/2/regular
// label-disabled. 아래 12는 Figma Bottom Area의 탭바와의 간격.
export function ChatLockedBar() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <ThemedText style={styles.label} typography="body-2-regular">
          오늘의 대화가 끝났어요
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingBottom: 12,
  },
  bar: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-subtle"],
    borderTopColor: semanticColors["line-normal"],
    borderTopWidth: 1,
    height: 68,
    justifyContent: "center",
  },
  label: {
    color: semanticColors["label-disabled"],
  },
});
