import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { signupColors } from "@/features/auth/signup-ui";

// Figma "프로필 아바타" — 375 프레임(4501:44758)은 120, 402 프레임(4501:44960
// / 4501:44980 / 4501:44993)은 152로, 402 쪽 수치(배지 50.667, 테두리 3.8,
// 아이콘 25.333, 사람 아이콘 81.067x88.436)가 전부 375 쪽(40 / 3 / 20)의
// 정확히 152/120배라 120 기준 수치 하나를 두고 비율로 키운다.
const BASE_AVATAR_SIZE = 120;
const BASE_BADGE_SIZE = 40;
const BASE_BADGE_BORDER_WIDTH = 3;
const BASE_CAMERA_ICON_SIZE = 20;
// 배지는 아바타 우하단에서 오른쪽으로 2, 위로 4 들어간 자리(left 82, top 76).
const BASE_BADGE_LEFT = 82;
const BASE_BADGE_TOP = 76;
// 사람 아이콘은 아바타 가운데(35.47 + 81.067/2 = 76 = 152/2).
const BASE_PERSON_WIDTH = 64;
const BASE_PERSON_HEIGHT = (88.4364 / 81.0667) * BASE_PERSON_WIDTH;

export const AVATAR_SIZE_COMPACT = BASE_AVATAR_SIZE;
export const AVATAR_SIZE_WIDE = 152;

type ProfileAvatarPreviewProps = {
  imageUri?: string | null;
  size: number;
  // profile-photo에는 카메라 배지가 있고 signup-complete(4501:44993)에는 없다.
  showCameraBadge?: boolean;
};

// Purely presentational — callers wrap this in a Pressable (profile-photo)
// or leave it static (signup-complete) depending on whether re-picking a
// photo should be possible on that screen.
export function ProfileAvatarPreview({
  imageUri,
  size,
  showCameraBadge = false,
}: ProfileAvatarPreviewProps) {
  const scale = size / BASE_AVATAR_SIZE;
  const badgeSize = BASE_BADGE_SIZE * scale;
  const cameraIconSize = BASE_CAMERA_ICON_SIZE * scale;

  return (
    <View style={{ height: size, width: size }}>
      <View style={[styles.avatar, { borderRadius: size / 2 }]}>
        {imageUri ? (
          <Image
            contentFit="cover"
            source={{ uri: imageUri }}
            style={styles.photo}
          />
        ) : (
          <Image
            contentFit="contain"
            source={require("@/assets/signup/person-placeholder.svg")}
            style={{
              height: BASE_PERSON_HEIGHT * scale,
              width: BASE_PERSON_WIDTH * scale,
            }}
          />
        )}
      </View>
      {showCameraBadge && (
        <View
          style={[
            styles.badge,
            {
              borderRadius: badgeSize / 2,
              borderWidth: BASE_BADGE_BORDER_WIDTH * scale,
              height: badgeSize,
              left: BASE_BADGE_LEFT * scale,
              top: BASE_BADGE_TOP * scale,
              width: badgeSize,
            },
          ]}
        >
          <Image
            contentFit="contain"
            source={require("@/assets/signup/icon-camera.svg")}
            style={{ height: cameraIconSize, width: cameraIconSize }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: signupColors.fill,
    height: "100%",
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
  },
  photo: {
    height: "100%",
    width: "100%",
  },
  badge: {
    alignItems: "center",
    backgroundColor: signupColors.primary,
    borderColor: signupColors.white,
    justifyContent: "center",
    position: "absolute",
  },
});
