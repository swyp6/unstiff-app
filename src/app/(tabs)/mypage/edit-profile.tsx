import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
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
import { primitiveColors, semanticColors } from "@/constants/tokens";
import {
  isNicknameAlreadyUsedError,
  updateMyProfile,
} from "@/features/auth/api";
import {
  NICKNAME_ALREADY_USED_TEXT,
  NICKNAME_FORMAT_GUIDE_TEXT,
  NICKNAME_MAX_LENGTH,
  validateNickname,
} from "@/features/auth/nickname-validation";
import type { UpdateProfileRequest } from "@/features/auth/types";
import { useNicknameAvailability } from "@/features/auth/use-nickname-availability";
import { avatarsEqual } from "@/features/mypage/avatar-presets";
import { AvatarCircle } from "@/features/mypage/components/avatar-circle";
import { ProfileImagePickerSheet } from "@/features/mypage/components/profile-image-picker-sheet";
import { useMyProfileStore } from "@/features/mypage/profile-store";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import {
  ImageUploadError,
  logImageUploadError,
} from "@/features/upload/cloudinary";
import { usePhotoAdjustResultStore } from "@/features/upload/photo-adjust-result";
import { uploadImageFromUri } from "@/features/upload/upload-image";

const AVATAR_SIZE = 120;
const CAMERA_BADGE_SIZE = 40;

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

  // Picks up a cropped photo from profile-photo-adjust.tsx once this screen
  // regains focus after the picker sheet pushed it there and closed itself
  // (see profile-image-picker-sheet.tsx's handleUploadPress) — consume()
  // no-ops when nothing's waiting, so this is safe on every unrelated focus
  // too (e.g. just navigating back from settings).
  useFocusEffect(
    useCallback(() => {
      const uri = usePhotoAdjustResultStore.getState().consume();
      if (uri) setDraftAvatar({ type: "photo", uri });
    }, []),
  );

  const nicknameChanged = draftNickname !== storedNickname;
  const avatarChanged = !avatarsEqual(draftAvatar, storedAvatar);
  // Matching the stored nickname bypasses the availability check — an
  // unchanged nickname needs no duplicate check against yourself. Skipped
  // entirely (never bypassed) when there was no stored nickname to begin
  // with, since any nickname entered then is genuinely new.
  const availability = useNicknameAvailability(draftNickname, {
    skipValue: storedNickname || undefined,
  });
  // Only evaluated once the nickname is actually being edited — an
  // untouched nickname never shows an error, even if it predates the
  // current format rules. The draft is the raw string the user typed (no
  // sanitizing/truncation — see onChangeText below); validateNickname
  // (shared with onboarding) decides length → character → symbol-position
  // errors in that order, and the availability hook only asks the server
  // once it passes. An emptied field shows no error, just a disabled 저장.
  const nicknameFormatError = nicknameChanged
    ? validateNickname(draftNickname).message
    : null;
  const nicknameDuplicate =
    nicknameChanged && !nicknameFormatError && availability === "unavailable";
  const nicknameHelperText = nicknameFormatError
    ? nicknameFormatError
    : nicknameDuplicate
      ? NICKNAME_ALREADY_USED_TEXT
      : NICKNAME_FORMAT_GUIDE_TEXT;
  const nicknameHasError = Boolean(nicknameFormatError) || nicknameDuplicate;
  // 저장 stays disabled while an edited nickname is invalid/unchecked/taken,
  // matching Figma's Button CTA 비활성 variant — an avatar-only change (or no
  // change at all) is unaffected by nickname validity.
  const canSave =
    !isSaving &&
    (!nicknameChanged ||
      (!nicknameFormatError && availability === "available"));

  async function handleSave() {
    if (!canSave) return;

    if (!nicknameChanged && !avatarChanged) {
      router.back();
      return;
    }

    setIsSaving(true);
    try {
      // A preset (bundled sticker) avatar has no server representation —
      // the API only accepts a real Cloudinary/workers.dev image URL — so
      // it's never uploaded/sent, and (below) never confirmed into the
      // local store as if it had been saved. Only a "photo" pick is
      // persistable.
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
      <SettingsHeader onBack={() => router.back()} title="프로필 수정" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 px-5 pt-4"
      >
        <View className="items-center py-6">
          <View>
            <AvatarCircle avatar={draftAvatar} size={AVATAR_SIZE} />
            <Pressable
              accessibilityLabel="프로필 이미지 변경"
              accessibilityRole="button"
              className="absolute items-center justify-center rounded-full border-[3px] border-background-normal bg-orange-500"
              onPress={() => setIsPickerOpen(true)}
              style={{
                bottom: 0,
                height: CAMERA_BADGE_SIZE,
                right: 0,
                width: CAMERA_BADGE_SIZE,
              }}
            >
              <Ionicons color="white" name="camera" size={18} />
            </Pressable>
          </View>
        </View>

        {/* Figma "Field / 닉네임"(4273:17741, 4573:35691~35727): 라벨
            caption/1/bold, 필드 bg charcoal/0 #FAFAFA · radius 12 · min-h 50 ·
            pl 15 / pr 17 / py 15 · 오류 시 1.4px neg/normal(stroke가 padding
            안쪽에 겹치므로 border 두께만큼 padding을 줄인다), 입력 body/2/
            regular, 카운터·안내 caption/1/regular. 오류 아이콘은 없다. */}
        <View className="gap-2">
          <ThemedText
            style={{ color: primitiveColors.charcoal["11"] }}
            typography="caption-1-bold"
          >
            닉네임
          </ThemedText>
          <View
            className={`min-h-[50px] flex-row items-center gap-2 rounded-[12px] bg-[#fafafa] ${
              nicknameHasError
                ? "border-[1.4px] border-status-negative-normal py-[13.6px] pl-[13.6px] pr-[15.6px]"
                : "py-[15px] pl-[15px] pr-[17px]"
            }`}
          >
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              // Raw input is kept as typed: no maxLength, no sanitizing —
              // a too-long or invalid value stays visible and is reported
              // via nicknameHelperText; 저장 stays disabled until it's valid.
              onChangeText={setDraftNickname}
              placeholder="닉네임을 입력해주세요"
              placeholderTextColor={semanticColors["label-disabled"]}
              style={{
                flex: 1,
                fontFamily: "Pretendard-Regular",
                fontSize: 14,
                lineHeight: 19,
                padding: 0,
                color: primitiveColors.charcoal["11"],
              }}
              value={draftNickname}
            />
            <ThemedText
              style={{
                color: nicknameHasError
                  ? semanticColors["status-negative-normal"]
                  : semanticColors["label-disabled"],
              }}
              typography="caption-1-regular"
            >
              {draftNickname.length} / {NICKNAME_MAX_LENGTH}
            </ThemedText>
          </View>
          <ThemedText
            style={{
              color: nicknameHasError
                ? semanticColors["status-negative-normal"]
                : semanticColors["label-subtle"],
            }}
            typography="caption-1-regular"
          >
            {nicknameHelperText}
          </ThemedText>
        </View>

        <View className="flex-1" />

        <Pressable
          accessibilityLabel="저장"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          className={`mb-6 h-[52px] items-center justify-center rounded-full bg-charcoal-11 ${
            canSave ? "" : "opacity-40"
          }`}
          disabled={!canSave}
          onPress={handleSave}
        >
          <ThemedText
            style={{ color: semanticColors["label-inverse"] }}
            typography="body-1-bold"
          >
            저장
          </ThemedText>
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
