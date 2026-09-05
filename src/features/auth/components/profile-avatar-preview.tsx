import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

// Figma's WF/Signup/ProfileAvatar(135x134) / ProfileAvatarInner(67x66) /
// CameraButton(50x48) — plain flat ellipses (confirmed via get_metadata:
// <ellipse>, not vector art) — shared by profile-photo and signup-complete,
// which both show this exact placeholder-or-selected-photo structure.
export const AVATAR_OUTER_SIZE = 135;
const AVATAR_INNER_SIZE = 66;
const CAMERA_BUTTON_SIZE = 48;

type ProfileAvatarPreviewProps = {
  imageUri?: string | null;
};

// Purely presentational — callers wrap this in a Pressable (profile-photo)
// or leave it static (signup-complete) depending on whether re-picking a
// photo should be possible on that screen.
export function ProfileAvatarPreview({ imageUri }: ProfileAvatarPreviewProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.outer}>
        {imageUri ? (
          <Image
            contentFit="cover"
            source={{ uri: imageUri }}
            style={styles.image}
          />
        ) : (
          <View style={styles.inner} />
        )}
      </View>
      <View style={styles.cameraButton}>
        {/* WF/Signup/CameraIcon in Figma is literally a "●" text glyph, not
            a real camera icon asset yet — reproduced as-is rather than
            substituting a different glyph of our own choosing. Swap this
            node for the real icon/asset once design provides one; nothing
            else here needs to change. */}
        <ThemedText style={styles.cameraGlyph} typography="body-2-regular">
          ●
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: AVATAR_OUTER_SIZE,
    width: AVATAR_OUTER_SIZE,
  },
  outer: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-normal"],
    borderRadius: AVATAR_OUTER_SIZE / 2,
    borderWidth: 1,
    height: AVATAR_OUTER_SIZE,
    justifyContent: "center",
    overflow: "hidden",
    width: AVATAR_OUTER_SIZE,
  },
  inner: {
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: AVATAR_INNER_SIZE / 2,
    height: AVATAR_INNER_SIZE,
    width: AVATAR_INNER_SIZE,
  },
  image: {
    height: "100%",
    width: "100%",
  },
  cameraButton: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: CAMERA_BUTTON_SIZE / 2,
    bottom: 0,
    height: CAMERA_BUTTON_SIZE,
    justifyContent: "center",
    position: "absolute",
    right: -9,
    width: CAMERA_BUTTON_SIZE,
  },
  cameraGlyph: {
    color: semanticColors["label-subtle"],
  },
});
