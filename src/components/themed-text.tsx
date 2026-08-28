import { Platform, StyleSheet, Text, type TextProps } from "react-native";

import { Fonts, ThemeColor } from "@/constants/theme";
import { typography } from "@/constants/tokens";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextProps = TextProps & {
  type?:
    | "default"
    | "title"
    | "small"
    | "smallBold"
    | "subtitle"
    | "link"
    | "linkPrimary"
    | "code";
  /**
   * A named style from the Figma foundation's typography scale (e.g.
   * "title-1-bold", "en-body-2-regular" — see src/constants/tokens.ts).
   * Overrides `type`'s font styling when set.
   */
  typography?: keyof typeof typography;
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = "default",
  typography: typographyKey,
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? "text"] },
        !typographyKey && type === "default" && styles.default,
        !typographyKey && type === "title" && styles.title,
        !typographyKey && type === "small" && styles.small,
        !typographyKey && type === "smallBold" && styles.smallBold,
        !typographyKey && type === "subtitle" && styles.subtitle,
        !typographyKey && type === "link" && styles.link,
        !typographyKey && type === "linkPrimary" && styles.linkPrimary,
        !typographyKey && type === "code" && styles.code,
        // typography (when set) fully owns font styling — a leftover
        // fontWeight from `type`'s styles can conflict with the exact
        // weighted font family it sets, so `type`'s font styles are excluded
        // above rather than just overridden here.
        typographyKey &&
          type === "linkPrimary" && { color: styles.linkPrimary.color },
        typographyKey && typography[typographyKey],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: "#3c87f7",
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
