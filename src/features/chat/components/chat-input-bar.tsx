import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { primitiveColors, semanticColors } from "@/constants/tokens";

type ChatInputBarProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function ChatInputBar({ onSend, disabled }: ChatInputBarProps) {
  const [text, setText] = useState("");
  const canSend = text.trim().length > 0 && !disabled;

  function handleSend() {
    if (!canSend) return;
    onSend(text);
    setText("");
  }

  return (
    <View style={styles.container}>
      <TextInput
        multiline
        editable={!disabled}
        maxLength={1000}
        onChangeText={setText}
        placeholder="메시지를 입력하세요"
        placeholderTextColor={semanticColors["label-disabled"]}
        style={styles.input}
        value={text}
      />
      <Pressable
        accessibilityLabel="메시지 보내기"
        accessibilityRole="button"
        disabled={!canSend}
        hitSlop={8}
        onPress={handleSend}
        style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
      >
        <Ionicons
          color={semanticColors["label-inverse"]}
          name="send"
          size={18}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  input: {
    backgroundColor: primitiveColors.charcoal["1"],
    borderRadius: 24,
    color: semanticColors["label-normal"],
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: primitiveColors.charcoal["12"],
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
