import { Image } from "expo-image";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";

import { NotificationToggle } from "./notification-toggle";

// Figma "List Row" (3839:49118) — Trailing: Chevron / Value / Toggle / None,
// Description: False(56) / True(68), 하단 charcoal/1 구분선. 행의 좌우 inset은
// 없고(화면 content padding이 여백을 담당) 텍스트와 trailing 사이 gap 12.
export const SETTINGS_DIVIDER_COLOR = primitiveColors.charcoal["1"];
const SETTINGS_DIVIDER_WIDTH = 1;

const ROW_HEIGHT = 56;
const ROW_HEIGHT_COMPACT = 48;
const ROW_HEIGHT_WITH_DESCRIPTION = 68;
// Figma "Chevron / Design system" — 6×12 glyph를 담은 SVG(7.5×13.5).
const CHEVRON_WIDTH = 7.5;
const CHEVRON_HEIGHT = 13.5;

// 화면마다 Figma 구분선 spec이 달라(설정 메인·계정: bottom 1 charcoal/1,
// 알림: top+bottom 0.5 charcoal/1, 권한: 기기 권한 없음·건강 연동 bottom 1
// line/subtle) 행 컴포넌트가 공통으로 받는 최소 variant.
export type SettingsDividerProps = {
  // bottom 구분선. 기본 true.
  divider?: boolean;
  // top 구분선. 기본 false.
  dividerTop?: boolean;
  dividerWidth?: number;
  dividerColor?: string;
};

type SettingsSectionLabelProps = {
  label: string;
  // "heading": 설정 메인의 heading/1/bold charcoal/12 섹션 제목.
  // "subheading": 알림 설정(4953:59838)의 body/1/bold charcoal/8 섹션 제목.
  // "label": 계정 설정·앱 권한의 body/2/bold charcoal/4 섹션 라벨.
  variant?: "heading" | "subheading" | "label";
  style?: StyleProp<TextStyle>;
};

type SettingsRowProps = SettingsDividerProps & {
  title: string;
  description?: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  // Figma List Row Trailing: Chevron(기본) / None(동의 내역처럼 표시만 하는 행).
  trailing?: "chevron" | "none";
  // 48 높이 변형(약관 및 개인정보의 "동의서 보기" 행).
  compact?: boolean;
};

type SettingsInfoRowProps = SettingsDividerProps & {
  label: string;
  value: string;
};

type SettingsValueRowProps = SettingsDividerProps & {
  title: string;
  value: string;
  disabled?: boolean;
  onPress?: () => void;
};

type SettingsToggleRowProps = SettingsDividerProps & {
  title: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
};

const SECTION_LABEL_TYPOGRAPHY = {
  heading: "heading-1-bold",
  subheading: "body-1-bold",
  label: "body-2-bold",
} as const;

export function SettingsSectionLabel({
  label,
  variant = "heading",
  style,
}: SettingsSectionLabelProps) {
  return (
    <ThemedText
      style={[SECTION_LABEL_STYLES[variant], style]}
      typography={SECTION_LABEL_TYPOGRAPHY[variant]}
    >
      {label}
    </ThemedText>
  );
}

// 행 안에 absolute로 얹는 top/bottom 구분선. 행 높이(56/68/…)에 포함된다.
export function SettingsRowDividers({
  divider = true,
  dividerTop = false,
  dividerWidth = SETTINGS_DIVIDER_WIDTH,
  dividerColor = SETTINGS_DIVIDER_COLOR,
}: SettingsDividerProps) {
  const lineStyle = { backgroundColor: dividerColor, height: dividerWidth };
  return (
    <>
      {dividerTop && <View style={[styles.dividerTop, lineStyle]} />}
      {divider && <View style={[styles.dividerBottom, lineStyle]} />}
    </>
  );
}

function SettingsChevron() {
  return (
    <Image
      contentFit="contain"
      source={require("@/assets/settings/icon-chevron-right.svg")}
      style={styles.chevron}
    />
  );
}

// Trailing: Chevron / None. `description`이 있으면 68, 없으면 56(compact 48).
export function SettingsRow({
  title,
  description,
  destructive = false,
  disabled = false,
  onPress,
  trailing = "chevron",
  compact = false,
  ...dividerProps
}: SettingsRowProps) {
  return (
    <Pressable
      accessibilityLabel={onPress ? title : undefined}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={disabled ? { disabled: true } : undefined}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={[
        styles.row,
        compact && styles.rowCompact,
        description !== undefined && styles.rowWithDescription,
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={styles.rowText}>
        <ThemedText
          style={destructive ? styles.destructiveText : styles.normalText}
          typography="body-2-medium"
        >
          {title}
        </ThemedText>
        {description !== undefined && (
          <ThemedText
            style={styles.descriptionText}
            typography="caption-1-medium"
          >
            {description}
          </ThemedText>
        )}
      </View>
      {trailing === "chevron" && <SettingsChevron />}
      <SettingsRowDividers {...dividerProps} />
    </Pressable>
  );
}

// Trailing: Value (chevron 없음, 누를 수 없음) — 계정 정보 행.
export function SettingsInfoRow({
  label,
  value,
  ...dividerProps
}: SettingsInfoRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <ThemedText style={styles.normalText} typography="body-2-medium">
          {label}
        </ThemedText>
      </View>
      <ThemedText style={styles.infoValue} typography="body-2-regular">
        {value}
      </ThemedText>
      <SettingsRowDividers {...dividerProps} />
    </View>
  );
}

// Figma "Settings / Permission Row" (4850:25776) — 오른쪽에 caption/2/regular
// 값("권한 설정")과 chevron. Figma의 기기 권한 행에는 구분선이 없어
// `divider`로 끌 수 있다. `disabled`는 행 전체를 흐리게 하고 press를 막는다.
export function SettingsValueRow({
  title,
  value,
  disabled = false,
  onPress,
  ...dividerProps
}: SettingsValueRowProps) {
  return (
    <Pressable
      accessibilityLabel={`${title}, ${value}`}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={disabled ? { disabled: true } : undefined}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={[styles.row, disabled && styles.rowDisabled]}
    >
      <View style={styles.rowText}>
        <ThemedText style={styles.normalText} typography="body-2-medium">
          {title}
        </ThemedText>
      </View>
      <ThemedText style={styles.valueText} typography="caption-2-regular">
        {value}
      </ThemedText>
      <SettingsChevron />
      <SettingsRowDividers {...dividerProps} />
    </Pressable>
  );
}

// Trailing: Toggle — 알림 설정의 on/off 행.
export function SettingsToggleRow({
  title,
  value,
  disabled = false,
  onValueChange,
  ...dividerProps
}: SettingsToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <ThemedText style={styles.normalText} typography="body-2-medium">
          {title}
        </ThemedText>
      </View>
      <NotificationToggle
        accessibilityLabel={title}
        disabled={disabled}
        onValueChange={onValueChange}
        value={value}
      />
      <SettingsRowDividers {...dividerProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeading: {
    color: primitiveColors.charcoal["12"],
  },
  sectionSubheading: {
    color: primitiveColors.charcoal["8"],
  },
  sectionLabel: {
    color: primitiveColors.charcoal["4"],
  },
  row: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    flexDirection: "row",
    gap: 12,
    height: ROW_HEIGHT,
    position: "relative",
    width: "100%",
  },
  rowCompact: {
    height: ROW_HEIGHT_COMPACT,
  },
  rowWithDescription: {
    height: ROW_HEIGHT_WITH_DESCRIPTION,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  rowText: {
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minWidth: 0,
  },
  normalText: {
    color: primitiveColors.charcoal["12"],
  },
  destructiveText: {
    color: semanticColors["status-negative-normal"],
  },
  descriptionText: {
    color: primitiveColors.charcoal["5"],
  },
  infoValue: {
    color: primitiveColors.charcoal["5"],
  },
  valueText: {
    color: primitiveColors.charcoal["6"],
  },
  chevron: {
    height: CHEVRON_HEIGHT,
    width: CHEVRON_WIDTH,
  },
  dividerTop: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  dividerBottom: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
});

const SECTION_LABEL_STYLES = {
  heading: styles.sectionHeading,
  subheading: styles.sectionSubheading,
  label: styles.sectionLabel,
} as const;
