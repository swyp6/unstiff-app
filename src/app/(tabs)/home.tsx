import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { semanticColors } from "@/constants/tokens";
import { useTheme } from "@/hooks/use-theme";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

// Mock history for the current month — no records API exists yet, so this
// stands in for "days with a photo" and "days with more than one photo"
// until real data is wired up. Matches the Figma "계획됨"/"완료" examples.
const MOCK_PHOTO_DAYS = new Set([4, 5, 6, 8, 10, 11, 12, 13, 14, 17, 18]);
const MOCK_MULTI_PHOTO_DAYS = new Set([6, 11]);

const SUGGESTED_MISSION = {
  title: "가볍게 15분 걷기",
  subtitle: "최근 이틀 쉬었으니 가볍게 시작해요",
  durationLabel: "15분",
  tags: ["15분", "가볍게", "야외"],
};

type WorkoutPlanItem = {
  id: string;
  title: string;
  subtitle: string;
  isMission: boolean;
  isDone: boolean;
};

function buildCalendarWeeks(reference: Date): (number | null)[][] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0..Sun=6

  const days: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (days.length % 7 !== 0) days.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export default function HomeScreen() {
  const theme = useTheme();
  const [isTodayCardExpanded, setIsTodayCardExpanded] = useState(true);
  const [planItems, setPlanItems] = useState<WorkoutPlanItem[]>([]);
  const [hasDeclinedMission, setHasDeclinedMission] = useState(false);
  const [isMissionPopupVisible, setIsMissionPopupVisible] = useState(true);

  const today = new Date();
  const weeks = buildCalendarWeeks(today);
  const monthLabel = `${today.getFullYear()}년 ${today.getMonth() + 1}월`;

  const doneCount = planItems.filter((item) => item.isDone).length;
  const isTodayRecorded = doneCount > 0;
  const monthlyRecordCount =
    MOCK_PHOTO_DAYS.size +
    (isTodayRecorded && !MOCK_PHOTO_DAYS.has(today.getDate()) ? 1 : 0);

  const cardVariant: "mission" | "empty" | "planned" =
    planItems.length > 0 ? "planned" : hasDeclinedMission ? "empty" : "mission";

  function acceptMission() {
    setPlanItems((items) => [
      ...items,
      {
        id: "mission",
        title: SUGGESTED_MISSION.title,
        subtitle: SUGGESTED_MISSION.durationLabel,
        isMission: true,
        isDone: false,
      },
    ]);
    setIsMissionPopupVisible(false);
  }

  function declineMission() {
    setHasDeclinedMission(true);
    setIsMissionPopupVisible(false);
  }

  function addQuickPlanItem() {
    setPlanItems((items) => [
      ...items,
      {
        id: `plan-${items.length}-${Date.now()}`,
        title: "새 운동 계획",
        subtitle: "30분",
        isMission: false,
        isDone: false,
      },
    ]);
  }

  function togglePlanItemDone(id: string) {
    setPlanItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, isDone: !item.isDone } : item,
      ),
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.three,
            paddingBottom: Spacing.four,
            gap: Spacing.four,
          }}
        >
          <View className="h-10 flex-row items-center justify-between">
            <ThemedText typography="title-2-bold">LOGO</ThemedText>
            <Pressable
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="알림"
              onPress={() => console.log("notifications pressed")}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color={theme.text}
              />
            </Pressable>
          </View>

          <View className="gap-1.5">
            <Pressable
              className="flex-row items-center gap-1"
              accessibilityRole="button"
              accessibilityLabel="월 선택"
              onPress={() => console.log("month picker pressed")}
            >
              <ThemedText typography="body-3-medium" themeColor="textSecondary">
                {monthLabel}
              </ThemedText>
              <Ionicons
                name="chevron-down"
                size={12}
                color={theme.textSecondary}
              />
            </Pressable>
            <View className="flex-row items-baseline gap-1.5">
              <ThemedText typography="display-1-bold">
                {monthlyRecordCount}
              </ThemedText>
              <ThemedText typography="body-2-medium" themeColor="textSecondary">
                일 기록 / 이번 달
              </ThemedText>
            </View>
          </View>

          <View className="gap-1.5">
            <View className="flex-row items-center justify-between">
              {WEEKDAY_LABELS.map((label) => (
                <View key={label} className="w-[43px] items-center">
                  <ThemedText
                    typography="caption-1-bold"
                    themeColor="textSecondary"
                  >
                    {label}
                  </ThemedText>
                </View>
              ))}
            </View>

            {weeks.map((week, weekIndex) => (
              <View
                key={weekIndex}
                className="flex-row items-center justify-between"
              >
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return (
                      <View key={dayIndex} className="h-[60px] w-[43px]" />
                    );
                  }

                  const isToday = day === today.getDate();
                  const hasPhoto =
                    MOCK_PHOTO_DAYS.has(day) || (isToday && isTodayRecorded);
                  const hasMultiplePhotos = MOCK_MULTI_PHOTO_DAYS.has(day);

                  const textColor = isToday
                    ? semanticColors["label-normal"]
                    : hasPhoto
                      ? semanticColors["label-normal"]
                      : day > today.getDate()
                        ? semanticColors["label-disabled"]
                        : semanticColors["label-subtle"];

                  return (
                    <View
                      key={dayIndex}
                      className={
                        isToday
                          ? `h-[60px] w-[43px] items-start rounded-lg border-2 p-1.5 ${
                              isTodayRecorded
                                ? "border-solid border-label-normal bg-fill-normal"
                                : "border-dashed border-label-normal"
                            }`
                          : hasPhoto
                            ? "h-[60px] w-[43px] items-start rounded-lg bg-fill-normal p-1.5"
                            : "h-[60px] w-[43px] items-start p-1.5"
                      }
                    >
                      {hasMultiplePhotos && !isToday && (
                        <View
                          className="absolute -top-1 left-2 h-[52px] w-[35px] rounded-lg border-[1.5px] border-background-normal bg-fill-subtle"
                          style={{ zIndex: -1 }}
                        />
                      )}
                      <ThemedText
                        typography={
                          isToday ? "caption-1-bold" : "caption-1-regular"
                        }
                        style={{ color: textColor }}
                      >
                        {day}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {cardVariant !== "mission" && (
            <View className="flex-row items-center gap-3.5 rounded-2xl bg-fill-subtle px-[18px] py-4">
              <Ionicons name="camera-outline" size={26} color={theme.text} />
              <View className="flex-1 gap-0.5">
                <ThemedText typography="body-3-bold">
                  운동한 날을 사진으로 남겨보세요
                </ThemedText>
                <ThemedText
                  typography="caption-1-regular"
                  style={{ color: semanticColors["label-disabled"] }}
                >
                  기록한 사진이 이 달력에 쌓여요
                </ThemedText>
              </View>
            </View>
          )}

          <View
            className={
              cardVariant === "mission"
                ? "rounded-[20px] border-[1.5px] border-label-normal"
                : "rounded-[20px] border border-line-normal"
            }
          >
            {cardVariant === "mission" ? (
              <View>
                <View className="h-[54px] flex-row items-center justify-between px-5 pt-[18px]">
                  <ThemedText typography="body-2-bold">오늘의 미션</ThemedText>
                  <View className="rounded-full bg-label-normal px-[9px] py-1">
                    <ThemedText
                      typography="caption-1-bold"
                      style={{ color: "#ffffff", letterSpacing: 0.6 }}
                    >
                      NEW
                    </ThemedText>
                  </View>
                </View>

                <View className="gap-2 px-5 pb-4">
                  <ThemedText typography="title-3-bold">
                    {SUGGESTED_MISSION.title}
                  </ThemedText>
                  <View className="flex-row items-center gap-2">
                    {SUGGESTED_MISSION.tags.map((tag) => (
                      <View
                        key={tag}
                        className="rounded-lg bg-fill-subtle px-2.5 py-[5px]"
                      >
                        <ThemedText
                          typography="caption-1-bold"
                          themeColor="textSecondary"
                        >
                          {tag}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>

                <View className="h-px bg-line-subtle" />

                <View className="gap-1 px-5 py-4">
                  <Pressable
                    className="items-center justify-center rounded-2xl bg-label-normal py-4"
                    accessibilityRole="button"
                    onPress={acceptMission}
                  >
                    <ThemedText
                      typography="body-2-bold"
                      style={{ color: "#ffffff" }}
                    >
                      이걸로 할게요
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    className="items-center justify-center py-3"
                    accessibilityRole="button"
                    onPress={declineMission}
                  >
                    <ThemedText
                      typography="body-3-bold"
                      style={{ color: semanticColors["label-disabled"] }}
                    >
                      오늘은 안 할래요
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View>
                <Pressable
                  className="h-[55px] flex-row items-center justify-between px-5"
                  accessibilityRole="button"
                  onPress={() =>
                    setIsTodayCardExpanded((expanded) => !expanded)
                  }
                >
                  <ThemedText typography="body-2-bold">오늘의 운동</ThemedText>
                  <View className="flex-row items-center gap-3">
                    {cardVariant === "planned" && (
                      <ThemedText
                        typography="caption-1-bold"
                        themeColor="textSecondary"
                      >
                        {doneCount} / {planItems.length}
                      </ThemedText>
                    )}
                    <Ionicons
                      name={isTodayCardExpanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={theme.textSecondary}
                    />
                  </View>
                </Pressable>

                {isTodayCardExpanded && (
                  <View className="px-5 pb-2">
                    {cardVariant === "empty" && (
                      <View className="items-center gap-2 pb-3 pt-2">
                        <ThemedText
                          typography="body-3-medium"
                          themeColor="textSecondary"
                        >
                          오늘 계획된 운동이 없어요
                        </ThemedText>
                        <ThemedText
                          typography="caption-1-regular"
                          style={{ color: semanticColors["label-disabled"] }}
                        >
                          아래에서 계획을 세워보세요
                        </ThemedText>
                      </View>
                    )}

                    {cardVariant === "planned" &&
                      planItems.map((item) => (
                        <View key={item.id}>
                          <View className="flex-row items-center gap-5 py-3">
                            <View className="size-10 rounded-[10px] bg-fill-normal" />
                            <View className="flex-1 gap-0.5">
                              <ThemedText
                                typography="body-3-bold"
                                themeColor={
                                  item.isDone ? "textSecondary" : "text"
                                }
                                style={
                                  item.isDone
                                    ? { textDecorationLine: "line-through" }
                                    : undefined
                                }
                              >
                                {item.title}
                              </ThemedText>
                              <ThemedText
                                typography="caption-1-regular"
                                style={{
                                  color: semanticColors["label-disabled"],
                                }}
                              >
                                {item.subtitle}
                              </ThemedText>
                            </View>
                            {item.isMission && (
                              <View className="rounded-md bg-fill-subtle px-2 py-1">
                                <ThemedText
                                  typography="caption-1-bold"
                                  themeColor="textSecondary"
                                >
                                  미션
                                </ThemedText>
                              </View>
                            )}
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={
                                item.isDone ? "완료 취소" : "완료로 표시"
                              }
                              onPress={() => togglePlanItemDone(item.id)}
                              className={
                                item.isDone
                                  ? "size-6 items-center justify-center rounded-full bg-label-normal"
                                  : "size-6 items-center justify-center rounded-full border border-line-strong"
                              }
                            >
                              {item.isDone && (
                                <Ionicons
                                  name="checkmark"
                                  size={14}
                                  color="#ffffff"
                                />
                              )}
                            </Pressable>
                          </View>
                          <View className="h-px bg-line-subtle" />
                        </View>
                      ))}

                    <Pressable
                      className="flex-row items-center gap-5 py-3"
                      accessibilityRole="button"
                      onPress={addQuickPlanItem}
                    >
                      <View className="size-10 items-center justify-center rounded-[10px] border border-dashed border-line-strong">
                        <Ionicons
                          name="add"
                          size={18}
                          color={theme.textSecondary}
                        />
                      </View>
                      <ThemedText
                        typography="body-3-bold"
                        themeColor="textSecondary"
                      >
                        운동 계획 추가
                      </ThemedText>
                    </Pressable>
                  </View>
                )}

                <View className="px-5 pb-5 pt-1">
                  <Pressable
                    className="items-center justify-center rounded-2xl bg-label-normal py-[15px]"
                    accessibilityRole="button"
                    onPress={() => console.log("운동 기록하기 pressed")}
                  >
                    <ThemedText
                      typography="body-3-bold"
                      style={{ color: "#ffffff" }}
                    >
                      운동 기록하기
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={isMissionPopupVisible && cardVariant === "mission"}
        transparent
        animationType="fade"
        onRequestClose={declineMission}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-5">
          <View className="w-full max-w-[303px] rounded-3xl bg-background-normal p-6">
            <View className="items-center">
              <View className="h-[150px] w-[180px] items-center justify-center rounded-2xl bg-fill-subtle">
                <View className="absolute -bottom-3 rounded-full border-[3px] border-background-normal bg-label-normal px-3.5 py-1.5">
                  <ThemedText
                    typography="caption-1-bold"
                    style={{ color: "#ffffff", letterSpacing: 0.4 }}
                  >
                    오늘의 미션
                  </ThemedText>
                </View>
              </View>
            </View>

            <View className="gap-2 pt-6" style={{ alignItems: "center" }}>
              <ThemedText
                typography="title-3-bold"
                style={{ textAlign: "center" }}
              >
                {SUGGESTED_MISSION.title}
              </ThemedText>
              <ThemedText
                typography="body-3-regular"
                themeColor="textSecondary"
                style={{ textAlign: "center" }}
              >
                {SUGGESTED_MISSION.subtitle}
              </ThemedText>
            </View>

            <Pressable
              className="mt-6 items-center justify-center rounded-2xl bg-label-normal py-4"
              accessibilityRole="button"
              onPress={() => setIsMissionPopupVisible(false)}
            >
              <ThemedText typography="body-2-bold" style={{ color: "#ffffff" }}>
                확인했어요
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}
