import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import {
  isNicknameAlreadyUsedError,
  updateMyProfile,
} from "@/features/auth/api";
import {
  NICKNAME_FORMAT_PATTERN,
  NICKNAME_MAX_LENGTH,
} from "@/features/auth/nickname-validation";
import type { UpdateProfileRequest } from "@/features/auth/types";
import { useNicknameAvailability } from "@/features/auth/use-nickname-availability";
import type { AvatarSelection } from "@/features/mypage/avatar-presets";
import { AvatarCircle } from "@/features/mypage/components/avatar-circle";
import { ProfileImagePickerSheet } from "@/features/mypage/components/profile-image-picker-sheet";
import { useMyProfileStore } from "@/features/mypage/profile-store";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import {
  ImageUploadError,
  logImageUploadError,
} from "@/features/upload/cloudinary";
import { uploadImageFromUri } from "@/features/upload/upload-image";

const AVATAR_SIZE = 88;

function avatarsEqual(a: AvatarSelection, b: AvatarSelection) {
  if (a === b) return true;
  if (a?.type !== b?.type) return false;
  if (a?.type === "preset" && b?.type === "preset") {
    return a.presetId === b.presetId;
  }
  if (a?.type === "photo" && b?.type === "photo") return a.uri === b.uri;
  return false;
}

export default function EditProfileScreen() {
  // null means profile setup was never completed server-side — treated the
  // same as "nothing entered yet" here, an empty draft, not a fake name.
  const storedNickname = useMyProfileStore((state) => state.nickname) ?? "";
  const storedAvatar = useMyProfileStore((state) => state.avatar);
  const setNickname = useMyProfileStore((state) => state.setNickname);
  const setAvatar = useMyProfileStore((state) => state.setAvatar);

  const [draftNickname, setDraftNickname] = useState(storedNickname);
  const [draftAvatar, setDraftAvatar] = useState(storedAvatar);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Caches the last successfully-uploaded photo so re-pressing 저장 after a
  // failed PUT doesn't re-upload the same picked photo to Cloudinary again.
  const uploadedPhotoRef = useRef<{ uri: string; secureUrl: string } | null>(
    null,
  );

  const isNicknameValid = NICKNAME_FORMAT_PATTERN.test(draftNickname);
  const nicknameChanged = draftNickname !== storedNickname;
  const avatarChanged = !avatarsEqual(draftAvatar, storedAvatar);
  // Matching the stored nickname bypasses the availability check — an
  // unchanged nickname needs no duplicate check against yourself. Skipped
  // entirely (never bypassed) when there was no stored nickname to begin
  // with, since any nickname entered then is genuinely new.
  const availability = useNicknameAvailability(draftNickname, {
    skipValue: storedNickname || undefined,
  });
  // Neither the format check nor the duplicate check blocks 저장 itself
  // anymore — pressing it is what tells the user what's wrong (via the
  // alerts below), rather than silently disabling the button with no
  // explanation.
  const canSave = !isSaving;

  async function handleSave() {
    if (!canSave) return;

    if (nicknameChanged && !isNicknameValid) {
      Alert.alert(
        "다시 입력해주세요.",
        "영문과 숫자로 2~10자, 특수기호는 . _ 만 쓸 수 있어요",
      );
      return;
    }

    if (nicknameChanged && availability !== "available") {
      Alert.alert("중복된 닉네임이에요", "다른 닉네임을 입력해주세요.");
      return;
    }

    if (!nicknameChanged && !avatarChanged) {
      router.back();
      return;
    }

    setIsSaving(true);
    try {
      // A preset (solid-color) avatar has no server representation — the
      // API only accepts a real Cloudinary/workers.dev image URL — so it's
      // never uploaded/sent, and (below) never confirmed into the local
      // store as if it had been saved. Only a "photo" pick is persistable.
      const avatarSavable = avatarChanged && draftAvatar?.type === "photo";

      let profileImageUrl: string | undefined;
      if (avatarSavable && draftAvatar.type === "photo") {
        if (uploadedPhotoRef.current?.uri === draftAvatar.uri) {
          profileImageUrl = uploadedPhotoRef.current.secureUrl;
        } else {
          profileImageUrl = await uploadImageFromUri(
            draftAvatar.uri,
            "USER_PROFILE",
          );
          uploadedPhotoRef.current = {
            uri: draftAvatar.uri,
            secureUrl: profileImageUrl,
          };
        }
      }

      const body: UpdateProfileRequest = {};
      if (nicknameChanged) body.nickname = draftNickname;
      if (profileImageUrl) body.profileImageUrl = profileImageUrl;

      // A preset-only change (or no change at all) leaves this empty —
      // nothing to save, so the PUT is skipped entirely rather than
      // sending an empty/invalid body.
      if (Object.keys(body).length > 0) {
        await updateMyProfile(body);
      }

      // Only confirm into local state what was actually persisted above —
      // a preset selection is never reflected here, so the profile card
      // keeps showing the last real (server-backed) avatar instead of a
      // choice that only ever lived in this screen's draft state.
      if (nicknameChanged) setNickname(draftNickname);
      if (avatarSavable) setAvatar(draftAvatar);
      router.back();
    } catch (error) {
      if (isNicknameAlreadyUsedError(error)) {
        Alert.alert(
          "오류",
          "이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해주세요.",
        );
      } else if (error instanceof ImageUploadError) {
        Alert.alert("오류", error.message);
      } else {
        logImageUploadError("edit-profile save failed", error);
        Alert.alert("오류", "프로필을 저장하지 못했습니다. 다시 시도해주세요.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView
      className="flex-1 bg-fill-subtle"
      edges={["top", "left", "right", "bottom"]}
    >
      <SettingsHeader onBack={() => router.back()} title="프로필 수정화면" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 px-5 pt-4"
      >
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
              autoCapitalize="none"
              autoCorrect={false}
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
            영문과 숫자로 2~10자, 특수기호는 . _ 만 쓸 수 있어요
          </ThemedText>
        </View>

        <View className="flex-1" />

        <Pressable
          accessibilityLabel="저장"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          className={`mb-6 h-[52px] items-center justify-center rounded-[20px] border border-line-subtle bg-background-normal ${
            canSave ? "" : "opacity-40"
          }`}
          disabled={!canSave}
          onPress={handleSave}
        >
          <ThemedText typography="body-2-bold">저장</ThemedText>
        </Pressable>
      </KeyboardAvoidingView>

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
