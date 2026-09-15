import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import {
  primitiveColors,
  semanticColors,
  typography,
} from "@/constants/tokens";

// Figma Icon / Send: 44 원 안 24 래퍼, 그 안의 send-01 glyph가 18.75.
const SEND_GLYPH_SIZE = 18.75;

type ChatInputBarProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

// Figma Composer / Input Bar: px24 py12 gap8, 입력창 h44 r24 px16 charcoal/1
// body/2/regular, 전송 44 원 charcoal/12. 빈 입력/답변 대기 중에는 전송 동작만
// 막고 외형은 그대로 검정 — Figma가 placeholder 상태에서도 같은 색을 쓴다.
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
        style={[typography["body-2-regular"], styles.input]}
        value={text}
      />
      <Pressable
        accessibilityLabel="메시지 보내기"
        accessibilityRole="button"
        disabled={!canSend}
        hitSlop={8}
        onPress={handleSend}
        style={styles.sendButton}
      >
        <View style={styles.sendIcon}>
          <Image
            contentFit="contain"
            source={require("@/assets/chat/send-01.svg")}
            style={styles.sendGlyph}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  input: {
    backgroundColor: primitiveColors.charcoal["1"],
    borderRadius: 24,
    color: semanticColors["label-normal"],
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    paddingBottom: 13,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: primitiveColors.charcoal["12"],
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  sendIcon: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  sendGlyph: {
    height: SEND_GLYPH_SIZE,
    width: SEND_GLYPH_SIZE,
  },
});
