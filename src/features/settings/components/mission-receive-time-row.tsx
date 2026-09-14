import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors } from "@/constants/tokens";

import { NotificationToggle } from "./notification-toggle";
import {
  SettingsRowDividers,
  type SettingsDividerProps,
} from "./settings-list";

type MissionReceiveTimeRowProps = SettingsDividerProps & {
  // Figma State=On/Off — On일 때만 아래 시간 선택 field가 보인다.
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  toggleDisabled?: boolean;
  // formatOfferTimeLabel 결과("오전 09:30"). 아직 못 불러왔으면 null.
  timeLabel: string | null;
  onTimePress: () => void;
};

// Figma "Mission Receive Time Row" (4943:44760, 화면 4953:59838 / 4953:59859)
// — 제목/설명(gap 2) + 오른쪽 Toggle, On 상태에서는 그 아래 orange/50 배경의
// 시간 선택 field(높이 36, radius 8, 좌우 padding 16)가 행 전체 폭으로 붙는다.
// 행 높이는 Off 64 / On 120, 하단 1px charcoal/1 구분선. 설명 색은 Figma대로
// On에서 charcoal/8, Off에서 charcoal/5.
const TIME_FIELD_HEIGHT = 36;
const TIME_FIELD_RADIUS = 8;
const TIME_FIELD_ICON_SIZE = 18;

export function MissionReceiveTimeRow({
  enabled,
  onToggle,
  toggleDisabled = false,
  timeLabel,
  onTimePress,
  ...dividerProps
}: MissionReceiveTimeRowProps) {
  const title = "미션 수신 시간";
  return (
    <View style={[styles.row, enabled ? styles.rowOn : styles.rowOff]}>
      <View style={styles.headline}>
        <View style={styles.text}>
          <ThemedText style={styles.title} typography="body-2-medium">
            {title}
          </ThemedText>
          <ThemedText
            style={enabled ? styles.descriptionOn : styles.descriptionOff}
            typography="caption-1-regular"
          >
            설정한 시간에 알림을 보내드려요
          </ThemedText>
        </View>
        <NotificationToggle
          accessibilityLabel={title}
          disabled={toggleDisabled}
          onValueChange={onToggle}
          value={enabled}
        />
      </View>

      {enabled && (
        <Pressable
          accessibilityLabel={`${title} 변경, ${timeLabel ?? "시간 설정"}`}
          accessibilityRole="button"
          onPress={onTimePress}
          style={styles.timeField}
        >
          <ThemedText style={styles.timeFieldText} typography="body-2-medium">
            {timeLabel ?? "시간 설정"}
          </ThemedText>
          <Image
            contentFit="contain"
            source={require("@/assets/settings/icon-chevron-right-orange.svg")}
            style={styles.timeFieldIcon}
          />
        </Pressable>
      )}

      <SettingsRowDividers {...dividerProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: "relative",
    width: "100%",
  },
  // Off: 64, 텍스트 블록 세로 가운데. On: 120 — 텍스트 블록 top 17
  // (19+2+16=37 → 54), field top 69, field 아래 15.
  rowOff: {
    height: 64,
    justifyContent: "center",
  },
  rowOn: {
    gap: 15,
    height: 120,
    paddingTop: 17,
  },
  headline: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  text: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    color: primitiveColors.charcoal["12"],
  },
  descriptionOn: {
    color: primitiveColors.charcoal["8"],
  },
  descriptionOff: {
    color: primitiveColors.charcoal["5"],
  },
  timeField: {
    alignItems: "center",
    backgroundColor: primitiveColors.orange["50"],
    borderRadius: TIME_FIELD_RADIUS,
    flexDirection: "row",
    gap: 12,
    height: TIME_FIELD_HEIGHT,
    paddingHorizontal: 16,
    width: "100%",
  },
  timeFieldText: {
    color: primitiveColors.orange["500"],
    flex: 1,
  },
  timeFieldIcon: {
    height: TIME_FIELD_ICON_SIZE,
    width: TIME_FIELD_ICON_SIZE,
  },
});
