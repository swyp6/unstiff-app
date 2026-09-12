import { Image } from "expo-image";
import { View } from "react-native";

import { semanticColors } from "@/constants/tokens";
import {
  type AvatarSelection,
  getAvatarPresetImage,
} from "@/features/mypage/avatar-presets";

type AvatarCircleProps = {
  avatar: AvatarSelection;
  size: number;
};

export function AvatarCircle({ avatar, size }: AvatarCircleProps) {
  const circleStyle = {
    borderRadius: size / 2,
    height: size,
    overflow: "hidden" as const,
    width: size,
  };

  if (avatar?.type === "photo") {
    return (
      <Image
        contentFit="cover"
        source={{ uri: avatar.uri }}
        style={circleStyle}
      />
    );
  }

  const presetImage =
    avatar?.type === "preset"
      ? getAvatarPresetImage(avatar.presetId)
      : undefined;

  if (presetImage) {
    return (
      <Image contentFit="cover" source={presetImage} style={circleStyle} />
    );
  }

  return (
    <View
      style={{
        ...circleStyle,
        alignItems: "center",
        backgroundColor: semanticColors["fill-strong"],
        justifyContent: "center",
      }}
    >
      <View
        style={{
          backgroundColor: semanticColors["line-strong"],
          borderRadius: (size * 0.5) / 2,
          height: size * 0.5,
          width: size * 0.5,
        }}
      />
    </View>
  );
}
