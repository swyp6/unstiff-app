import { useCallback, useRef } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";

import type { Meridiem, OfferTimeParts } from "../offer-time";

const ITEM_HEIGHT = 44;
// Odd so a single row lands exactly in the center of the viewport.
const VISIBLE_ITEMS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const SIDE_PADDING = (ITEM_HEIGHT * (VISIBLE_ITEMS - 1)) / 2;

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
  function handleMeridiemChange(meridiem: Meridiem) {
    if (meridiem !== value.meridiem) onChange({ ...value, meridiem });
  }

  return (
    <View style={styles.card}>
      <View style={styles.segmentedTrack}>
        {(
          [
            { key: "AM" as const, label: "오전" },
            { key: "PM" as const, label: "오후" },
          ] as const
        ).map((option) => {
          const isSelected = value.meridiem === option.key;
          return (
            <Pressable
              accessibilityLabel={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.key}
              onPress={() => handleMeridiemChange(option.key)}
              style={[
                styles.segmentedOption,
                isSelected && styles.segmentedOptionSelected,
              ]}
            >
              <ThemedText
                style={
                  isSelected
                    ? styles.segmentedLabelSelected
                    : styles.segmentedLabel
                }
                typography={isSelected ? "body-3-bold" : "body-3-medium"}
              >
                {option.label}
              </ThemedText>
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
    borderWidth: 1,
    paddingBottom: 16,
    paddingTop: 16,
    width: "100%",
  },
  segmentedTrack: {
    alignSelf: "center",
    backgroundColor: semanticColors["fill-subtle"],
    borderRadius: radius.default,
    flexDirection: "row",
    height: 36,
    padding: 2,
    width: 161,
  },
  segmentedOption: {
    alignItems: "center",
    borderRadius: radius.default - 2,
    flex: 1,
    justifyContent: "center",
  },
  segmentedOptionSelected: {
    backgroundColor: semanticColors["background-normal"],
  },
  segmentedLabel: {
    color: semanticColors["label-subtle"],
  },
  segmentedLabelSelected: {
    color: semanticColors["label-normal"],
  },
  wheelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    position: "relative",
  },
  highlightBand: {
    backgroundColor: semanticColors["fill-subtle"],
    borderRadius: radius.default,
    height: ITEM_HEIGHT,
    left: 12,
    position: "absolute",
    right: 12,
    top: SIDE_PADDING,
  },
  wheelColumn: {
    height: WHEEL_HEIGHT,
    width: 70,
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
    color: semanticColors["label-disabled"],
  },
  wheelTextSelected: {
    color: semanticColors["label-normal"],
  },
  colon: {
    color: semanticColors["label-normal"],
    marginHorizontal: 4,
  },
});
