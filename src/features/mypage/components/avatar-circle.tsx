import { Image } from "expo-image";
import { View } from "react-native";

import { semanticColors } from "@/constants/tokens";
import {
  type AvatarSelection,
  getAvatarPresetColor,
} from "@/features/mypage/avatar-presets";

type AvatarCircleProps = {
  avatar: AvatarSelection;
  size: number;
};

export function AvatarCircle({ avatar, size }: AvatarCircleProps) {
  if (avatar?.type === "photo") {
    return (
      <Image
        contentFit="cover"
        source={{ uri: avatar.uri }}
        style={{ height: size, width: size, borderRadius: size / 2 }}
      />
    );
  }

  const presetColor =
    avatar?.type === "preset"
      ? getAvatarPresetColor(avatar.presetId)
      : undefined;

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: presetColor ?? semanticColors["fill-strong"],
        borderRadius: size / 2,
        height: size,
        justifyContent: "center",
        width: size,
      }}
    >
      {!presetColor && (
        <View
          style={{
            backgroundColor: semanticColors["line-strong"],
            borderRadius: (size * 0.5) / 2,
            height: size * 0.5,
            width: size * 0.5,
          }}
        />
      )}
    </View>
  );
}
