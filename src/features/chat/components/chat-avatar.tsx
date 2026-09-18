import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { primitiveColors } from "@/constants/tokens";

const BOT_AVATAR = require("@/assets/chat/bot-avatar.png");

// Figma(Avatar / Bot, 36): 원 중앙의 32×26 박스 안에서 원본(image 3 = 이 PNG와
// 동일 파일)이 133.64%×161.54%로 확대되고 좌우 반전(-scale-y-100 + rotate-180)돼
// 있다. 36 기준 비율로 들고 있어 size가 달라도 같은 구도로 그려진다.
const BOT_IMAGE_WIDTH_RATIO = (32 * 1.3364) / 36;
const BOT_IMAGE_HEIGHT_RATIO = (26 * 1.6154) / 36;

type ChatAvatarProps = {
  size?: number;
  imageUri?: string;
};

// 봇 마스코트(찌뿌둥) 아바타 — imageUri가 주어지면 그 이미지로 대체한다. 반전은
// 번들 마스코트에만 적용한다(외부 이미지는 원본 방향 그대로).
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
          contentFit="cover"
          source={{ uri: imageUri }}
          style={containerStyle}
        />
      ) : (
        <Image
          contentFit="fill"
          source={BOT_AVATAR}
          style={{
            height: size * BOT_IMAGE_HEIGHT_RATIO,
            transform: [{ scaleX: -1 }],
            width: size * BOT_IMAGE_WIDTH_RATIO,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // boxShadow(CSS Box Shadow, RN 0.80+)는 iOS shadow*/Android elevation과
  // 달리 두 플랫폼에서 대칭으로 그려지고, 같은 뷰의 overflow: hidden에도
  // 잘리지 않는다 — 그림자 전용 wrapper 뷰가 더 필요 없다.
  container: {
    alignItems: "center",
    backgroundColor: primitiveColors.orange["400"],
    justifyContent: "center",
    overflow: "hidden",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.04)",
  },
});
