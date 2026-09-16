import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { type ReactNode, useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
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
  // plan.stopwatchEnabled인 항목에만 있다.
  stopwatch?: StopwatchState;
};

type MissionCardProps = {
  status: MissionStatus;
  // NOT_OFFERED 상태일 때만 쓰는 "오전 10시에 도착해요" 문구.
  arrivalLabel: string;
  // OFFERED 이후에만 서버가 내려주는 실제 미션 내용.
  title: string;
  description: string;
  onReveal: () => void;
  onAccept: () => void;
  // 없으면(서버에서 이미 완료된 미션) 체크를 다시 눌러 되돌릴 수 없다 —
  // TodayWorkoutRow의 onToggle과 같은 규칙.
  onToggleComplete?: () => void;
  // 서버에서 이미 완료된 미션(실제 기록이 존재) 전용 — 미션 행 전체를
  // 눌러 그 운동 기록(day-record) 화면을 연다. TodayWorkoutRow의
  // onOpenRecord와 같은 패턴.
  onOpenRecord?: () => void;
};

export function MissionCard({
  status,
  arrivalLabel,
  title,
  description,
  onReveal,
  onAccept,
  onToggleComplete,
  onOpenRecord,
}: MissionCardProps) {
  if (status === "dismissed") return null;

  const isAccepted = status === "accepted" || status === "completed";
  const isCompleted = status === "completed";

  return (
    <View className="rounded-[24px] bg-background-normal p-5 shadow-[0px_4px_6px_rgba(0,0,0,0.04)]">
      {/* accepted/completed만 좌측 라벨 헤더 줄을 쓴다 — Figma node
          3502:36610(scheduled)·4305:33908(revealed)에는 이 줄 자체가 없고,
          "오늘의 미션" 라벨은 아래 중앙 정렬된 콘텐츠 안에 오렌지색으로 들어간다. */}
      {isAccepted && (
        <View className="min-h-8 flex-row items-center">
          {/* TodayWorkoutCard의 "오늘의 운동" 헤딩과 같은 타이포/색상 —
              홈 화면에 나란히 쌓이는 두 카드 헤더가 같은 무게로 보여야 한다. */}
          <ThemedText
            style={{ color: primitiveColors.charcoal["11"] }}
            typography="heading-1-bold"
          >
            오늘의 미션
          </ThemedText>
        </View>
      )}

      {status === "scheduled" && (
        <View className="items-center gap-4">
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
          <ActionButton label="미리 받기" onPress={onReveal} soft />
        </View>
      )}

      {status === "revealed" && (
        <View className="items-center gap-4">
          <View className="items-center gap-1">
            <ThemedText
              typography="body-3-bold"
              style={{ color: primitiveColors.orange["500"] }}
            >
              오늘의 미션
            </ThemedText>
            <ThemedText
              typography="title-2-bold"
              style={{ color: primitiveColors.charcoal["11"] }}
            >
              {title}
            </ThemedText>
          </View>
          {/* mission-illustration.png은 360x360 정사각형에 캐릭터가 여백 없이
              꽉 차 있어서, 이 237x120(가로로 넓은) 박스에 cover로 채우면 귀·머리띠와
              매트가 잘린다 — 배경이 투명이라 여백처럼 보이므로 contain으로 자르지
              않고 그대로 보여준다. */}
          <Image
            source={MISSION_ILLUSTRATION}
            style={{ width: 237, height: 120, borderRadius: 16 }}
            contentFit="contain"
          />
          <ActionButton label="미션 수락하기" onPress={onAccept} />
        </View>
      )}

      {isAccepted && (
        <MissionRowContainer onOpenRecord={onOpenRecord} title={title}>
          <Pressable
            accessibilityLabel={
              !onToggleComplete
                ? "미션 완료됨"
                : isCompleted
                  ? "미션 완료 취소"
                  : "미션 완료"
            }
            accessibilityRole="checkbox"
            accessibilityState={{
              checked: isCompleted,
              disabled: !onToggleComplete,
            }}
            className={
              isCompleted
                ? "h-[34px] w-[34px] items-center justify-center rounded-full bg-orange-500"
                : "h-[34px] w-[34px] items-center justify-center rounded-full border border-line-strong"
            }
            disabled={!onToggleComplete}
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
        </MissionRowContainer>
      )}

      {/* Figma 4305:33908: NEW뱃지는 우상단에 절대 위치로 뜬다 —
          scheduled/revealed엔 위의 헤더 줄이 없어서 그 자리를 대신한다. */}
      {status === "revealed" && (
        <View className="absolute right-5 top-5 rounded-full bg-orange-50 px-[9px] py-1">
          <ThemedText
            typography="caption-1-bold"
            style={{ color: primitiveColors.orange["500"] }}
          >
            NEW
          </ThemedText>
        </View>
      )}
    </View>
  );
}

// 수락/완료된 미션 행 — onOpenRecord가 있으면(서버에서 완료돼 실제 기록이
// 있는 미션) 행 전체가 버튼이 되어 운동 기록(day-record) 화면을 연다.
// 그때 안쪽 체크는 disabled라 터치가 이 행으로 넘어오므로 동작이 겹치지
// 않는다. TodayWorkoutRow의 onOpenRecord 분기와 같은 구조.
function MissionRowContainer({
  onOpenRecord,
  title,
  children,
}: {
  onOpenRecord?: () => void;
  title: string;
  children: ReactNode;
}) {
  const rowClassName = "flex-row items-center gap-3 pt-4";

  if (onOpenRecord) {
    return (
      <Pressable
        accessibilityLabel={`${title} 운동 기록 보기`}
        accessibilityRole="button"
        className={rowClassName}
        onPress={onOpenRecord}
      >
        {children}
      </Pressable>
    );
  }

  return <View className={rowClassName}>{children}</View>;
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
  // 완료된 항목을 탭했을 때 — 점세개(수정) 대신 그 운동의 실제 기록
  // (day-record 화면)을 연다.
  onOpenWorkoutRecord: (instanceId: string) => void;
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
  onOpenWorkoutRecord,
  title = "오늘의 운동",
  emptyStateLabel = "오늘 담은 운동이 없어요",
  readOnly = false,
}: TodayWorkoutCardProps) {
  const doneCount = todayWorkouts.filter((workout) => workout.isDone).length;

  return (
    <View className="rounded-[24px] bg-background-normal shadow-[0px_4px_12px_0px_rgba(92,23,5,0.04)]">
      <View className="h-[60px] flex-row items-center justify-between px-5">
        <View className="items-start gap-0.5">
          <ThemedText
            typography="heading-1-bold"
            style={{ color: primitiveColors.charcoal["11"] }}
          >
            {title}
          </ThemedText>
          <ThemedText
            typography="body-2-regular"
            style={{ color: primitiveColors.charcoal["5"] }}
          >
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
              <ThemedText
                typography="body-1-medium"
                style={{ color: primitiveColors.charcoal["5"] }}
              >
                {emptyStateLabel}
              </ThemedText>
            </View>
          ) : (
            todayWorkouts.map((workout, index) => {
              const hasStopwatch = workout.stopwatch != null;
              return (
                <View key={workout.id}>
                  <TodayWorkoutRow
                    hideBottomBorder={hasStopwatch}
                    isLast={index === todayWorkouts.length - 1}
                    onOpenDetail={
                      workout.isDone
                        ? undefined
                        : () => onOpenWorkoutDetail(workout.id)
                    }
                    onOpenRecord={
                      workout.isDone
                        ? () => onOpenWorkoutRecord(workout.id)
                        : undefined
                    }
                    onToggle={
                      readOnly ||
                      workout.isDone ||
                      (hasStopwatch && !workout.isDone)
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
          <ThemedText
            typography="body-1-bold"
            style={{ color: primitiveColors.charcoal["5"] }}
          >
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
            {savedWorkoutPlans.map((plan, index) => (
              <SavedWorkoutPlanRow
                isLast={index === savedWorkoutPlans.length - 1}
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
        swapButtons
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
  onOpenRecord,
  hideBottomBorder = false,
  isLast = false,
}: {
  workout: TodayWorkoutInstance;
  onToggle?: () => void;
  onOpenDetail?: () => void;
  // 완료된 항목 전용 — 점세개(수정) 대신 행 전체를 눌러 그 운동 기록
  // (day-record) 화면으로 연다. "지난 운동" 카드와 같은 패턴.
  onOpenRecord?: () => void;
  // 스톱워치 바가 바로 아래 붙어서 한 덩어리로 보여야 할 때, 이 행의 구분선을
  // 끈다(Figma 4331:25004 — 행과 타이머 바가 하나의 카드처럼 이어진다).
  hideBottomBorder?: boolean;
  // 목록의 마지막 행이면 구분선을 없애고, 바로 아래 "루틴" 헤더와의 간격도
  // 줄인다(그쪽에 이미 pt-3가 있어 좁힐 여지가 있다).
  isLast?: boolean;
}) {
  const rowClassName = hideBottomBorder
    ? "flex-row items-center gap-3 py-3"
    : isLast
      ? "flex-row items-center gap-3 pt-3 pb-1"
      : "flex-row items-center gap-3 border-b border-line-subtle py-3";

  // 원(라디오 버튼)은 onToggle이 없어도(완료됐거나, 스톱워치가 완료 전이라
  // 눌러서 완료 처리할 수 없는 상태) 항상 그려져야 한다 — 눌리는 것만 막고
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

  const rowContent = (
    <>
      {onToggle ? (
        <Pressable
          accessibilityLabel="완료로 표시"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: workout.isDone }}
          hitSlop={8}
          onPress={onToggle}
        >
          {circle}
        </Pressable>
      ) : (
        circle
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
    </>
  );

  if (onOpenRecord) {
    return (
      <Pressable
        accessibilityLabel={`${workout.plan.title} 운동 기록 보기`}
        accessibilityRole="button"
        className={rowClassName}
        onPress={onOpenRecord}
      >
        {rowContent}
      </Pressable>
    );
  }

  return <View className={rowClassName}>{rowContent}</View>;
}

function SavedWorkoutPlanRow({
  plan,
  onAdd,
  onOpenDetail,
  isLast = false,
}: {
  plan: WorkoutPlanDraft;
  onAdd: () => void;
  onOpenDetail: () => void;
  isLast?: boolean;
}) {
  return (
    <View
      className={
        isLast
          ? "flex-row items-center gap-3 pb-1 pt-3"
          : "flex-row items-center gap-3 border-b border-line-subtle py-3"
      }
    >
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
