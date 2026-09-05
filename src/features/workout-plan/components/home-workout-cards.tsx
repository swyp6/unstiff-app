import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import {
  getWorkoutPlanSummary,
  type WorkoutPlanDraft,
} from "@/features/workout-plan/model";

export type MissionStatus =
  "scheduled" | "revealed" | "accepted" | "completed" | "dismissed";

export type TodayWorkoutInstance = {
  id: string;
  sourcePlanId: string;
  title: string;
  subtitle: string;
  isDone: boolean;
  photoUrl?: string;
};

type MissionCardProps = {
  status: MissionStatus;
  canDismiss: boolean;
  onReveal: () => void;
  onAccept: () => void;
  onToggleComplete: () => void;
  onDismiss: () => void;
};

export function MissionCard({
  status,
  canDismiss,
  onReveal,
  onAccept,
  onToggleComplete,
  onDismiss,
}: MissionCardProps) {
  if (status === "dismissed") return null;

  const isAccepted = status === "accepted" || status === "completed";
  const isCompleted = status === "completed";

  return (
    <View className="rounded-[20px] border border-line-normal bg-background-normal px-5 py-[18px]">
      <View className="min-h-8 flex-row items-center justify-between">
        <ThemedText typography="caption-1-bold" themeColor="textSecondary">
          오늘의 미션
        </ThemedText>
        {status === "revealed" && (
          <View className="rounded-full bg-label-normal px-[9px] py-1">
            <ThemedText
              typography="caption-1-bold"
              style={{
                color: semanticColors["label-inverse"],
                letterSpacing: 0.6,
              }}
            >
              NEW
            </ThemedText>
          </View>
        )}
        {isAccepted && (
          <View className="size-8 items-center justify-center">
            {canDismiss && (
              <Pressable
                accessibilityLabel="오늘의 미션 닫기"
                accessibilityRole="button"
                className="size-8 items-center justify-center"
                hitSlop={8}
                onPress={onDismiss}
              >
                <Ionicons
                  color={semanticColors["label-subtle"]}
                  name="close"
                  size={20}
                />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {status === "scheduled" && (
        <View className="gap-5 pt-3">
          <ThemedText typography="title-3-bold">
            오전 10시에 도착해요
          </ThemedText>
          <MissionActionButton label="미리 받기" onPress={onReveal} outline />
        </View>
      )}

      {status === "revealed" && (
        <View className="gap-5 pt-3">
          <ThemedText typography="title-3-bold">15분 걷기</ThemedText>
          <MissionActionButton label="미션 수락하기" onPress={onAccept} />
        </View>
      )}

      {isAccepted && (
        <View className="flex-row items-center gap-3 pt-4">
          <Pressable
            accessibilityLabel={isCompleted ? "미션 완료 취소" : "미션 완료"}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isCompleted }}
            className={
              isCompleted
                ? "h-[34px] w-[34px] items-center justify-center rounded-full bg-label-normal"
                : "h-[34px] w-[34px] items-center justify-center rounded-full border border-line-strong"
            }
            hitSlop={8}
            onPress={onToggleComplete}
          >
            {isCompleted && (
              <Ionicons
                color={semanticColors["label-inverse"]}
                name="checkmark"
                size={16}
              />
            )}
          </Pressable>
          <View className="flex-1 gap-0.5">
            <ThemedText
              typography="body-3-bold"
              themeColor={isCompleted ? "textSecondary" : "text"}
              style={
                isCompleted ? { textDecorationLine: "line-through" } : null
              }
            >
              15분 걷기
            </ThemedText>
            <ThemedText
              typography="caption-1-regular"
              style={{
                color: isCompleted
                  ? semanticColors["label-disabled"]
                  : semanticColors["label-subtle"],
              }}
            >
              걷기 15분
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

function MissionActionButton({
  label,
  onPress,
  outline = false,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={
        outline
          ? "h-[50px] items-center justify-center rounded-2xl border border-line-strong"
          : "h-[50px] items-center justify-center rounded-2xl bg-label-normal"
      }
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <ThemedText
        typography="body-3-bold"
        style={outline ? undefined : { color: semanticColors["label-inverse"] }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

type TodayWorkoutCardProps = {
  dateLabel: string;
  expanded: boolean;
  todayWorkouts: TodayWorkoutInstance[];
  savedWorkoutPlans: WorkoutPlanDraft[];
  onToggleExpanded: () => void;
  onToggleTodayWorkout: (instanceId: string) => void;
  onAddSavedPlan: (plan: WorkoutPlanDraft) => void;
  onOpenSavedPlan: (planId: string) => void;
  onAddNewPlan: () => void;
};

export function TodayWorkoutCard({
  dateLabel,
  expanded,
  todayWorkouts,
  savedWorkoutPlans,
  onToggleExpanded,
  onToggleTodayWorkout,
  onAddSavedPlan,
  onOpenSavedPlan,
  onAddNewPlan,
}: TodayWorkoutCardProps) {
  const doneCount = todayWorkouts.filter((workout) => workout.isDone).length;

  return (
    <View className="rounded-[20px] border border-line-normal bg-background-normal">
      <Pressable
        accessibilityRole="button"
        className="h-[60px] flex-row items-center justify-between px-5"
        onPress={onToggleExpanded}
      >
        <View className="flex-row items-center gap-2">
          <ThemedText typography="body-2-bold">오늘의 운동</ThemedText>
          <ThemedText typography="caption-1-medium" themeColor="textSecondary">
            {dateLabel}
          </ThemedText>
        </View>
        <View className="flex-row items-center gap-3">
          {todayWorkouts.length > 0 && (
            <ThemedText typography="caption-1-bold" themeColor="textSecondary">
              {doneCount} / {todayWorkouts.length}
            </ThemedText>
          )}
          <Ionicons
            color={semanticColors["label-subtle"]}
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
          />
        </View>
      </Pressable>

      <View className="px-5 pb-5">
        <View className="h-px bg-line-subtle" />

        <View className="py-2">
          {todayWorkouts.length === 0 ? (
            <View className="items-center py-6">
              <ThemedText typography="body-3-medium" themeColor="textSecondary">
                오늘 담은 운동이 없어요
              </ThemedText>
            </View>
          ) : (
            todayWorkouts.map((workout) => (
              <TodayWorkoutRow
                key={workout.id}
                onOpenDetail={() => onOpenSavedPlan(workout.sourcePlanId)}
                onToggle={() => onToggleTodayWorkout(workout.id)}
                workout={workout}
              />
            ))
          )}
        </View>

        {/* 드롭다운(펼치기/접기)은 이 "저장된 운동 계획" 부분만 담당한다 —
            위의 오늘 담은 운동 목록은 항상 보인다. */}
        {expanded && (
          <>
            <ThemedText
              className="pb-1 pt-3"
              typography="caption-1-bold"
              themeColor="textSecondary"
            >
              저장된 운동 계획
            </ThemedText>

            {savedWorkoutPlans.map((plan) => (
              <SavedWorkoutPlanRow
                key={plan.id}
                plan={plan}
                onAdd={() => onAddSavedPlan(plan)}
                onOpenDetail={() => onOpenSavedPlan(plan.id)}
              />
            ))}

            <Pressable
              accessibilityRole="button"
              className="flex-row items-center gap-3 py-3"
              onPress={onAddNewPlan}
            >
              <View className="h-[34px] w-[34px] items-center justify-center rounded-full border border-dashed border-line-strong bg-fill-subtle">
                <Ionicons
                  color={semanticColors["label-subtle"]}
                  name="add"
                  size={16}
                />
              </View>
              <ThemedText typography="body-3-bold" themeColor="textSecondary">
                신규 운동 계획 추가
              </ThemedText>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function TodayWorkoutRow({
  workout,
  onToggle,
  onOpenDetail,
}: {
  workout: TodayWorkoutInstance;
  onToggle: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 border-b border-line-subtle py-3">
      <Pressable
        accessibilityLabel={workout.isDone ? "완료 취소" : "완료로 표시"}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: workout.isDone }}
        className={
          workout.isDone
            ? "h-[34px] w-[34px] items-center justify-center rounded-full bg-label-normal"
            : "h-[34px] w-[34px] items-center justify-center rounded-full border border-line-strong"
        }
        hitSlop={8}
        onPress={onToggle}
      >
        {workout.isDone && (
          <Ionicons
            color={semanticColors["label-inverse"]}
            name="checkmark"
            size={16}
          />
        )}
      </Pressable>
      <View className="flex-1 gap-0.5">
        <ThemedText
          typography="body-3-bold"
          themeColor={workout.isDone ? "textSecondary" : "text"}
          style={workout.isDone ? { textDecorationLine: "line-through" } : null}
        >
          {workout.title}
        </ThemedText>
        <ThemedText
          typography="caption-1-regular"
          style={{
            color: workout.isDone
              ? semanticColors["label-disabled"]
              : semanticColors["label-subtle"],
          }}
        >
          {workout.subtitle}
        </ThemedText>
      </View>
      <Pressable
        accessibilityLabel={`${workout.title} 상세 보기`}
        accessibilityRole="button"
        className="h-[34px] w-[34px] items-center justify-center"
        hitSlop={4}
        onPress={onOpenDetail}
      >
        <Ionicons
          color={semanticColors["label-subtle"]}
          name="ellipsis-vertical"
          size={20}
        />
      </Pressable>
    </View>
  );
}

function SavedWorkoutPlanRow({
  plan,
  onAdd,
  onOpenDetail,
}: {
  plan: WorkoutPlanDraft;
  onAdd: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 border-b border-line-subtle py-3">
      <Pressable
        accessibilityLabel={`${plan.title} 오늘의 운동에 추가`}
        accessibilityRole="button"
        className="h-[34px] w-[34px] items-center justify-center rounded-full border border-line-normal bg-fill-subtle"
        onPress={onAdd}
      >
        <Ionicons color={semanticColors["label-subtle"]} name="add" size={16} />
      </Pressable>
      <View className="flex-1 gap-0.5">
        <ThemedText typography="body-3-bold">{plan.title}</ThemedText>
        <ThemedText
          typography="caption-1-regular"
          style={{ color: semanticColors["label-disabled"] }}
        >
          {getWorkoutPlanSummary(plan)}
        </ThemedText>
      </View>
      <Pressable
        accessibilityLabel={`${plan.title} 상세 보기`}
        accessibilityRole="button"
        className="h-[34px] w-[34px] items-center justify-center"
        hitSlop={4}
        onPress={onOpenDetail}
      >
        <Ionicons
          color={semanticColors["label-subtle"]}
          name="ellipsis-vertical"
          size={20}
        />
      </Pressable>
    </View>
  );
}
