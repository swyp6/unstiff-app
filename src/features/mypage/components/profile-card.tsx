import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { AvatarCircle } from "@/features/mypage/components/avatar-circle";
import type { AvatarSelection } from "@/features/mypage/avatar-presets";

type ProfileCardProps = {
  nickname: string;
  avatar: AvatarSelection;
  onEditPress?: () => void;
};

const AVATAR_SIZE = 56;
const COVER_HEIGHT = 64;

export function ProfileCard({
  nickname,
  avatar,
  onEditPress,
}: ProfileCardProps) {
  return (
    <View className="overflow-hidden rounded-default border border-line-subtle bg-background-normal">
      <View className="bg-fill-normal" style={{ height: COVER_HEIGHT }} />
      <View
        className="items-center pb-4"
        style={{ marginTop: -AVATAR_SIZE / 2 }}
      >
        <View>
          <View
            className="overflow-hidden rounded-full border-2 border-background-normal"
            style={{ height: AVATAR_SIZE, width: AVATAR_SIZE }}
          >
            <AvatarCircle avatar={avatar} size={AVATAR_SIZE} />
          </View>
          <Pressable
            accessibilityLabel="프로필 사진 수정"
            accessibilityRole="button"
            className="absolute -right-1 bottom-0 items-center justify-center rounded-full border-2 border-background-normal bg-background-normal"
            hitSlop={8}
            onPress={onEditPress}
            style={{ height: 24, width: 24 }}
          >
            <Ionicons
              color={semanticColors["label-normal"]}
              name="pencil"
              size={13}
            />
          </Pressable>
        </View>
        <ThemedText className="mt-2" typography="body-1-bold">
          {nickname}
        </ThemedText>
      </View>
    </View>
  );
}
