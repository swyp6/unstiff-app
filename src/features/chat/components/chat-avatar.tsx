import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { semanticColors } from "@/constants/tokens";

type ChatAvatarProps = {
  size?: number;
  imageUri?: string;
};

// 실제 캐릭터 이미지가 준비되기 전까지의 기본 프로필 아이콘 placeholder —
// imageUri가 주어지면 그대로 원형 이미지로 렌더링된다.
export function ChatAvatar({ size = 36, imageUri }: ChatAvatarProps) {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={containerStyle}
          contentFit="cover"
        />
      ) : (
        <Ionicons
          color={semanticColors["label-subtle"]}
          name="person"
          size={size * 0.55}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-subtle"],
    justifyContent: "center",
    overflow: "hidden",
  },
});
