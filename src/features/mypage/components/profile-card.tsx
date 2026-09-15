import { Image } from "expo-image";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";
import { AvatarCircle } from "@/features/mypage/components/avatar-circle";
import type { AvatarSelection } from "@/features/mypage/avatar-presets";

type ProfileCardProps = {
  // null until the user has completed profile setup (server never received
  // a nickname yet) — shown as a plain placeholder, never a fake name.
  nickname: string | null;
  avatar: AvatarSelection;
  onEditPress?: () => void;
};

// Figma "Profile Card" (3840:18708) — 375×176 white card. 커버 84, 본문은
// 커버 아래 pt 36에 닉네임(16/22 Bold), 아바타 72×72(4px 흰 테두리 + 64
// 이미지)를 top 38에 가운데 absolute, 프로필 수정 터치 48×48을 아바타 프레임
// 기준 (39, 26)에 absolute(카드 기준 x191/y64), 그 가운데 24 아이콘.
const CARD_HEIGHT = 176;
const COVER_HEIGHT = 84;
const BODY_PADDING_TOP = 36;
const AVATAR_OUTER_SIZE = 72;
const AVATAR_BORDER_WIDTH = 4;
const AVATAR_IMAGE_SIZE = AVATAR_OUTER_SIZE - AVATAR_BORDER_WIDTH * 2;
const AVATAR_TOP = 38;
const EDIT_TOUCH_SIZE = 48;
const EDIT_TOUCH_LEFT = 191 - 152; // 카드 x191 − 아바타 x152
const EDIT_TOUCH_TOP = 64 - 38; // 카드 y64 − 아바타 y38
const EDIT_ICON_SIZE = 24;

export function ProfileCard({
  nickname,
  avatar,
  onEditPress,
}: ProfileCardProps) {
  return (
    <View
      className="items-center overflow-hidden bg-background-normal"
      style={{ height: CARD_HEIGHT }}
    >
      <View className="w-full bg-orange-500" style={{ height: COVER_HEIGHT }} />
      <View
        className="w-full items-center px-[16px]"
        style={{ paddingTop: BODY_PADDING_TOP }}
      >
        <ThemedText
          style={{ color: primitiveColors.charcoal["11"] }}
          typography="body-1-bold"
        >
          {nickname ?? "닉네임을 입력해주세요"}
        </ThemedText>
      </View>
      <View
        className="absolute"
        style={{
          height: AVATAR_OUTER_SIZE,
          top: AVATAR_TOP,
          width: AVATAR_OUTER_SIZE,
        }}
      >
        <View
          className="overflow-hidden rounded-full border-background-normal bg-background-normal"
          style={{
            borderWidth: AVATAR_BORDER_WIDTH,
            height: AVATAR_OUTER_SIZE,
            width: AVATAR_OUTER_SIZE,
          }}
        >
          <AvatarCircle avatar={avatar} size={AVATAR_IMAGE_SIZE} />
        </View>
        <Pressable
          accessibilityLabel="프로필 사진 수정"
          accessibilityRole="button"
          className="absolute items-center justify-center"
          onPress={onEditPress}
          style={{
            height: EDIT_TOUCH_SIZE,
            left: EDIT_TOUCH_LEFT,
            top: EDIT_TOUCH_TOP,
            width: EDIT_TOUCH_SIZE,
          }}
        >
          <Image
            contentFit="contain"
            source={require("@/assets/mypage/icon-profile-edit.svg")}
            style={{ height: EDIT_ICON_SIZE, width: EDIT_ICON_SIZE }}
          />
        </Pressable>
      </View>
    </View>
  );
}
