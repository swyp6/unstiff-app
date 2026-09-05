import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import type { StartTime } from "@/features/workout-plan/model";

import { WorkoutPlanBottomSheet } from "./workout-plan-bottom-sheet";

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);
const PERIOD_ITEMS = [
  { label: "오전", value: "AM" },
  { label: "오후", value: "PM" },
];
const HOUR_ITEMS = HOURS.map((value) => ({
  label: String(value),
  value: String(value),
}));
const MINUTE_ITEMS = MINUTES.map((value) => ({
  label: String(value).padStart(2, "0"),
  value: String(value),
}));
const DEFAULT_START_TIME = { period: "PM" as const, hour: 7, minute: 0 };
const PICKER_ROW_HEIGHT = 40;
const PICKER_HEIGHT = 200;
const PICKER_VERTICAL_INSET = 80;
const LOOP_COUNT = 101;

function createTimeDraft(value: StartTime) {
  if (!value) return DEFAULT_START_TIME;
  const minute = MINUTES.includes(value.minute)
    ? value.minute
    : Math.min(55, Math.round(value.minute / 5) * 5);
  return { ...value, minute };
}

type TimePickerBottomSheetProps = {
  visible: boolean;
  embedded?: boolean;
  value: StartTime;
  onClose: () => void;
  onConfirm: (value: StartTime) => void;
};

export function TimePickerBottomSheet({
  visible,
  embedded = false,
  value,
  onClose,
  onConfirm,
}: TimePickerBottomSheetProps) {
  const [draft, setDraft] = useState(() => createTimeDraft(value));

  return (
    <WorkoutPlanBottomSheet
      embedded={embedded}
      onClose={onClose}
      title="예상 시작 시간"
      visible={visible}
    >
      <View style={styles.pickerFrame}>
        <View pointerEvents="none" style={styles.selectionOverlay} />
        <PickerColumn
          columnStyle={styles.periodColumn}
          items={PERIOD_ITEMS}
          loop={false}
          onChange={(next) =>
            setDraft((current) => ({
              ...current,
              period: next as "AM" | "PM",
            }))
          }
          selected={draft.period}
        />
        <PickerColumn
          columnStyle={styles.hourColumn}
          items={HOUR_ITEMS}
          onChange={(next) =>
            setDraft((current) => ({ ...current, hour: Number(next) }))
          }
          selected={String(draft.hour)}
        />
        <View pointerEvents="none" style={[styles.unit, styles.hourUnit]}>
          <ThemedText style={styles.unitText} typography="caption-1-regular">
            시
          </ThemedText>
        </View>
        <PickerColumn
          columnStyle={styles.minuteColumn}
          items={MINUTE_ITEMS}
          onChange={(next) =>
            setDraft((current) => ({ ...current, minute: Number(next) }))
          }
          selected={String(draft.minute)}
        />
        <View pointerEvents="none" style={[styles.unit, styles.minuteUnit]}>
          <ThemedText style={styles.unitText} typography="caption-1-regular">
            분
          </ThemedText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => onConfirm(draft)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={styles.confirmButton}>
          <ThemedText style={styles.confirmText} typography="body-2-bold">
            확인
          </ThemedText>
        </View>
      </Pressable>

      <Pressable
        accessibilityLabel="시작 시간 설정 안함"
        accessibilityRole="button"
        onPress={() => onConfirm(null)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={styles.unsetLink}>
          <ThemedText typography="body-3-medium" themeColor="textSecondary">
            설정 안함
          </ThemedText>
        </View>
      </Pressable>
    </WorkoutPlanBottomSheet>
  );
}

type PickerColumnProps = {
  items: { label: string; value: string }[];
  selected: string;
  onChange: (value: string) => void;
  columnStyle: object;
  loop?: boolean;
};

function PickerColumn({
  items,
  selected,
  onChange,
  columnStyle,
  loop = true,
}: PickerColumnProps) {
  const selectedIndex = items.findIndex((item) => item.value === selected);
  const initialIndex = loop
    ? Math.floor(LOOP_COUNT / 2) * items.length + Math.max(selectedIndex, 0)
    : Math.max(selectedIndex, 0);
  const loopedItems = useMemo(
    () =>
      loop
        ? Array.from({ length: LOOP_COUNT }, () => items).flatMap(
            (cycle) => cycle,
          )
        : items,
    [items, loop],
  );
  const listRef = useRef<FlatList<(typeof items)[number]>>(null);
  const activeIndexRef = useRef(initialIndex);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const updateSelection = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.max(
      0,
      Math.min(
        loopedItems.length - 1,
        Math.round(event.nativeEvent.contentOffset.y / PICKER_ROW_HEIGHT),
      ),
    );
    if (nextIndex === activeIndexRef.current) return;

    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    onChange(loopedItems[nextIndex].value);
  };

  const recenterIfNeeded = () => {
    if (!loop) return;

    const edgeBuffer = items.length * 2;
    if (
      activeIndexRef.current >= edgeBuffer &&
      activeIndexRef.current < loopedItems.length - edgeBuffer
    ) {
      return;
    }

    const itemIndex = activeIndexRef.current % items.length;
    const centeredIndex = Math.floor(LOOP_COUNT / 2) * items.length + itemIndex;
    activeIndexRef.current = centeredIndex;
    setActiveIndex(centeredIndex);
    listRef.current?.scrollToOffset({
      animated: false,
      offset: centeredIndex * PICKER_ROW_HEIGHT,
    });
  };

  const finishScrolling = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateSelection(event);
    recenterIfNeeded();
  };

  return (
    <View style={[styles.column, columnStyle]}>
      <FlatList
        {...(loop
          ? { initialScrollIndex: initialIndex }
          : {
              contentOffset: {
                x: 0,
                y: initialIndex * PICKER_ROW_HEIGHT,
              },
            })}
        contentContainerStyle={styles.columnContent}
        data={loopedItems}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          index,
          length: PICKER_ROW_HEIGHT,
          offset: PICKER_ROW_HEIGHT * index,
        })}
        keyExtractor={(item, index) => `${item.value}-${index}`}
        nestedScrollEnabled
        onMomentumScrollEnd={finishScrolling}
        onScroll={updateSelection}
        ref={listRef}
        renderItem={({ item, index }) => {
          const distance = Math.abs(index - activeIndex);
          const isSelected = distance === 0;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() =>
                listRef.current?.scrollToIndex({ animated: true, index })
              }
              style={styles.option}
            >
              <ThemedText
                style={[
                  isSelected ? styles.selectedOptionText : styles.optionText,
                  distance === 1 && styles.nearbyOptionText,
                  distance >= 2 && styles.farOptionText,
                ]}
                typography={isSelected ? "title-3-bold" : "body-1-regular"}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          );
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={PICKER_ROW_HEIGHT}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pickerFrame: {
    backgroundColor: semanticColors["fill-subtle"],
    borderRadius: 14,
    height: PICKER_HEIGHT,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  unit: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    position: "absolute",
    top: 78,
    width: 20,
    zIndex: 2,
  },
  hourUnit: {
    left: "55%",
  },
  minuteUnit: {
    left: "83%",
  },
  unitText: {
    color: semanticColors["label-subtle"],
  },
  column: {
    height: PICKER_HEIGHT,
    overflow: "hidden",
    position: "absolute",
    top: 0,
    zIndex: 1,
  },
  periodColumn: {
    left: "8%",
    width: "20%",
  },
  hourColumn: {
    left: "38%",
    width: "20%",
  },
  minuteColumn: {
    left: "65%",
    width: "20%",
  },
  columnContent: {
    paddingVertical: PICKER_VERTICAL_INSET,
  },
  selectionOverlay: {
    backgroundColor: semanticColors["background-normal"],
    borderRadius: 10,
    height: 44,
    left: 0,
    position: "absolute",
    right: 0,
    top: 78,
  },
  option: {
    alignItems: "center",
    height: PICKER_ROW_HEIGHT,
    justifyContent: "center",
  },
  optionText: {
    color: semanticColors["label-disabled"],
    opacity: 0.28,
  },
  nearbyOptionText: {
    opacity: 0.55,
  },
  farOptionText: {
    opacity: 0.28,
  },
  selectedOptionText: {
    color: semanticColors["label-normal"],
  },
  unsetLink: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginTop: 4,
    width: "100%",
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: semanticColors["label-normal"],
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 16,
    height: 54,
  },
  confirmText: {
    color: semanticColors["label-inverse"],
  },
  pressed: {
    opacity: 0.7,
  },
});
