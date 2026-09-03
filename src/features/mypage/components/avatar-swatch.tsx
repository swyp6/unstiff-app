import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";

import { semanticColors } from "@/constants/tokens";
import type { AvatarOption } from "@/features/mypage/avatar-options";

type AvatarSwatchProps = {
  option: AvatarOption;
  size: number;
};

export function AvatarSwatch({ option, size }: AvatarSwatchProps) {
  if (option.kind === "upload") {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: semanticColors["fill-normal"],
          borderRadius: size / 2,
          height: size,
          justifyContent: "center",
          width: size,
        }}
      >
        <Ionicons
          color={semanticColors["label-subtle"]}
          name="camera-outline"
          size={size * 0.4}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: option.color,
        borderRadius: size / 2,
        height: size,
        width: size,
      }}
    />
  );
}
