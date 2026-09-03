import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";
import { AvatarPickerSheet } from "@/features/mypage/components/avatar-picker-sheet";
import { AvatarSwatch } from "@/features/mypage/components/avatar-swatch";
import {
  DEFAULT_AVATAR_ID,
  getAvatarOption,
} from "@/features/mypage/avatar-options";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import { goBackOrReplace } from "@/features/settings/navigation";

export default function EditProfileScreen() {
  const [nickname, setNickname] = useState("사용자 닉네임");
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [pickerVisible, setPickerVisible] = useState(false);

  function handleSave() {
    // No backend wired up yet — mock save just returns to the my page.
    goBackOrReplace("/mypage");
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      <SettingsHeader
        onBack={() => goBackOrReplace("/mypage")}
        title="프로필 수정화면"
      />

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.body}
      >
        <View style={styles.content}>
          <View style={styles.avatarWrap}>
            <AvatarSwatch option={getAvatarOption(avatarId)} size={88} />
            <Pressable
              accessibilityLabel="프로필 이미지 변경"
              accessibilityRole="button"
              onPress={() => setPickerVisible(true)}
              style={styles.editPill}
            >
              <ThemedText
                themeColor="textSecondary"
                typography="caption-1-regular"
              >
                변경
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText style={styles.label} typography="body-2-bold">
            닉네임
          </ThemedText>
          <View style={styles.inputBox}>
            <TextInput
              maxLength={20}
              onChangeText={setNickname}
              placeholder="닉네임을 입력해주세요"
              placeholderTextColor={semanticColors["label-disabled"]}
              style={styles.input}
              value={nickname}
            />
          </View>
          <ThemedText
            style={styles.helper}
            themeColor="textSecondary"
            typography="caption-1-regular"
          >
            프로필 이미지 · 닉네임 수정
          </ThemedText>
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityLabel="저장"
            accessibilityRole="button"
            onPress={handleSave}
            style={styles.saveButton}
          >
            <ThemedText typography="body-2-bold">저장</ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <AvatarPickerSheet
        onClose={() => setPickerVisible(false)}
        onSelect={(id) => {
          setAvatarId(id);
          setPickerVisible(false);
        }}
        selectedId={avatarId}
        visible={pickerVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: semanticColors["fill-subtle"],
    flex: 1,
  },
  body: {
    flex: 1,
    justifyContent: "space-between",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  avatarWrap: {
    alignItems: "center",
    alignSelf: "center",
    height: 88,
    marginBottom: 32,
    width: 88,
  },
  editPill: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: 14,
    bottom: -8,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: -16,
    width: 48,
  },
  label: {
    color: semanticColors["label-normal"],
    marginBottom: 12,
  },
  inputBox: {
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: radius.default,
    height: 52,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  input: {
    color: semanticColors["label-normal"],
    fontSize: 14,
    fontWeight: "700",
    padding: 0,
  },
  helper: {
    marginTop: 12,
  },
  footer: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-subtle"],
    borderRadius: 20,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
  },
});
