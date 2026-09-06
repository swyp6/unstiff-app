import { router } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { AvatarCircle } from "@/features/mypage/components/avatar-circle";
import { ProfileImagePickerSheet } from "@/features/mypage/components/profile-image-picker-sheet";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import { useMyProfileStore } from "@/features/mypage/profile-store";

const NICKNAME_MAX_LENGTH = 10;
const AVATAR_SIZE = 88;

export default function EditProfileScreen() {
  const storedNickname = useMyProfileStore((state) => state.nickname);
  const storedAvatar = useMyProfileStore((state) => state.avatar);
  const setNickname = useMyProfileStore((state) => state.setNickname);
  const setAvatar = useMyProfileStore((state) => state.setAvatar);

  const [draftNickname, setDraftNickname] = useState(storedNickname);
  const [draftAvatar, setDraftAvatar] = useState(storedAvatar);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  function handleSave() {
    setNickname(draftNickname);
    setAvatar(draftAvatar);
    router.back();
  }

  return (
    <SafeAreaView
      className="flex-1 bg-fill-subtle"
      edges={["top", "left", "right", "bottom"]}
    >
      <SettingsHeader onBack={() => router.back()} title="프로필 수정화면" />

      <View className="flex-1 px-5 pt-4">
        <View className="items-center">
          <View>
            <AvatarCircle avatar={draftAvatar} size={AVATAR_SIZE} />
            <Pressable
              accessibilityLabel="프로필 이미지 변경"
              accessibilityRole="button"
              className="absolute -bottom-1 -right-2 items-center justify-center rounded-full bg-fill-normal px-2.5 py-1.5"
              onPress={() => setIsPickerOpen(true)}
            >
              <ThemedText
                themeColor="textSecondary"
                typography="caption-1-regular"
              >
                변경
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View className="mt-8 gap-2">
          <ThemedText typography="body-2-bold">닉네임</ThemedText>
          <View className="h-[52px] flex-row items-center justify-between rounded-default bg-fill-normal px-4">
            <TextInput
              maxLength={NICKNAME_MAX_LENGTH}
              onChangeText={setDraftNickname}
              placeholder="닉네임을 입력해주세요"
              placeholderTextColor={semanticColors["label-disabled"]}
              style={{
                flex: 1,
                fontFamily: "Pretendard-Bold",
                fontSize: 14,
                color: semanticColors["label-normal"],
              }}
              value={draftNickname}
            />
            <ThemedText
              themeColor="textDisabled"
              typography="caption-1-regular"
            >
              {draftNickname.length}/{NICKNAME_MAX_LENGTH}
            </ThemedText>
          </View>
          <ThemedText themeColor="textSecondary" typography="caption-1-regular">
            프로필 이미지 · 닉네임 수정
          </ThemedText>
        </View>

        <View className="flex-1" />

        <Pressable
          accessibilityLabel="저장"
          accessibilityRole="button"
          className="mb-6 h-[52px] items-center justify-center rounded-[20px] border border-line-subtle bg-background-normal"
          onPress={handleSave}
        >
          <ThemedText typography="body-2-bold">저장</ThemedText>
        </Pressable>
      </View>

      <ProfileImagePickerSheet
        currentAvatar={draftAvatar}
        onClose={() => setIsPickerOpen(false)}
        onConfirm={(avatar) => {
          setDraftAvatar(avatar);
          setIsPickerOpen(false);
        }}
        visible={isPickerOpen}
      />
    </SafeAreaView>
  );
}
