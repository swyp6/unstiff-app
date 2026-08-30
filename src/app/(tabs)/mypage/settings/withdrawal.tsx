import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import { goBackOrReplace } from "@/features/settings/navigation";

const WARNING_MESSAGES = [
  "운동 기록과 등록한 사진",
  "오늘의 질문 답변과 개인화 정보",
  "운동 계획과 데일리 미션 이력",
] as const;

function WithdrawalWarningItem({ message }: { message: string }) {
  return (
    <View style={styles.warningItem}>
      <View style={styles.warningBullet} />
      <ThemedText style={styles.warningText} typography="body-2-medium">
        {message}
      </ThemedText>
    </View>
  );
}

type WithdrawalCheckboxProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function WithdrawalCheckbox({ value, onValueChange }: WithdrawalCheckboxProps) {
  return (
    <Pressable
      accessibilityLabel="안내 내용을 확인했어요"
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      hitSlop={12}
      onPress={() => onValueChange(!value)}
      style={styles.checkboxRow}
    >
      <View
        style={[
          styles.checkbox,
          value ? styles.checkboxChecked : styles.checkboxUnchecked,
        ]}
      >
        {value && (
          <Ionicons
            color={semanticColors["primary-on"]}
            name="checkmark"
            size={14}
          />
        )}
      </View>
      <ThemedText style={styles.checkboxLabel} typography="body-2-regular">
        안내 내용을 확인했어요
      </ThemedText>
    </Pressable>
  );
}

export default function WithdrawalScreen() {
  const [isConfirmed, setIsConfirmed] = useState(false);

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      <SettingsHeader
        onBack={() => goBackOrReplace("/mypage/settings")}
        title="회원 탈퇴"
      />

      <View style={styles.content}>
        <View style={styles.mainContent}>
          <View style={styles.intro}>
            <ThemedText style={styles.title} typography="title-3-bold">
              탈퇴 전 확인해 주세요
            </ThemedText>
            <ThemedText style={styles.description} typography="body-2-regular">
              탈퇴하면 아래 정보가 모두 삭제되고 복구할 수 없어요.
            </ThemedText>
          </View>

          <View style={styles.warningList}>
            {WARNING_MESSAGES.map((message) => (
              <WithdrawalWarningItem key={message} message={message} />
            ))}
          </View>

          <WithdrawalCheckbox
            onValueChange={setIsConfirmed}
            value={isConfirmed}
          />
        </View>

        <View style={styles.spacer} />

        <Pressable
          accessibilityLabel="계속하기"
          accessibilityRole="button"
          accessibilityState={{ disabled: !isConfirmed }}
          disabled={!isConfirmed}
          style={[
            styles.continueButton,
            !isConfirmed && styles.continueButtonDisabled,
          ]}
        >
          <ThemedText
            style={styles.continueButtonText}
            typography="body-1-medium"
          >
            계속하기
          </ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: semanticColors["background-normal"],
    flex: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  mainContent: {
    gap: 45,
    width: "100%",
  },
  intro: {
    gap: 8,
  },
  title: {
    color: semanticColors["label-normal"],
    lineHeight: 28,
  },
  description: {
    color: semanticColors["label-subtle"],
    lineHeight: 22,
  },
  warningList: {
    gap: 8,
    width: "100%",
  },
  warningItem: {
    alignItems: "center",
    backgroundColor: semanticColors["fill-subtle"],
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    height: 48,
    paddingHorizontal: 16,
    width: "100%",
  },
  warningBullet: {
    backgroundColor: semanticColors["status-negative-normal"],
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  warningText: {
    color: semanticColors["label-normal"],
    lineHeight: 20,
  },
  checkboxRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
    height: 20,
  },
  checkbox: {
    alignItems: "center",
    borderRadius: 4,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  checkboxChecked: {
    backgroundColor: semanticColors["primary-normal"],
  },
  checkboxUnchecked: {
    borderColor: semanticColors["line-strong"],
    borderWidth: 1,
  },
  checkboxLabel: {
    color: semanticColors["label-normal"],
  },
  spacer: {
    flex: 1,
  },
  continueButton: {
    alignItems: "center",
    backgroundColor: semanticColors["primary-normal"],
    borderRadius: radius.default,
    height: 52,
    justifyContent: "center",
    paddingHorizontal: 20,
    width: "100%",
  },
  continueButtonDisabled: {
    opacity: 0.35,
  },
  continueButtonText: {
    color: semanticColors["primary-on"],
  },
});
