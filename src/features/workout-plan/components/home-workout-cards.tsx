import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import {
  formatStopwatchTime,
  getWorkoutPlanSummary,
  type WorkoutPlanDraft,
} from "@/features/workout-plan/model";

const MISSION_ILLUSTRATION = require("@/assets/home/mission-illustration.png");

export type MissionStatus =
  "scheduled" | "revealed" | "accepted" | "completed" | "dismissed";

// 시작 시각(startedAt) 기준으로 경과시간을 계산해서, 앱이 백그라운드로
// 갔다 와도(setInterval이 멈춰도) 실제 벽시계 기준으로 정확하게 이어진다.
export type StopwatchState = {
  elapsedSeconds: number;
  isRunning: boolean;
  startedAt: number | null;
};

export type TodayWorkoutInstance = {
  id: string;
  // 저장된 계획에서 복사해온 완전히 독립적인 사본 — 원본이 나중에
  // 수정/삭제돼도 영향받지 않는다. 상세/수정 화면도 이 사본을 직접
  // 편집한다.
  plan: WorkoutPlanDraft;
  isDone: boolean;
  photoUrl?: string;
  // plan.stopwatchEnabled인 항목에만 있다.
  stopwatch?: StopwatchState;
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
                ? "h-[34px] w-[34px] items-center justify-center rounded-full bg-orange-500"
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

export function MissionActionButton({
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
  // 스톱워치가 달린 항목 전용 — 시작/일시정지, 리셋, 종료(완료 처리) 콜백.
  onStopwatchToggleRun: (instanceId: string) => void;
  onStopwatchReset: (instanceId: string) => void;
  onStopwatchFinish: (instanceId: string) => void;
  onAddSavedPlan: (plan: WorkoutPlanDraft) => void;
  onOpenSavedPlan: (planId: string) => void;
  // 오늘의 운동 항목은 저장된 계획과 독립된 자기 사본(workout.plan)을 갖고
  // 있어서, 상세/수정도 그 사본을 직접 연다 — onOpenSavedPlan과 달리
  // savedWorkoutPlans 목록을 조회하지 않는다.
  onOpenWorkoutDetail: (instanceId: string) => void;
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
  onStopwatchToggleRun,
  onStopwatchReset,
  onStopwatchFinish,
  onAddSavedPlan,
  onOpenSavedPlan,
  onOpenWorkoutDetail,
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
            todayWorkouts.map((workout) => {
              const hasStopwatch = workout.stopwatch != null;
              return (
                <View key={workout.id}>
                  <TodayWorkoutRow
                    hideBottomBorder={hasStopwatch}
                    onOpenDetail={() => onOpenWorkoutDetail(workout.id)}
                    onToggle={
                      readOnly || (hasStopwatch && !workout.isDone)
                        ? undefined
                        : () => onToggleTodayWorkout(workout.id)
                    }
                    workout={workout}
                  />
                  {workout.stopwatch && (
                    <StopwatchBar
                      disabled={readOnly || workout.isDone}
                      onFinish={() => onStopwatchFinish(workout.id)}
                      onReset={() => onStopwatchReset(workout.id)}
                      onToggleRun={() => onStopwatchToggleRun(workout.id)}
                      stopwatch={workout.stopwatch}
                    />
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Figma node 3502:36611 "루틴 헤더": 펼치기/접기 드롭다운이 카드
            상단이 아니라 이 "루틴" 라벨과 같은 줄에 있다 — 라벨/화살표는
            항상 보이고, 그 아래 저장된 운동 계획 목록만 expanded에 따라
            접힌다. */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
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
          </>
        )}
      </View>
    </View>
  );
}

// Figma 4331:25730/4331:25611의 "모달-캡션O" — RN 기본 Alert 대신 디자인
// 그대로(흰 카드+알약 버튼 2개)로 맞춘 확인창. 확정 버튼 색만 상황에 따라
// 다르다(종료=브랜드 오렌지, 리셋=경고 빨강).
function ConfirmModal({
  visible,
  title,
  description,
  cancelLabel,
  confirmLabel,
  confirmColor,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmColor: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible>
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: "rgba(23, 23, 25, 0.45)" }}
      >
        <Pressable
          accessibilityLabel="닫기"
          accessibilityRole="button"
          className="absolute inset-0"
          onPress={onCancel}
        />
        <View className="w-[300px] items-center gap-5 rounded-[20px] bg-white px-5 pb-[18px] pt-[26px]">
          <View className="items-center gap-2">
            <ThemedText
              style={{
                color: primitiveColors.charcoal[11],
                textAlign: "center",
              }}
              typography="title-3-bold"
            >
              {title}
            </ThemedText>
            <ThemedText
              style={{
                color: primitiveColors.charcoal[5],
                textAlign: "center",
              }}
              typography="caption-1-regular"
            >
              {description}
            </ThemedText>
          </View>
          <View className="flex-row gap-2.5">
            <Pressable
              accessibilityRole="button"
              className="h-[50px] w-[125px] items-center justify-center rounded-full border border-charcoal-3 bg-white"
              onPress={onCancel}
            >
              <ThemedText
                style={{ color: primitiveColors.charcoal[11] }}
                typography="body-3-bold"
              >
                {cancelLabel}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="h-[50px] w-[125px] items-center justify-center rounded-full"
              onPress={onConfirm}
              style={{ backgroundColor: confirmColor }}
            >
              <ThemedText
                style={{ color: semanticColors["label-inverse"] }}
                typography="body-3-bold"
              >
                {confirmLabel}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Figma 4331:25004(운동 타이머) — 위 행 바로 아래 붙어서 한 카드처럼 보이는
// 어두운 바. 표시값은 매초 강제 리렌더하되 startedAt(벽시계 기준)으로 다시
// 계산해서, 화면이 꺼지거나 앱이 백그라운드로 가도 어긋나지 않는다.
function StopwatchBar({
  stopwatch,
  disabled,
  onToggleRun,
  onReset,
  onFinish,
}: {
  stopwatch: StopwatchState;
  disabled: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  onFinish: () => void;
}) {
  const { elapsedSeconds, isRunning, startedAt } = stopwatch;
  // Date.now()는 렌더 중에 직접 부르면 impure라 여기 effect 안에서만 읽고,
  // 렌더는 이 state 값만 순수하게 소비한다.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning || disabled) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isRunning, disabled]);

  const displaySeconds =
    isRunning && startedAt != null
      ? elapsedSeconds + (now - startedAt) / 1000
      : elapsedSeconds;
  const [confirmDialog, setConfirmDialog] = useState<"finish" | "reset" | null>(
    null,
  );

  function handleMainPress() {
    const wasRunning = isRunning;
    onToggleRun();
    if (wasRunning) setConfirmDialog("finish");
  }

  return (
    <View
      className="mb-3 flex-row items-center justify-between rounded-b-[16px] bg-charcoal-11 py-3.5 pl-6 pr-4"
      style={disabled ? { opacity: 0.4 } : undefined}
    >
      <ThemedText
        style={{
          color: semanticColors["label-inverse"],
          fontFamily: "Pretendard-Bold",
          fontSize: 40,
          lineHeight: 48,
        }}
      >
        {formatStopwatchTime(displaySeconds)}
      </ThemedText>
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityLabel={isRunning ? "일시정지" : "시작"}
          accessibilityRole="button"
          className="size-12 items-center justify-center rounded-full bg-white"
          disabled={disabled}
          onPress={handleMainPress}
        >
          <Ionicons
            color={primitiveColors.charcoal[11]}
            name={isRunning ? "pause" : "play"}
            size={20}
          />
        </Pressable>
        <Pressable
          accessibilityLabel="리셋"
          accessibilityRole="button"
          className="size-12 items-center justify-center rounded-full bg-charcoal-9"
          disabled={disabled}
          onPress={() => setConfirmDialog("reset")}
        >
          <Ionicons
            color={semanticColors["label-inverse"]}
            name="refresh"
            size={20}
          />
        </Pressable>
      </View>

      <ConfirmModal
        cancelLabel="취소하기"
        confirmColor={primitiveColors.orange["500"]}
        confirmLabel="저장하기"
        description="현재까지 기록된 시간을 저장합니다"
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => {
          setConfirmDialog(null);
          onFinish();
        }}
        title="스톱워치를 종료할까요?"
        visible={confirmDialog === "finish"}
      />
      <ConfirmModal
        cancelLabel="취소하기"
        confirmColor={semanticColors["status-negative-normal"]}
        confirmLabel="삭제하기"
        description="현재까지 기록된 시간을 삭제합니다"
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => {
          setConfirmDialog(null);
          onReset();
        }}
        title="기록을 리셋할까요?"
        visible={confirmDialog === "reset"}
      />
    </View>
  );
}

function TodayWorkoutRow({
  workout,
  onToggle,
  onOpenDetail,
  hideBottomBorder = false,
}: {
  workout: TodayWorkoutInstance;
  onToggle?: () => void;
  onOpenDetail?: () => void;
  // 스톱워치 바가 바로 아래 붙어서 한 덩어리로 보여야 할 때, 이 행의 구분선을
  // 끈다(Figma 4331:25004 — 행과 타이머 바가 하나의 카드처럼 이어진다).
  hideBottomBorder?: boolean;
}) {
  return (
    <View
      className={
        hideBottomBorder
          ? "flex-row items-center gap-3 py-3"
          : "flex-row items-center gap-3 border-b border-line-subtle py-3"
      }
    >
      {(() => {
        // 원(라디오 버튼)은 onToggle이 없어도(스톱워치가 완료 전이라 눌러서
        // 완료 처리할 수 없는 상태) 항상 그려져야 한다 — 눌리는 것만 막고
        // 시각적으로 사라지면 안 된다.
        const circle = (
          <View
            className={
              workout.isDone
                ? "h-[34px] w-[34px] items-center justify-center rounded-full bg-orange-500"
                : "h-[34px] w-[34px] items-center justify-center rounded-full border border-line-strong"
            }
          >
            {workout.isDone && (
              <Ionicons
                color={semanticColors["label-inverse"]}
                name="checkmark"
                size={16}
              />
            )}
          </View>
        );

        return onToggle ? (
          <Pressable
            accessibilityLabel={workout.isDone ? "완료 취소" : "완료로 표시"}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: workout.isDone }}
            hitSlop={8}
            onPress={onToggle}
          >
            {circle}
          </Pressable>
        ) : (
          circle
        );
      })()}
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
