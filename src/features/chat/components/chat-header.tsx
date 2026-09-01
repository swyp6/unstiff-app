import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AI_NAME } from "@/features/chat/constants";

import { ChatAvatar } from "./chat-avatar";

// 탭 루트 화면이라 뒤로가기 버튼은 없음 — SettingsHeader와 높이/여백 컨벤션만 맞춘다.
export function ChatHeader() {
  return (
    <View style={styles.header}>
      <ChatAvatar size={36} />
      <ThemedText style={styles.name} typography="heading-1-medium">
        {AI_NAME}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    height: 72,
    paddingHorizontal: 24,
  },
  name: {
    marginTop: 1,
  },
});
