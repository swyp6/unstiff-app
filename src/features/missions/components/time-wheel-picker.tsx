import { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useAnimatedValue,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import {
  primitiveColors,
  radius,
  semanticColors,
  typography,
} from "@/constants/tokens";

import type { Meridiem, OfferTimeParts } from "../offer-time";

// Figma "시간 선택 카드" (4007:24034) — 높이 236, 상단 19에 161×36 오전/오후
// segmented, 선택 행 가운데가 카드 top 130, 좌우 11 inset의 52 높이
// charcoal/0 highlight. 위아래 값은 선택 값과 약 48 간격이라 행 높이 48로
// 잡고, highlight만 Figma대로 52로 둔다.
const CARD_HEIGHT = 236;
const CARD_BORDER_WIDTH = 1;
// 카드 바깥 top 기준. RN은 border를 높이에 포함하므로 padding에서 뺀다.
const CARD_PADDING_TOP = 19;
const SEGMENTED_HEIGHT = 36;
// Figma "Segmented / Meridiem" (3839:49222) — 161×36 트랙, padding 2 안에
// 78×32 pill 두 칸(사이 1px). 선택 pill은 별도 View로 두고 오전(0)↔오후(1)
// 사이를 translateX로만 슬라이드시킨다(오후 = 157 - 78 = 79).
const SEGMENTED_WIDTH = 161;
const SEGMENTED_PADDING = 2;
const SEGMENTED_PILL_WIDTH = 78;
const SEGMENTED_PILL_HEIGHT = SEGMENTED_HEIGHT - SEGMENTED_PADDING * 2;
const SEGMENTED_PILL_TRAVEL =
  SEGMENTED_WIDTH - SEGMENTED_PADDING * 2 - SEGMENTED_PILL_WIDTH;
const SEGMENTED_DURATION = 160;
const MERIDIEM_OPTIONS = [
  { key: "AM", label: "오전" },
  { key: "PM", label: "오후" },
] as const;
const ITEM_HEIGHT = 48;
// Odd so a single row lands exactly in the center of the viewport.
const VISIBLE_ITEMS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const SIDE_PADDING = (ITEM_HEIGHT * (VISIBLE_ITEMS - 1)) / 2;
const SELECTED_CENTER_TOP = 130;
const WHEEL_TOP = SELECTED_CENTER_TOP - (SIDE_PADDING + ITEM_HEIGHT / 2);
const WHEEL_MARGIN_TOP = WHEEL_TOP - (CARD_PADDING_TOP + SEGMENTED_HEIGHT);
const HIGHLIGHT_HEIGHT = 52;
const HIGHLIGHT_INSET = 11;
const HIGHLIGHT_COLOR = "#fafafa";
const COLUMN_WIDTH = 70;
const COLON_WIDTH = 25;
// Figma: 두 열의 중심이 92 / 233(327 기준)이라 열 사이 71 — colon 25를
// 가운데 두면 양옆 23씩 남는다.
const COLON_MARGIN = 23;

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

type WheelColumnProps = {
  items: number[];
  selectedValue: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
};

// A single scrollable wheel (hour or minute). Snaps to the nearest item and
// reports the centered value — the initial `contentOffset` positions the
// server's current value in the center without a visible jump; the effect
// below only matters if `selectedValue` changes from outside a user drag
// (e.g. wrapping), and is a no-op otherwise since the list is already there.
function WheelColumn({
  items,
  selectedValue,
  onChange,
  accessibilityLabel,
}: WheelColumnProps) {
  const listRef = useRef<FlatList<number>>(null);
  const selectedIndex = Math.max(0, items.indexOf(selectedValue));

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      const value = items[clampedIndex];
      if (value !== selectedValue) onChange(value);
    },
    [items, onChange, selectedValue],
  );

  return (
    <FlatList
      ref={listRef}
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={styles.wheelContent}
      contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
      data={items}
      decelerationRate="fast"
      getItemLayout={(_, index) => ({
        length: ITEM_HEIGHT,
        offset: SIDE_PADDING + ITEM_HEIGHT * index,
        index,
      })}
      keyExtractor={(item) => String(item)}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      renderItem={({ item }) => {
        const isSelected = item === selectedValue;
        return (
          <View style={styles.wheelItem}>
            <ThemedText
              style={isSelected ? styles.wheelTextSelected : styles.wheelText}
              typography={isSelected ? "title-2-bold" : "body-2-regular"}
            >
              {String(item).padStart(2, "0")}
            </ThemedText>
          </View>
        );
      }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      style={styles.wheelColumn}
    />
  );
}

type TimeWheelPickerProps = {
  value: OfferTimeParts;
  onChange: (value: OfferTimeParts) => void;
};

export function TimeWheelPicker({ value, onChange }: TimeWheelPickerProps) {
  // 0 = 오전, 1 = 오후. 실제 선택(value.meridiem)은 onChange로 즉시 바뀌고,
  // 이 값은 pill 위치·글자색 전환만 뒤따라간다.
  const meridiemProgress = useAnimatedValue(value.meridiem === "PM" ? 1 : 0);

  useEffect(() => {
    Animated.timing(meridiemProgress, {
      duration: SEGMENTED_DURATION,
      easing: Easing.out(Easing.quad),
      toValue: value.meridiem === "PM" ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [meridiemProgress, value.meridiem]);

  function handleMeridiemChange(meridiem: Meridiem) {
    if (meridiem !== value.meridiem) onChange({ ...value, meridiem });
  }

  return (
    <View style={styles.card}>
      <View style={styles.segmentedTrack}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segmentedPill,
            {
              transform: [
                {
                  translateX: meridiemProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, SEGMENTED_PILL_TRAVEL],
                  }),
                },
              ],
            },
          ]}
        />
        {MERIDIEM_OPTIONS.map((option) => {
          const isSelected = value.meridiem === option.key;
          // 이 옵션이 선택될수록(오전은 progress 0, 오후는 1) 흰색에 가깝다.
          const selectedness =
            option.key === "PM"
              ? meridiemProgress
              : meridiemProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                });
          return (
            <Pressable
              accessibilityLabel={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.key}
              onPress={() => handleMeridiemChange(option.key)}
              style={styles.segmentedOption}
            >
              <Animated.Text
                style={[
                  isSelected
                    ? typography["body-3-bold"]
                    : typography["body-3-medium"],
                  {
                    color: selectedness.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        primitiveColors.charcoal["5"],
                        semanticColors["primary-on"],
                      ],
                    }),
                  },
                ]}
              >
                {option.label}
              </Animated.Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.wheelRow}>
        <View pointerEvents="none" style={styles.highlightBand} />
        <WheelColumn
          accessibilityLabel="시"
          items={HOURS}
          onChange={(hour12) => onChange({ ...value, hour12 })}
          selectedValue={value.hour12}
        />
        <ThemedText style={styles.colon} typography="title-2-bold">
          :
        </ThemedText>
        <WheelColumn
          accessibilityLabel="분"
          items={MINUTES}
          onChange={(minute) => onChange({ ...value, minute })}
          selectedValue={value.minute}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-subtle"],
    borderRadius: 16,
    borderWidth: CARD_BORDER_WIDTH,
    height: CARD_HEIGHT,
    overflow: "hidden",
    paddingTop: CARD_PADDING_TOP - CARD_BORDER_WIDTH,
    width: "100%",
  },
  segmentedTrack: {
    alignSelf: "center",
    backgroundColor: semanticColors["fill-subtle"],
    borderRadius: radius.default,
    flexDirection: "row",
    height: SEGMENTED_HEIGHT,
    justifyContent: "space-between",
    padding: SEGMENTED_PADDING,
    position: "relative",
    width: SEGMENTED_WIDTH,
  },
  segmentedPill: {
    backgroundColor: primitiveColors.charcoal["11"],
    borderRadius: radius.default - SEGMENTED_PADDING,
    height: SEGMENTED_PILL_HEIGHT,
    left: SEGMENTED_PADDING,
    position: "absolute",
    top: SEGMENTED_PADDING,
    width: SEGMENTED_PILL_WIDTH,
  },
  segmentedOption: {
    alignItems: "center",
    height: SEGMENTED_PILL_HEIGHT,
    justifyContent: "center",
    width: SEGMENTED_PILL_WIDTH,
  },
  wheelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: WHEEL_MARGIN_TOP,
    position: "relative",
  },
  highlightBand: {
    backgroundColor: HIGHLIGHT_COLOR,
    borderRadius: radius.default,
    height: HIGHLIGHT_HEIGHT,
    left: HIGHLIGHT_INSET,
    position: "absolute",
    right: HIGHLIGHT_INSET,
    top: SIDE_PADDING + (ITEM_HEIGHT - HIGHLIGHT_HEIGHT) / 2,
  },
  wheelColumn: {
    height: WHEEL_HEIGHT,
    width: COLUMN_WIDTH,
  },
  wheelContent: {
    paddingVertical: SIDE_PADDING,
  },
  wheelItem: {
    alignItems: "center",
    height: ITEM_HEIGHT,
    justifyContent: "center",
  },
  wheelText: {
    color: primitiveColors.charcoal["3"],
  },
  wheelTextSelected: {
    color: primitiveColors.charcoal["11"],
  },
  colon: {
    color: primitiveColors.charcoal["11"],
    marginHorizontal: COLON_MARGIN,
    textAlign: "center",
    width: COLON_WIDTH,
  },
});
