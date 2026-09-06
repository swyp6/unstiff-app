import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import {
  AVATAR_PRESETS,
  type AvatarSelection,
} from "@/features/mypage/avatar-presets";
import { AvatarCircle } from "@/features/mypage/components/avatar-circle";
import { WorkoutPlanBottomSheet } from "@/features/workout-plan/components/workout-plan-bottom-sheet";
import {
  ImageUploadError,
  logImageUploadError,
} from "@/features/upload/cloudinary";
import { pickImage } from "@/features/upload/use-image-upload";

const OPTION_SIZE = 48;
const OPTIONS_PER_ROW = 4;

type ProfileImagePickerSheetProps = {
  visible: boolean;
  currentAvatar: AvatarSelection;
  onClose: () => void;
  onConfirm: (avatar: AvatarSelection) => void;
};

export function ProfileImagePickerSheet({
  visible,
  currentAvatar,
  onClose,
  onConfirm,
}: ProfileImagePickerSheetProps) {
  const [pending, setPending] = useState<AvatarSelection>(currentAvatar);
  // Re-seed the pending choice from whatever's actually saved on each
  // closed→open transition, so a previous "닫기" (discard) doesn't leak
  // into the next open. Adjusted during render (React's recommended
  // pattern for this) rather than in an effect, which would set state
  // synchronously after the sheet's own mount render.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setPending(currentAvatar);
  }

  async function handleUploadPress() {
    try {
      // ponytail: no crop step here (unlike onboarding's profile-photo-
      // adjust) — that screen is wired to signup-store specifically. Skips
      // straight to the picked photo; add cropping back once that screen
      // takes a generic destination instead of the signup store.
      const asset = await pickImage("library");
      if (!asset) return;
      setPending({ type: "photo", uri: asset.uri });
    } catch (error) {
      logImageUploadError("mypage avatar pick failed", error);
      Alert.alert(
        "오류",
        error instanceof ImageUploadError
          ? error.message
          : "사진을 불러오지 못했습니다.",
      );
    }
  }

  const options = [
    <Pressable
      accessibilityLabel="직접 업로드"
      accessibilityRole="button"
      className="items-center justify-center rounded-full bg-fill-normal"
      key="upload"
      onPress={handleUploadPress}
      style={{ height: OPTION_SIZE, width: OPTION_SIZE }}
    >
      <Ionicons color={semanticColors["label-subtle"]} name="add" size={22} />
    </Pressable>,
    ...AVATAR_PRESETS.map((preset) => {
      // A fixed 48x48 footprint for every option (Figma shows no selected
      // state at all) — a checkmark overlay marks the pick instead of a
      // border ring, which would otherwise grow the touch target and throw
      // off the 4-per-row spacing when toggled.
      const selected =
        pending?.type === "preset" && pending.presetId === preset.id;
      return (
        <Pressable
          accessibilityLabel={`${preset.id} 프로필 색상`}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          key={preset.id}
          onPress={() => setPending({ type: "preset", presetId: preset.id })}
          style={{
            alignItems: "center",
            backgroundColor: preset.color,
            borderRadius: OPTION_SIZE / 2,
            height: OPTION_SIZE,
            justifyContent: "center",
            width: OPTION_SIZE,
          }}
        >
          {selected && (
            <Ionicons
              color={semanticColors["label-inverse"]}
              name="checkmark"
              size={20}
            />
          )}
        </Pressable>
      );
    }),
  ];

  return (
    <WorkoutPlanBottomSheet
      onClose={onClose}
      title="프로필 이미지 선택"
      visible={visible}
    >
      <View className="items-center gap-4 pb-2">
        <AvatarCircle avatar={pending} size={96} />

        <View className="w-[288px] gap-3">
          {[
            options.slice(0, OPTIONS_PER_ROW),
            options.slice(OPTIONS_PER_ROW),
          ].map((row, rowIndex) => (
            <View className="flex-row justify-between" key={rowIndex}>
              {row}
            </View>
          ))}
        </View>
      </View>

      <View className="pt-3">
        <View className="flex-row gap-3.5" style={{ height: 54 }}>
          <Pressable
            accessibilityLabel="닫기"
            accessibilityRole="button"
            className="flex-1 items-center justify-center rounded-[10px] bg-fill-normal"
            onPress={onClose}
          >
            <ThemedText typography="body-1-bold">닫기</ThemedText>
          </Pressable>
          <Pressable
            accessibilityLabel="선택"
            accessibilityRole="button"
            className="flex-1 items-center justify-center rounded-[10px] border border-line-subtle bg-background-normal"
            onPress={() => onConfirm(pending)}
          >
            <ThemedText typography="body-1-bold">선택</ThemedText>
          </Pressable>
        </View>
      </View>
    </WorkoutPlanBottomSheet>
  );
}
