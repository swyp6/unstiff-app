import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";

import { NotificationToggle } from "./notification-toggle";
import { SettingsRowDividers } from "./settings-list";

type LegalConsentRowProps = {
  title: string;
  // 미동의(Off) 상태에서만 보이는 안내 문구.
  description: string;
  agreed: boolean;
  disabled?: boolean;
  onToggle: (agreed: boolean) => void;
};

// 약관 및 개인정보의 "선택 약관 동의/철회" 행 — Figma 4953:59750(Off)은
// 64 높이에 설명이 있고, 4953:59928(On)은 설명 없는 48 높이라 toggle 상태에
// 따라 행 모양이 바뀐다. 하단 1px charcoal/1 구분선.
export function LegalConsentRow({
  title,
  description,
  agreed,
  disabled = false,
  onToggle,
}: LegalConsentRowProps) {
  return (
    <View style={[styles.row, agreed ? styles.rowOn : styles.rowOff]}>
      <View style={styles.text}>
        <ThemedText style={styles.title} typography="body-2-medium">
          {title}
        </ThemedText>
        {!agreed && (
          <ThemedText style={styles.description} typography="caption-1-regular">
            {description}
          </ThemedText>
        )}
      </View>
      <NotificationToggle
        accessibilityLabel={title}
        disabled={disabled}
        onValueChange={onToggle}
        value={agreed}
      />
      <SettingsRowDividers />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    position: "relative",
    width: "100%",
  },
  rowOn: {
    height: 48,
  },
  rowOff: {
    height: 64,
  },
  text: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    color: primitiveColors.charcoal["12"],
  },
  description: {
    color: primitiveColors.charcoal["5"],
  },
});
