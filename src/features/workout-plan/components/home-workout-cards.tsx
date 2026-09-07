import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import {
  getWorkoutPlanSummary,
  type WorkoutPlanDraft,
} from "@/features/workout-plan/model";

const MISSION_ILLUSTRATION = require("@/assets/home/mission-illustration.png");

export type MissionStatus =
  "scheduled" | "revealed" | "accepted" | "completed" | "dismissed";

export type TodayWorkoutInstance = {
  id: string;
  // 저장된 계획에서 복사해온 완전히 독립적인 사본 — 원본이 나중에
  // 수정/삭제돼도 영향받지 않는다. 상세/수정 화면도 이 사본을 직접
  // 편집한다.
  plan: WorkoutPlanDraft;
  isDone: boolean;
  photoUrl?: string;
};

type MissionCardProps = {
  status: MissionStatus;
  canDismiss: boolean;
  // NOT_OFFERED 상태일 때만 쓰는 "오전 10시에 도착해요" 문구.
  arrivalLabel: string;
  // OFFERED 이후에만 서버가 내려주는 실제 미션 내용.
  title: string;
  description: string;
  onReveal: () => void;
  onAccept: () => void;
  onToggleComplete: () => void;
  onDismiss: () => void;
};

export function MissionCard({
  status,
  canDismiss,
  arrivalLabel,
  title,
  description,
  onReveal,
  onAccept,
  onToggleComplete,
  onDismiss,
}: MissionCardProps) {
  if (status === "dismissed") return null;

  const isAccepted = status === "accepted" || status === "completed";
  const isCompleted = status === "completed";

  return (
    <View className="rounded-[24px] bg-background-normal px-5 py-[18px] shadow-[0px_4px_6px_rgba(0,0,0,0.04)]">
      <View className="min-h-8 flex-row items-center justify-between">
        <View>
          {/* Figma node 3502:36610(scheduled)에는 이 라벨이 없다 — 대신
              아래 중앙 정렬된 콘텐츠 안에 오렌지색으로 들어간다. */}
          {status !== "scheduled" && (
            <ThemedText typography="caption-1-bold" themeColor="textSecondary">
              오늘의 미션
            </ThemedText>
          )}
        </View>
        <View className="flex-row items-center gap-2">
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
          {/* 미션 수락 여부와 무관하게, 오늘의 운동에 완료된 항목이 하나라도
              있으면(canDismiss) 미션 카드를 닫을 수 있다. */}
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
      </View>

      {status === "scheduled" && (
        <View className="items-center gap-4 pt-3">
          <View className="items-center gap-1">
            <ThemedText
              typography="caption-1-bold"
              style={{ color: primitiveColors.orange["500"] }}
            >
              오늘의 미션
            </ThemedText>
            <ThemedText typography="title-3-bold">{arrivalLabel}</ThemedText>
          </View>
          <Image
            source={MISSION_ILLUSTRATION}
            style={{ width: 120, height: 120, borderRadius: 16 }}
            contentFit="cover"
          />
          <MissionActionButton label="미리 받기" onPress={onReveal} soft />
        </View>
      )}

      {status === "revealed" && (
        <View className="gap-5 pt-3">
          <ThemedText typography="title-3-bold">{title}</ThemedText>
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
              {title}
            </ThemedText>
            <ThemedText
              typography="caption-1-regular"
              style={{
                color: isCompleted
                  ? semanticColors["label-disabled"]
                  : semanticColors["label-subtle"],
              }}
            >
              {description}
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
  soft = false,
}: {
  label: string;
  onPress: () => void;
  // Figma node 3502:36610의 "미리 받기" 버튼 스타일(연한 오렌지 배경 pill).
  soft?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={
        soft
          ? "h-[50px] w-full items-center justify-center rounded-full bg-orange-50"
          : "h-[50px] items-center justify-center rounded-2xl bg-label-normal"
      }
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <ThemedText
        typography="body-3-bold"
        style={{
          color: soft
            ? primitiveColors.orange["700"]
            : semanticColors["label-inverse"],
        }}
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
  // 오늘의 운동 항목은 저장된 계획과 독립된 자기 사본(workout.plan)을 갖고
  // 있어서, 상세/수정도 그 사본을 직접 연다 — onOpenSavedPlan과 달리
  // savedWorkoutPlans 목록을 조회하지 않는다.
  onOpenWorkoutDetail: (instanceId: string) => void;
  onAddNewPlan: () => void;
  // 오늘이 아닌 미래 날짜를 보고 있을 때(Figma node 2910-4774/2918-4983):
  // 제목·빈 상태 문구가 바뀌고, 아직 안 지난 날이라 완료 체크는 없앤다 —
  // 수정(⋮)은 미래 날짜에도 그대로 가능해야 한다.
  title?: string;
  emptyStateLabel?: string;
  readOnly?: boolean;
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
  onOpenWorkoutDetail,
  onAddNewPlan,
  title = "오늘의 운동",
  emptyStateLabel = "오늘 담은 운동이 없어요",
  readOnly = false,
}: TodayWorkoutCardProps) {
  const doneCount = todayWorkouts.filter((workout) => workout.isDone).length;

  return (
    <View className="rounded-[24px] bg-background-normal shadow-[0px_4px_12px_0px_rgba(92,23,5,0.04)]">
      <View className="h-[60px] flex-row items-center justify-between px-5">
        <View className="items-start gap-0.5">
          <ThemedText typography="body-2-bold">{title}</ThemedText>
          <ThemedText typography="caption-1-medium" themeColor="textSecondary">
            {dateLabel}
          </ThemedText>
        </View>
        {!readOnly && todayWorkouts.length > 0 && (
          <ThemedText typography="caption-1-bold" themeColor="textSecondary">
            {doneCount} / {todayWorkouts.length}
          </ThemedText>
        )}
      </View>

      <View className="px-5 pb-5">
        <View className="h-px bg-line-subtle" />

        <View className="py-2">
          {todayWorkouts.length === 0 ? (
            <View className="items-center py-6">
              <ThemedText typography="body-3-medium" themeColor="textSecondary">
                {emptyStateLabel}
              </ThemedText>
            </View>
          ) : (
            todayWorkouts.map((workout) => (
              <TodayWorkoutRow
                key={workout.id}
                onOpenDetail={() => onOpenWorkoutDetail(workout.id)}
                onToggle={
                  readOnly ? undefined : () => onToggleTodayWorkout(workout.id)
                }
                workout={workout}
              />
            ))
          )}
        </View>

        {/* Figma node 3502:36611 "루틴 헤더": 펼치기/접기 드롭다운이 카드
            상단이 아니라 이 "루틴" 라벨과 같은 줄에 있다 — 라벨/화살표는
            항상 보이고, 그 아래 저장된 운동 계획 목록만 expanded에 따라
            접힌다. */}
        <Pressable
          accessibilityRole="button"
          className="flex-row items-center justify-between py-1.5 pt-3"
          onPress={onToggleExpanded}
        >
          <ThemedText typography="caption-1-bold" themeColor="textSecondary">
            루틴
          </ThemedText>
          <Ionicons
            color={semanticColors["label-subtle"]}
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
          />
        </Pressable>

        {expanded && (
          <>
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
  onToggle?: () => void;
  onOpenDetail?: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 border-b border-line-subtle py-3">
      {onToggle && (
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
      )}
      <View className="flex-1 gap-0.5">
        <ThemedText
          typography="body-3-bold"
          themeColor={workout.isDone ? "textSecondary" : "text"}
          style={workout.isDone ? { textDecorationLine: "line-through" } : null}
        >
          {workout.plan.title}
        </ThemedText>
        <ThemedText
          typography="caption-1-regular"
          style={{
            color: workout.isDone
              ? semanticColors["label-disabled"]
              : semanticColors["label-subtle"],
          }}
        >
          {getWorkoutPlanSummary(workout.plan)}
        </ThemedText>
      </View>
      {onOpenDetail && (
        <Pressable
          accessibilityLabel={`${workout.plan.title} 상세 보기`}
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
      )}
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
