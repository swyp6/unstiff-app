import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";
import {
  DEFAULT_AVATAR_ID,
  getAvatarOption,
} from "@/features/mypage/avatar-options";
import { AvatarSwatch } from "@/features/mypage/components/avatar-swatch";
import { MOCK_NICKNAME } from "@/features/mypage/mock-data";

export function ProfileCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cover} />

      <View style={styles.avatarWrap}>
        <AvatarSwatch option={getAvatarOption(DEFAULT_AVATAR_ID)} size={56} />
        <Pressable
          accessibilityLabel="프로필 수정"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push("/mypage/edit")}
          style={styles.editButton}
        >
          <Ionicons
            color={semanticColors["label-inverse"]}
            name="pencil"
            size={12}
          />
        </Pressable>
      </View>

      <ThemedText style={styles.nickname} typography="body-1-bold">
        {MOCK_NICKNAME}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-subtle"],
    borderRadius: radius.default,
    borderWidth: 1,
    overflow: "hidden",
    paddingBottom: 16,
  },
  cover: {
    backgroundColor: semanticColors["fill-normal"],
    height: 64,
    width: "100%",
  },
  avatarWrap: {
    alignItems: "center",
    alignSelf: "center",
    height: 56,
    marginTop: -29,
    width: 56,
  },
  editButton: {
    alignItems: "center",
    backgroundColor: semanticColors["primary-normal"],
    borderColor: semanticColors["background-normal"],
    borderRadius: 10,
    borderWidth: 2,
    bottom: -4,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: -4,
    width: 20,
  },
  nickname: {
    color: semanticColors["label-normal"],
    marginTop: 12,
    textAlign: "center",
  },
});
