import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { primitiveColors } from "@/constants/tokens";

const BOT_AVATAR = require("@/assets/chat/bot-avatar.png");

type ChatAvatarProps = {
  size?: number;
  imageUri?: string;
};

// 봇 마스코트(찌뿌둥) 아바타 — imageUri가 주어지면 그 이미지로 대체한다.
export function ChatAvatar({ size = 36, imageUri }: ChatAvatarProps) {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={imageUri ? { uri: imageUri } : BOT_AVATAR}
        style={containerStyle}
        contentFit="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: primitiveColors.orange["400"],
    justifyContent: "center",
    overflow: "hidden",
  },
});
