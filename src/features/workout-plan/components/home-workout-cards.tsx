import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { type ReactNode, useEffect, useRef, useState } from "react";
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
import { AiContentReportMenu } from "@/features/reports/components/ai-content-report-menu";
import { AiContentReportSheet } from "@/features/reports/components/ai-content-report-sheet";

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

// 실행 중이면 startedAt(벽시계 기준) 이후 흐른 시간을 더하고, 아니면 저장된
// elapsedSeconds를 그대로 돌려준다 — 화면 표시(StopwatchBar)와 완료 체크
// 가능 여부 판단(TodayWorkoutCard)이 같은 계산을 공유해서 어긋나지 않게 한다.
function getStopwatchElapsedSeconds(stopwatch: StopwatchState, now: number) {
  return stopwatch.isRunning && stopwatch.startedAt != null
    ? stopwatch.elapsedSeconds + Math.max(0, now - stopwatch.startedAt) / 1000
    : stopwatch.elapsedSeconds;
}

// 누적 기록이 이 값 미만이면 아직 "운동했다"고 보기 어려워 완료 체크를
// 막는다. UI 표시 문자열이 아니라 실제 stopwatch state(초 단위)로 판단한다.
const STOPWATCH_CHECKABLE_MIN_SECONDS = 1;

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
  // AI 콘텐츠 신고(refId)에 쓰는 실제 미션 식별자 — 아직 없으면(scheduled)
  // 신고할 대상이 없어 `⋮` 자체를 안 보여준다.
  missionId?: number | null;
  onReported?: () => void;
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
  missionId,
  onReported,
}: MissionCardProps) {
  const [menuTop, setMenuTop] = useState<number | null>(null);
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);

  if (status === "dismissed") return null;

  const isAccepted = status === "accepted" || status === "completed";
  const isCompleted = status === "completed";
  // scheduled는 아직 실제 미션 내용이 없어 신고할 대상이 없다.
  const canReport = status !== "scheduled" && missionId != null;

  const reportButton = canReport && (
    <Pressable
      accessibilityLabel="더보기"
      accessibilityRole="button"
      hitSlop={8}
      onPress={(event) => setMenuTop(event.nativeEvent.pageY - 16)}
      className="h-6 w-6 items-center justify-center"
    >
      <Ionicons
        color={semanticColors["label-disabled"]}
        name="ellipsis-vertical"
        size={18}
      />
    </Pressable>
  );

  return (
    <View className="rounded-[24px] bg-background-normal p-5 shadow-[0px_4px_6px_rgba(0,0,0,0.04)]">
      {/* accepted/completed만 좌측 라벨 헤더 줄을 쓴다 — Figma node
          3502:36610(scheduled)·4305:33908(revealed)에는 이 줄 자체가 없고,
          "오늘의 미션" 라벨은 아래 중앙 정렬된 콘텐츠 안에 오렌지색으로 들어간다. */}
      {isAccepted && (
        <View className="min-h-8 flex-row items-center justify-between">
          {/* TodayWorkoutCard의 "오늘의 운동" 헤딩과 같은 타이포/색상 —
              홈 화면에 나란히 쌓이는 두 카드 헤더가 같은 무게로 보여야 한다. */}
          <ThemedText
            style={{ color: primitiveColors.charcoal["11"] }}
            typography="heading-1-bold"
          >
            오늘의 미션
          </ThemedText>
          {reportButton}
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
          scheduled/revealed엔 위의 헤더 줄이 없어서 그 자리를 대신한다.
          신고 `⋮`도 그 옆에 같이 둔다. */}
      {status === "revealed" && (
        <View className="absolute right-5 top-5 flex-row items-center gap-2">
          <View className="rounded-full bg-orange-50 px-[9px] py-1">
            <ThemedText
              typography="caption-1-bold"
              style={{ color: primitiveColors.orange["500"] }}
            >
              NEW
            </ThemedText>
          </View>
          {reportButton}
        </View>
      )}

      {canReport && (
        <>
          <AiContentReportMenu
            onClose={() => setMenuTop(null)}
            onSelectReport={() => setIsReportSheetOpen(true)}
            top={menuTop ?? 0}
            visible={menuTop !== null}
          />
          <AiContentReportSheet
            onClose={() => setIsReportSheetOpen(false)}
            onReported={() => {
              setIsReportSheetOpen(false);
              onReported?.();
            }}
            refId={missionId as number}
            refType="MISSION"
            visible={isReportSheetOpen}
          />
        </>
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
  // 완료 체크 버튼 전용 — 체크 시점에 정산한 elapsedSeconds를 확정해 멈추고
  // (settle), 종료 확인 팝업을 취소하면 그 값 그대로 재개(resume)한다.
  // onStopwatchToggleRun과 달리 "현재 isRunning"을 보고 방향을 정하지 않고
  // 항상 한 방향으로만 동작해서, 팝업이 떠 있는 동안 elapsedSeconds가
  // 늘어나지 않는다.
  onStopwatchSettleForCheck: (
    instanceId: string,
    elapsedSeconds: number,
  ) => void;
  onStopwatchResumeAfterCancel: (
    instanceId: string,
    elapsedSeconds: number,
  ) => void;
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
  onStopwatchSettleForCheck,
  onStopwatchResumeAfterCancel,
  onAddSavedPlan,
  onOpenSavedPlan,
  onOpenWorkoutDetail,
  onOpenWorkoutRecord,
  title = "오늘의 운동",
  emptyStateLabel = "오늘 담은 운동이 없어요",
  readOnly = false,
}: TodayWorkoutCardProps) {
  const doneCount = todayWorkouts.filter((workout) => workout.isDone).length;

  // 스톱워치가 실행 중인 항목이 하나라도 있을 때만 매초 리렌더해서, 체크
  // 버튼의 "1초 이상" 조건이 화면 문자열이 아니라 실시간 elapsed 값 기준으로
  // 갱신되게 한다(StopwatchBar가 자기 표시값을 갱신하는 것과 같은 방식).
  const hasRunningStopwatch = todayWorkouts.some(
    (workout) => workout.stopwatch?.isRunning,
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasRunningStopwatch) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasRunningStopwatch]);

  // 체크 버튼은 완료 상태를 바로 바꾸지 않고, 먼저 "스톱워치를 종료할까요?"
  // 확인 팝업을 여는 역할만 한다 — 실제 완료 처리(onStopwatchFinish)는
  // 팝업에서 확인을 눌러야 실행된다. wasRunning/elapsedSeconds는 체크를
  // 누르기 직전(정산 직후) 상태를 기억해뒀다가, 취소 시에만 그 상태(러닝
  // 중이었으면 그 값 그대로 재개)로 되돌리는 데 쓴다 — 모달이 떠 있던
  // 시간이 elapsedSeconds에 섞여 들어가지 않게 하기 위함이다.
  const [finishConfirmTarget, setFinishConfirmTarget] = useState<{
    id: string;
    wasRunning: boolean;
    elapsedSeconds: number;
  } | null>(null);
  // setFinishConfirmTarget(null)은 setState라 같은 프레임의 연타에는 아직
  // 모달이 열린 것으로 보일 수 있다(record-editor-screen의 submissionLockRef와
  // 같은 이유) — "확인" 버튼이 onStopwatchFinish(완료 상태 변경 + 기록 방식
  // 모달 오픈)를 두 번 실행하지 않도록 동기적으로 막는 락.
  const finishConfirmLockRef = useRef(false);
  // 이 모달은 카드 안의 모든 항목이 공유하므로, finishConfirmTarget이 바뀔
  // 때(새로 열리거나 닫힐 때)마다 이전 확인의 락 상태가 남아있지 않도록
  // 초기화한다. 렌더 경로(map 콜백)가 아니라 effect에서만 ref를 건드린다.
  useEffect(() => {
    finishConfirmLockRef.current = false;
  }, [finishConfirmTarget]);

  // 체크 버튼 press — 지금 이 순간의 elapsed를 직접 계산해 확정하고
  // 일시정지한다(onStopwatchToggleRun을 재사용해 "현재 isRunning을 보고
  // 방향을 정하는" 방식은 쓰지 않는다 — 취소 시 재개도 같은 이유로 별도
  // 함수를 쓴다. 재사용 시 모달이 떠 있는 동안 다른 경로로 state가 바뀌면
  // 취소 때 잘못된 방향으로 toggle될 수 있고, 실기기에서 실제로 모달이
  // 열려 있던 시간만큼 그대로 더해지는 문제가 있었다). 정산된 값을
  // finishConfirmTarget에 그대로 들고 있다가 취소 시 그 값으로 재개한다.
  function handleStopwatchCheckPress(workout: TodayWorkoutInstance) {
    const stopwatch = workout.stopwatch;
    if (!stopwatch) return;
    const wasRunning = stopwatch.isRunning;
    // Date.now()는 이 함수가 onPress로만 호출될 때(렌더 중이 아니라 실제
    // 체크 press 시점)의 정확한 경과시간을 구하기 위해 필요하다 — toggleStopwatchRun과
    // 같은 이유로 렌더 중에는 절대 호출되지 않는다.
    // eslint-disable-next-line react-hooks/purity
    const elapsedSeconds = getStopwatchElapsedSeconds(stopwatch, Date.now());
    onStopwatchSettleForCheck(workout.id, elapsedSeconds);
    setFinishConfirmTarget({ id: workout.id, wasRunning, elapsedSeconds });
  }

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
              // 스톱워치 항목은 아직 1초도 기록되지 않았으면 체크할 수 없다
              // (elapsed=0 상태 포함) — 문자열이 아니라 실제 elapsedSeconds로 판단.
              const canCheckStopwatch =
                hasStopwatch &&
                getStopwatchElapsedSeconds(workout.stopwatch!, now) >=
                  STOPWATCH_CHECKABLE_MIN_SECONDS;
              // 이 항목의 종료 확인 팝업이 이미 떠 있는 동안엔 체크/재생·
              // 일시정지·리셋 어느 것도 다시 건드릴 수 없게 막는다 — 팝업이
              // 열려 있는 동안 다른 입력으로 elapsedSeconds가 바뀌는 경로를
              // 원천 차단한다.
              const isFinishConfirmPending =
                finishConfirmTarget?.id === workout.id;
              const canToggle =
                !readOnly && !workout.isDone && !isFinishConfirmPending;
              let onToggle: (() => void) | undefined;
              if (canToggle && hasStopwatch && canCheckStopwatch) {
                onToggle = () => handleStopwatchCheckPress(workout);
              } else if (canToggle && !hasStopwatch) {
                onToggle = () => onToggleTodayWorkout(workout.id);
              }
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
                    onToggle={onToggle}
                    workout={workout}
                  />
                  {workout.stopwatch && (
                    <StopwatchBar
                      disabled={
                        readOnly || workout.isDone || isFinishConfirmPending
                      }
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

      {/* 종료 확인 팝업의 유일한 진입점은 체크 버튼이다 — 재생/일시정지
          버튼은 순수하게 시작/멈춤만 담당하고 이 모달을 열지 않는다. */}
      <ConfirmModal
        cancelLabel="취소하기"
        confirmColor={primitiveColors.orange["500"]}
        confirmLabel="저장하기"
        description="현재까지 기록된 시간을 저장합니다"
        onCancel={() => {
          // 체크를 누르기 전 러닝 중이었다면, 체크 시점에 정산해둔
          // elapsedSeconds 그대로 재개시킨다(startedAt만 지금 시각으로 새로
          // 세팅) — 모달이 떠 있던 시간은 여기 반영되지 않는다. 이미
          // paused 상태에서 체크했다면 아무것도 하지 않아 paused를 유지한다.
          if (finishConfirmTarget?.wasRunning) {
            onStopwatchResumeAfterCancel(
              finishConfirmTarget.id,
              finishConfirmTarget.elapsedSeconds,
            );
          }
          finishConfirmLockRef.current = false;
          setFinishConfirmTarget(null);
        }}
        onConfirm={() => {
          // 연타로 onConfirm이 같은 프레임에 두 번 들어와도 완료 처리
          // (onStopwatchFinish)가 두 번 실행되지 않도록 동기적으로 막는다.
          if (finishConfirmLockRef.current) return;
          finishConfirmLockRef.current = true;
          const instanceId = finishConfirmTarget?.id;
          setFinishConfirmTarget(null);
          if (instanceId) onStopwatchFinish(instanceId);
        }}
        title="스톱워치를 종료할까요?"
        visible={finishConfirmTarget != null}
      />
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
}: {
  stopwatch: StopwatchState;
  disabled: boolean;
  // 재생/일시정지 버튼 전용 — 시작·재개·일시정지만 담당하고 종료 확인
  // 팝업은 열지 않는다(그 팝업의 유일한 진입점은 체크 버튼).
  onToggleRun: () => void;
  onReset: () => void;
}) {
  const { isRunning } = stopwatch;
  // Date.now()는 렌더 중에 직접 부르면 impure라 여기 effect 안에서만 읽고,
  // 렌더는 이 state 값만 순수하게 소비한다.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning || disabled) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isRunning, disabled]);

  // now는 interval tick에서만 갱신되므로 일시정지 동안엔 마지막 tick 시각에
  // 멈춰 있고, 재개 직후 첫 tick 전까지는 새 startedAt보다 앞선다. 그때
  // 음수 delta가 정산된 elapsedSeconds를 깎지 않도록 이번 실행 구간의
  // 경과만 0 이상으로 자른다 — 아직 관측된 경과가 없다는 뜻이라 0이 맞다.
  const displaySeconds = getStopwatchElapsedSeconds(stopwatch, now);
  const [confirmDialog, setConfirmDialog] = useState<"reset" | null>(null);

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
          onPress={onToggleRun}
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
