import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useIsFocused } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AddItemButton } from "@/components/ui/add-item-button";
import { Screen } from "@/components/ui/screen";
import { Spacing } from "@/constants/theme";
import { primitiveColors, semanticColors } from "@/constants/tokens";
import { getCalendarMonth } from "@/features/calendar/api";
import { HomeCalendar } from "@/features/calendar/components/home-calendar";
import { toDateKey } from "@/features/calendar/date";
import type { CalendarDay, CalendarResponse } from "@/features/calendar/types";
import {
  acceptMission,
  getDailyMission,
  prefetchDailyMission,
} from "@/features/missions/api";
import { MissionFeedbackModal } from "@/features/missions/components/mission-feedback-modal";
import { MissionFeedbackToast } from "@/features/missions/components/mission-feedback-toast";
import { useMissionFeedbackStore } from "@/features/missions/mission-feedback-store";
import { formatOfferArrivalLabel } from "@/features/missions/offer-time";
import type { DailyMissionResponse } from "@/features/missions/types";
import { useUnreadPushCount } from "@/features/notifications/use-unread-push-count";
import { getWorkoutHistory } from "@/features/workout-history/api";
import { summarizeWorkoutHistoryEntry } from "@/features/workout-history/model";
import type { WorkoutHistoryResponse } from "@/features/workout-history/types";
import {
  createDailyPlan,
  createPlanPreset,
  deleteDailyPlan,
  deletePlanPreset,
  getDailyPlans,
  getPlanPresets,
  updateDailyPlan,
  updatePlanPreset,
} from "@/features/workout-plan/api";
import {
  MissionCard,
  type MissionStatus,
  type StopwatchState,
  TodayWorkoutCard,
  type TodayWorkoutInstance,
} from "@/features/workout-plan/components/home-workout-cards";
import { WorkoutPlanDetailBottomSheet } from "@/features/workout-plan/components/workout-plan-detail-bottom-sheet";
import { WorkoutPlanEditSheet } from "@/features/workout-plan/components/workout-plan-edit-sheet";
import {
  createBlankWorkoutPlanDraft,
  fromDailyPlanResponse,
  fromPlanPresetResponse,
  toPlanRequestFields,
  type WorkoutPlanDraft,
} from "@/features/workout-plan/model";
import {
  loadTodayStopwatchProgress,
  saveTodayStopwatchProgress,
} from "@/features/workout-plan/today-stopwatch-storage";
import { RecordMethodModal } from "@/features/upload/components/record-method-modal";
import { logImageUploadError } from "@/features/upload/cloudinary";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";

// Figma 홈 화면 바탕(surface/background #fafafa, node 4305:33601). Screen의
// 기본 배경(background-normal #ffffff)과 같으면 흰색 카드·"운동 추가하기"
// 버튼이 바탕과 구분되지 않는다. 토큰에 없는 Figma 고정값이라 로컬 상수.
const HOME_SURFACE_BACKGROUND = "#fafafa";

// DailyMissionResponse.status → MissionCard가 쓰는 상태값.
const DAILY_MISSION_STATUS_MAP: Record<
  DailyMissionResponse["status"],
  MissionStatus
> = {
  NOT_OFFERED: "scheduled",
  OFFERED: "revealed",
  ACCEPTED: "accepted",
  COMPLETED: "completed",
  DISMISSED: "dismissed",
};
// Sentinel local id so pendingRecordPlanItemId/openRecordMethodModal can
// route a record-flow entry to the mission instead of a todayWorkouts
// entry — distinct from the real server 오늘의 운동(daily-plan) ids
// createTodayWorkoutInstance receives (see addSavedPlanToDate/
// loadWorkoutsForDate). Never sent as a PLAN refId — see buildRecordTarget.
const MISSION_PLAN_ITEM_ID = "daily-mission";

// GET /api/v1/workouts?date=(운동 기록 조회) 응답을 그대로 매핑한다 — 미션인지
// (refType === "MISSION") 여부까지 서버가 내려주므로 로컬에서 따로 추적할
// 필요가 없다.
type DayRecord = {
  workouts: { title: string; subtitle: string; isMission: boolean }[];
};

// 조건에 맞는 기록이 정확히 하나일 때만 그 위치를 돌려준다. 0개(아직/이미
// 없음)든 2개 이상(어느 것이 탭한 항목의 기록인지 구분 불가)이든 -1 —
// 다른 기록을 잘못 여는 것보다 안 여는 쪽을 택한다.
function findUniqueRecordIndex(
  workouts: WorkoutHistoryResponse[],
  predicate: (entry: WorkoutHistoryResponse) => boolean,
) {
  const matchedIndexes = workouts.flatMap((entry, index) =>
    predicate(entry) ? [index] : [],
  );
  return matchedIndexes.length === 1 ? matchedIndexes[0] : -1;
}

function createTodayWorkoutInstance(
  plan: WorkoutPlanDraft,
  instanceId: string,
): TodayWorkoutInstance {
  // 저장된 계획을 그대로 복사해 완전히 독립적인 사본을 만든다 — 이후 원본을
  // 수정하거나 삭제해도 이 인스턴스는 영향받지 않는다. plan.id도 서버가
  // 발급한 오늘의 운동 id로 새로 부여해서, 점세개로 이 사본을 수정/삭제할
  // 때 원본 저장 목록과 완전히 분리된다.
  return {
    id: instanceId,
    isDone: false,
    plan: { ...plan, id: instanceId },
    stopwatch: plan.stopwatchEnabled
      ? { elapsedSeconds: 0, isRunning: false, startedAt: null }
      : undefined,
  };
}

// 오늘이 아닌 날을 탭했을 때 보여주는 읽기 전용 카드. 미션 "받기"/운동 체크 같은
// 상호작용은 없다 — 그 날 완료된 미션·운동을 "지난 운동" 하나의 체크 목록으로
// 보여주기만 한다 (Figma node 2910-4400: 미션/운동을 따로 나누지 않고 완료
// 표시가 된 항목을 한 리스트로 합쳐서 보여준다).
function DayRecordCard({
  dateLabel,
  record,
  serverRecordCount,
  expanded,
  onToggleExpanded,
  onSelectRecord,
}: {
  dateLabel: string;
  record: DayRecord | null;
  // 로컬에 상세 항목이 없을 때(entries.length === 0) "기록이 없다"와 "서버에는
  // 기록이 있지만 상세를 보여줄 수 없다"를 구분하는 데만 쓰인다.
  serverRecordCount: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  // 항목을 탭하면 그 기록부터 스와이프로 볼 수 있는 day-record 화면을 연다.
  onSelectRecord: (index: number) => void;
}) {
  const entries = record ? record.workouts : [];

  return (
    <View className="rounded-[20px] border border-line-normal bg-background-normal">
      <Pressable
        accessibilityRole="button"
        className="h-[60px] flex-row items-center justify-between px-5"
        onPress={onToggleExpanded}
      >
        <View className="gap-0.5">
          <ThemedText typography="body-2-bold">지난 운동</ThemedText>
          <ThemedText typography="caption-1-medium" themeColor="textSecondary">
            {dateLabel}
          </ThemedText>
        </View>
        <Ionicons
          color={semanticColors["label-subtle"]}
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
        />
      </Pressable>

      {expanded && (
        <View className="px-5 pb-5">
          <View className="h-px bg-line-subtle" />

          <View className="py-2">
            {entries.length === 0 ? (
              <View className="items-center py-6">
                <ThemedText
                  typography="body-3-medium"
                  themeColor="textSecondary"
                >
                  {serverRecordCount > 0
                    ? `기록 ${serverRecordCount}개가 있어요`
                    : "이 날의 기록이 없어요"}
                </ThemedText>
              </View>
            ) : (
              entries.map((entry, index) => (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  className={
                    index === entries.length - 1
                      ? "flex-row items-center gap-3 pb-1 pt-3"
                      : "flex-row items-center gap-3 border-b border-line-subtle py-3"
                  }
                  onPress={() => onSelectRecord(index)}
                >
                  <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-orange-500">
                    <Ionicons
                      color={semanticColors["label-inverse"]}
                      name="checkmark"
                      size={16}
                    />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <View className="flex-row items-center gap-1.5">
                      <ThemedText
                        typography="body-3-bold"
                        themeColor="textSecondary"
                        style={{ textDecorationLine: "line-through" }}
                      >
                        {entry.title}
                      </ThemedText>
                      {entry.isMission && (
                        <View className="rounded-full bg-orange-50 px-2 py-0.5">
                          <ThemedText
                            typography="caption-2-bold"
                            style={{ color: primitiveColors.orange["500"] }}
                          >
                            미션
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText
                      typography="caption-1-regular"
                      style={{ color: semanticColors["label-disabled"] }}
                    >
                      {entry.subtitle}
                    </ThemedText>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  // Native tabs render every tab's screen eagerly, so without this guard the
  // workout plan detail bottom sheet's Modal could stay visible over the
  // chat/mypage tabs after switching away without closing it first.
  const isFocused = useIsFocused();
  const [isTodayCardExpanded, setIsTodayCardExpanded] = useState(true);
  const [missionId, setMissionId] = useState<number | null>(null);
  const [missionStatus, setMissionStatus] =
    useState<MissionStatus>("scheduled");
  const [missionTitle, setMissionTitle] = useState("");
  const [missionDescription, setMissionDescription] = useState("");
  const [missionArrivalLabel, setMissionArrivalLabel] = useState("");
  // completeMission의 requireUserFeedback이 true였던 미션의 id —
  // mission-feedback-store가 화면 전환(RecordEditor → RecordComplete →
  // 홈)에도 살아남긴 하지만, 그 store 값 자체를 "이 화면에서 지금 모달을
  // 띄워야 하는가"로 직접 구독하면 된다(아래 렌더 부분 참고). 토스트는 이
  // local state로만 관리한다 — feedback 성공 이후에만 잠깐 켜지는 화면
  // 전용 UI라 store로 공유할 필요가 없다.
  const pendingMissionFeedbackId = useMissionFeedbackStore(
    (state) => state.pendingMissionId,
  );
  const [isMissionFeedbackToastVisible, setIsMissionFeedbackToastVisible] =
    useState(false);

  function handleMissionFeedbackComplete() {
    useMissionFeedbackStore.getState().clearFeedback();
    setIsMissionFeedbackToastVisible(true);
  }

  function handleMissionFeedbackSkip() {
    useMissionFeedbackStore.getState().clearFeedback();
  }

  function applyMissionResponse(response: DailyMissionResponse) {
    setMissionId(response.missionId);
    setMissionStatus(DAILY_MISSION_STATUS_MAP[response.status]);
    setMissionTitle(response.title ?? "");
    setMissionDescription(response.description ?? "");
    setMissionArrivalLabel(formatOfferArrivalLabel(response.offerTime));
  }

  // GET /api/v1/missions/daily — 오늘의 미션 조회. 마운트 시 한 번 불러온다.
  useEffect(() => {
    getDailyMission()
      .then(applyMissionResponse)
      .catch((error) => console.error("Failed to load daily mission", error));
  }, []);

  async function handleMissionReveal() {
    try {
      applyMissionResponse(await prefetchDailyMission());
    } catch {
      Alert.alert("오류", "미션을 받지 못했습니다. 다시 시도해주세요.");
    }
  }

  async function handleMissionAccept() {
    if (missionId == null) return;
    try {
      applyMissionResponse(await acceptMission(missionId));
    } catch {
      Alert.alert("오류", "미션을 수락하지 못했습니다. 다시 시도해주세요.");
    }
  }

  const [savedWorkoutPlans, setSavedWorkoutPlans] = useState<
    WorkoutPlanDraft[]
  >([]);

  // GET /api/v1/plan-presets — 루틴 목록 조회. 마운트 시 한 번 불러온다.
  useEffect(() => {
    let cancelled = false;
    getPlanPresets()
      .then(({ planPresets }) => {
        if (!cancelled) {
          setSavedWorkoutPlans(planPresets.map(fromPlanPresetResponse));
        }
      })
      .catch((error) => {
        console.error("Failed to load plan presets", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  // 날짜별 오늘의 운동 목록. 오늘뿐 아니라 미래 날짜에 담아둔 운동도 그 날짜의
  // 캘린더 점 표시(hasScheduledWorkout)에 반영해야 해서 날짜 문자열로 나눠
  // 저장한다.
  const [workoutsByDate, setWorkoutsByDate] = useState<
    Record<string, TodayWorkoutInstance[]>
  >({});

  function getWorkoutsForDate(date: Date): TodayWorkoutInstance[] {
    return workoutsByDate[date.toDateString()] ?? [];
  }

  // 앱을 재실행해도 스톱워치가 00:00으로 안 돌아가게, 오늘 날짜가 바뀔 때마다
  // 진행 중인 값을 로컬에 스냅샷해둔다(today-stopwatch-storage.ts) — 자정이
  // 지나면 그 파일이 날짜만 보고 알아서 버리므로 여기선 그냥 매번 저장만
  // 하면 된다.
  function persistTodayStopwatchProgress(workouts: TodayWorkoutInstance[]) {
    const byInstanceId: Record<string, StopwatchState> = {};
    for (const workout of workouts) {
      if (workout.stopwatch) byInstanceId[workout.id] = workout.stopwatch;
    }
    saveTodayStopwatchProgress(byInstanceId);
  }

  function updateWorkoutsForDate(
    date: Date,
    updater: (workouts: TodayWorkoutInstance[]) => TodayWorkoutInstance[],
  ) {
    const key = date.toDateString();
    setWorkoutsByDate((current) => {
      const updated = updater(current[key] ?? []);
      if (key === new Date().toDateString()) {
        persistTodayStopwatchProgress(updated);
      }
      return { ...current, [key]: updated };
    });
  }

  // 앱 시작 시 한 번, 전날 넘어가지 않은 로컬 스톱워치 스냅샷을 읽어 둔다 —
  // 아래 loadWorkoutsForDate의 서버 재조회 병합에서 이 값을 되살린다. 네트워크
  // 응답보다 이 로컬 읽기가 항상 먼저 끝난다는 보장은 없지만(둘 다 비동기),
  // 실패해도 다음에 앱을 열 때 다시 시도되는 로컬 전용 복원 기능이라 그
  // 드문 경합은 감수한다.
  const persistedTodayStopwatchesRef = useRef<Record<
    string,
    StopwatchState
  > | null>(null);
  useEffect(() => {
    loadTodayStopwatchProgress().then((progress) => {
      persistedTodayStopwatchesRef.current = progress;
    });
  }, []);

  // GET /api/v1/daily-plans?date= 로 채운 날짜는 세션 동안 다시 불러오지
  // 않는다 — ref라 값이 바뀌어도 리렌더를 트리거하지 않고, 이미 로드된
  // 날짜에 로컬로 추가한 항목(addSavedPlanToDate 등)이 재조회로 덮어써지지
  // 않게 막아준다.
  // 카메라 탭에서 시작한 기록(LINKED/MANUAL)은 이 화면을 거치지 않아
  // pendingRecordPlanItemId 기반 resync가 걸리지 않는다. 저장 성공 시각을
  // 구독해 그때만 오늘의 운동/미션/캘린더를 서버에서 다시 읽는다.
  const savedRecordAt = useRecordFlowStore((state) => state.savedRecordAt);
  const loadedWorkoutDateKeysRef = useRef(new Set<string>());

  function loadWorkoutsForDate(date: Date) {
    const key = date.toDateString();
    if (loadedWorkoutDateKeysRef.current.has(key)) return;
    loadedWorkoutDateKeysRef.current.add(key);

    getDailyPlans(toDateKey(date))
      .then(({ dailyPlans }) => {
        const fetched = dailyPlans.map((dailyPlan) => {
          const plan = fromDailyPlanResponse(dailyPlan);
          return {
            id: String(dailyPlan.id),
            plan,
            isDone: dailyPlan.status === "COMPLETED",
            // 서버는 경과 시간을 들고 있지 않다(스톱워치 진행 상태는 로컬
            // 전용) — 처음 로드될 때만 00:00부터 시작하고, 아래에서 이미
            // 로컬에 진행 중이던 값이 있으면 그걸로 덮어써서 되살린다.
            stopwatch: plan.stopwatchEnabled
              ? { elapsedSeconds: 0, isRunning: false, startedAt: null }
              : undefined,
          };
        });
        setWorkoutsByDate((current) => {
          const existing = current[key] ?? [];
          // dailyPlans 재조회는 "다른 오늘의 운동/미션을 완료해 savedRecordAt이
          // 바뀔 때"마다도 일어난다 — 그때 아직 진행 중인 스톱워치까지 같이
          // 00:00으로 리셋되면 안 되므로, 서버 응답에 로컬에 있던 진행값을
          // 다시 얹는다. isDone 등 서버가 가진 값은 그대로 fetched를 따른다.
          const existingById = new Map(
            existing.map((workout) => [workout.id, workout]),
          );
          // 오늘 첫 로드(existing이 비어 있는 앱 재시작 직후)라면 in-memory
          // prior가 없으니, 자정 전 로컬 스냅샷(persistedTodayStopwatchesRef)에서
          // 되살린다 — 다른 날짜 목록엔 이 스냅샷을 적용하지 않는다.
          const isToday = key === new Date().toDateString();
          const merged = fetched.map((workout) => {
            const prior = existingById.get(workout.id);
            const restored =
              prior?.stopwatch ??
              (isToday
                ? persistedTodayStopwatchesRef.current?.[workout.id]
                : undefined);
            return workout.stopwatch && restored
              ? { ...workout, stopwatch: restored }
              : workout;
          });
          // 이 요청이 떠 있는 동안 addSavedPlanToDate 등으로 로컬에 먼저
          // 추가된 항목은 이 스냅샷에 없을 수 있다 — 통째로 덮어쓰면
          // 사라지므로, 응답에 없는 로컬 항목만 뒤에 이어붙인다.
          const fetchedIds = new Set(fetched.map((workout) => workout.id));
          const localOnly = existing.filter(
            (workout) => !fetchedIds.has(workout.id),
          );
          return { ...current, [key]: [...merged, ...localOnly] };
        });
      })
      .catch((error) => {
        console.error("Failed to load daily plans", error);
        loadedWorkoutDateKeysRef.current.delete(key);
      });
  }

  // 기록 저장이 성공하면(카메라 탭에서 시작한 LINKED/MANUAL 포함) 오늘 데이터를
  // 서버 기준으로 다시 맞춘다 — MANUAL은 오늘의 운동이 새로 하나 생기고,
  // LINKED는 해당 항목이 완료로 바뀐다. loadWorkoutsForDate는 날짜당 한 번만
  // 받아오는 캐시가 있어 오늘 키를 먼저 지운다. 캘린더는 위 effect가
  // savedRecordAt을 dep으로 함께 다시 읽는다.
  useEffect(() => {
    if (savedRecordAt == null) return;
    const now = new Date();
    loadedWorkoutDateKeysRef.current.delete(now.toDateString());
    loadWorkoutsForDate(now);
    getDailyMission()
      .then(applyMissionResponse)
      .catch((error) => {
        console.error("Failed to refresh daily mission", error);
      });
  }, [savedRecordAt]);

  // "지난 운동"(오늘/미래가 아닌 날짜)에 쓰는 실제 서버 기록 — GET
  // /api/v1/workouts?date=는 그 날 남긴 운동/미션 기록을 refType까지 포함해
  // 그대로 내려주므로, 로컬에서 미션 여부를 따로 추적할 필요가 없다.
  const [workoutHistoryByDate, setWorkoutHistoryByDate] = useState<
    Record<string, WorkoutHistoryResponse[]>
  >({});
  const loadedWorkoutHistoryDateKeysRef = useRef(new Set<string>());

  function loadWorkoutHistoryForDate(date: Date) {
    const key = date.toDateString();
    if (loadedWorkoutHistoryDateKeysRef.current.has(key)) return;
    loadedWorkoutHistoryDateKeysRef.current.add(key);

    getWorkoutHistory(toDateKey(date))
      .then(({ workouts }) => {
        setWorkoutHistoryByDate((current) => ({ ...current, [key]: workouts }));
      })
      .catch((error) => {
        console.error("Failed to load workout history", error);
        loadedWorkoutHistoryDateKeysRef.current.delete(key);
      });
  }
  // 상세/수정 시트가 지금 "저장된 운동 계획" 하나를 편집 중인지, 아니면
  // 어떤 날짜의 독립적인 운동 인스턴스(workout.plan)를 편집 중인지 구분한다
  // — 시트 자체(WorkoutPlanDetailBottomSheet)는 그대로 재사용하고, 저장만
  // savedWorkoutPlans 쪽으로 갈지 workoutsByDate 쪽으로 갈지만 갈린다.
  const [planDetailTarget, setPlanDetailTarget] = useState<
    | { kind: "saved"; planId: string }
    | { kind: "instance"; instanceId: string }
    | null
  >(null);
  // "운동 추가하기"로 연 빈 계획 초안. null이면 시트가 안 보인다.
  const [newPlanDraft, setNewPlanDraft] = useState<WorkoutPlanDraft | null>(
    null,
  );
  // 헤더 알림 아이콘이 가리키는 안 읽은 알림 개수 — 화면이 포커스를 받을
  // 때마다 다시 조회되므로 알림함에서 읽고 돌아오면 바로 반영된다.
  const unreadPushCount = useUnreadPushCount();
  const [viewedMonth, setViewedMonth] = useState(() => new Date());
  // 조회 중인 달의 캘린더 API 응답. year/month를 응답과 함께 묶어 보관해서,
  // 달을 빠르게 연속으로 넘길 때 아직 도착 안 한 이전 요청의 응답이 섞이지
  // 않게 하고(cancelled 플래그) daysByDate도 지금 보고 있는 달의 응답일 때만
  // 쓰도록 한다. 로딩 중이거나 실패했을 때는 null로 남아 캘린더가 빈 상태처럼
  // 보이되 깨지지 않는다.
  const [calendarMonthData, setCalendarMonthData] = useState<{
    year: number;
    month: number;
    response: CalendarResponse;
  } | null>(null);
  const viewedYear = viewedMonth.getFullYear();
  const viewedMonthNumber = viewedMonth.getMonth() + 1;
  // streakDays는 조회한 달과 무관하게 "요청 시점 서버 날짜" 기준으로 계산된
  // 값이라, days(달별로만 유효)와 달리 달이 바뀌어 새 요청이 pending인
  // 동안에도 리셋하지 않고 마지막으로 받아온 값을 그대로 보여준다 — 초기
  // 로딩 전에만 0으로 안전하게 fallback한다.
  const [streakDays, setStreakDays] = useState(0);
  // "정상 응답 + days가 빈 배열"과 "요청 자체가 실패"를 구분하기 위한 상태.
  // calendarMonthData와 같은 방식으로 실패한 year/month를 같이 저장해두고,
  // 지금 보고 있는 달과 비교해서 렌더링한다 — 달을 바꾸면 그 비교가 자연히
  // 어긋나서 이전 달의 실패 상태가 다음 달로 남지 않는다.
  const [calendarErrorMonth, setCalendarErrorMonth] = useState<{
    year: number;
    month: number;
  } | null>(null);
  const calendarError =
    calendarErrorMonth?.year === viewedYear &&
    calendarErrorMonth?.month === viewedMonthNumber;

  useEffect(() => {
    let cancelled = false;
    getCalendarMonth(viewedYear, viewedMonthNumber)
      .then((response) => {
        if (!cancelled) {
          setCalendarMonthData({
            year: viewedYear,
            month: viewedMonthNumber,
            response,
          });
          setStreakDays(response.streakDays);
          // 같은 달을 재조회해 이번엔 성공했다면, 그 달에 대해 남아 있던
          // 실패 기록만 지운다 — 다른 달의 실패 상태는 건드리지 않는다.
          setCalendarErrorMonth((prev) =>
            prev?.year === viewedYear && prev?.month === viewedMonthNumber
              ? null
              : prev,
          );
        }
      })
      .catch((error) => {
        console.error("Failed to load calendar", error);
        if (!cancelled) {
          setCalendarErrorMonth({ year: viewedYear, month: viewedMonthNumber });
        }
      });
    return () => {
      cancelled = true;
    };
    // savedRecordAt: 기록 저장이 실제로 성공했을 때만 바뀌는 신호라, 이 달을
    // 다시 읽어 recordCount/imageUrl을 최신 서버 값으로 맞춘다(화면 포커스마다
    // 무조건 재조회하지는 않는다).
  }, [viewedYear, viewedMonthNumber, savedRecordAt]);

  // date(YYYY-MM-DD) 기준 lookup — days는 기록/예정 운동이 있는 날짜만 내려오는
  // sparse 배열이라 index로 캘린더 셀과 매칭하면 안 되고 반드시 date로 찾아야
  // 한다. 보관된 응답이 지금 보고 있는 달의 것이 아니면(= 새 달 요청이 아직
  // pending) 빈 Map을 써서 이전 달 데이터가 새 달 셀에 노출되지 않게 한다.
  const daysByDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    const isForViewedMonth =
      calendarMonthData?.year === viewedYear &&
      calendarMonthData?.month === viewedMonthNumber;
    if (!isForViewedMonth) return map;

    for (const day of calendarMonthData.response.days) {
      map.set(day.date, day);
    }
    return map;
  }, [calendarMonthData, viewedYear, viewedMonthNumber]);

  // 캘린더에서 탭한 날짜. 오늘이면 실제 미션/오늘의 운동(상호작용 가능)을 보여주고,
  // 다른 날이면 그날의 미션·운동 목데이터를 읽기 전용으로 보여준다 — 미션 "받기"는
  // 오늘 날짜에만 가능하므로 다른 날엔 그 UI 자체를 노출하지 않는다.
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(
    () => new Date(),
  );
  const [isRecordMethodModalVisible, setIsRecordMethodModalVisible] =
    useState(false);
  // 체크 탭 즉시 완료 상태를 낙관적으로 바꾸지만, 기록 방식(사진 촬영/앨범/
  // 사진 없이)이 아직 확정되지 않은 동안에는 어떤 항목(미션 또는 특정 오늘의
  // 운동 instance)이 대기 중인지 이 id로 남겨둔다 — 확정 없이 홈으로
  // 돌아오면 이 값을 보고 rollback한다. null이면 대기 중인 항목이 없다.
  const [pendingRecordPlanItemId, setPendingRecordPlanItemId] = useState<
    string | null
  >(null);
  const [recordModalTitle, setRecordModalTitle] = useState("");

  // 체크 탭 → 기록 방식 선택 → (사진 촬영/앨범/생략) → 실제 수행값 입력
  // (record-editor) → POST /api/v1/workouts까지는 전부 다른 라우트로
  // 넘어갔다 돌아오는 흐름이라, 그 사이 실제로 기록 저장에 성공했는지
  // 이 화면은 직접 알 수 없다(성공/실패를 별도 신호로 넘겨받지 않는다).
  // 그래서 낙관적으로 켰던 체크를 무조건 되돌리는 대신, 홈으로 다시
  // 포커스가 돌아왔을 때 서버의 실제 상태를 다시 물어봐서 그대로 반영한다
  // — 중간에 그냥 나왔으면 여전히 미완료로, 실제로 저장됐으면 완료로
  // 자연스럽게 맞춰진다.
  function resyncPendingRecordWithServer(planItemId: string) {
    if (planItemId === MISSION_PLAN_ITEM_ID) {
      getDailyMission()
        .then(applyMissionResponse)
        .catch((error) => {
          console.error("Failed to resync mission status", error);
        });
      return;
    }

    // loadWorkoutsForDate는 날짜당 한 번만 불러오는 캐시가 있어, 오늘
    // 날짜는 강제로 다시 불러오게 캐시를 지운다.
    const now = new Date();
    loadedWorkoutDateKeysRef.current.delete(now.toDateString());
    loadWorkoutsForDate(now);
  }

  // 낙관적으로 켰던 체크를 되돌린다 — 백드롭 탭으로 모달을 닫을 때, 포커스
  // 재획득 시 pending rollback(바로 아래 effect), 그리고 앨범에서 선택하다
  // 취소/거부됐을 때 공통으로 쓴다. 카메라로 넘어가거나 "사진 없이
  // 기록하기"를 고르는 경우는 기록이 확정되므로 여기로 오지 않는다.
  // (아래 effect보다 먼저 선언해야 한다 — 함수 선언이라 런타임 호이스팅은
  // 되지만, 그 상태로 두면 "선언 전에 참조" 린트 경고가 난다.)
  function revertPendingRecord() {
    if (!pendingRecordPlanItemId) return;
    if (pendingRecordPlanItemId === MISSION_PLAN_ITEM_ID) {
      setMissionStatus("accepted");
    } else {
      // 여기서 쓰는 today는 날짜 키(toDateString)로만 쓰여서 컴포넌트
      // 상단의 today와 같은 날짜를 가리킨다 — 굳이 그 선언을 이 effect보다
      // 앞으로 옮기지 않고 그때그때 새로 만든다.
      updateWorkoutsForDate(new Date(), (workouts) =>
        workouts.map((workout) =>
          workout.id === pendingRecordPlanItemId
            ? { ...workout, isDone: false }
            : workout,
        ),
      );
    }
    setPendingRecordPlanItemId(null);
  }

  // 카메라 close, 앨범 선택 취소 후 이탈 등으로 기록 흐름을 아예 시작하지
  // 못한 채(=pendingRecordPlanItemId가 여전히 남은 채) 홈 탭으로 다시
  // 포커스가 돌아오면 위 재조회로 실제 상태를 맞춘다. isFocused가 마운트
  // 시점부터 이미 true이므로 "false→true 전환"만 감지해야 한다.
  const wasFocusedRef = useRef(isFocused);
  useEffect(() => {
    const wasFocused = wasFocusedRef.current;
    wasFocusedRef.current = isFocused;
    const regainedFocusWithPending =
      !wasFocused && isFocused && pendingRecordPlanItemId !== null;

    if (regainedFocusWithPending) {
      // 먼저 낙관적으로 켰던 완료 표시를 되돌린 뒤에 서버를 재조회한다 —
      // 재조회가 실패해도(네트워크 오류 등) rollback된 미완료 상태가 그대로
      // 남는다. 성공하면 그 응답이 실제 서버 상태(완료/미완료 어느 쪽이든)로
      // 다시 덮어써서 자연스럽게 맞춰진다. revertPendingRecord()가 이미
      // pendingRecordPlanItemId를 null로 지우므로, resync에 넘길 id를 먼저
      // 로컬 변수로 붙잡아 둔다.
      const planItemId = pendingRecordPlanItemId;
      revertPendingRecord();
      resyncPendingRecordWithServer(planItemId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, pendingRecordPlanItemId]);

  // 다른 탭으로 이동해 포커스를 잃으면 모달을 닫는다. isFocused를 visible
  // prop에서 직접 && 하면, 모달을 여는 탭(체크박스 탭)이 화면이 막 포커스를
  // 되찾은 직후 일어날 때 isFocused가 아직 stale한 false라서 visible이
  // false→true로 한 프레임 튀고, 그 사이 네이티브 Modal 표시 애니메이션이
  // 끊겨 버튼 일부가 깨져 보이는 문제가 있었다. useFocusEffect의 cleanup은
  // blur 시점에만 실행되므로 마운트 시 stale 값 문제가 없다.
  useFocusEffect(
    useCallback(() => {
      return () => setIsRecordMethodModalVisible(false);
    }, []),
  );

  const today = new Date();
  const todayWorkouts = getWorkoutsForDate(today);
  const selectedDateWorkouts = getWorkoutsForDate(selectedCalendarDate);
  const todayLabel = `${today.getMonth() + 1}월 ${today.getDate()}일`;
  const doneCount = todayWorkouts.filter((workout) => workout.isDone).length;
  // 로컬에서 아직 오늘 운동을 체크하지 않았어도, 서버 recordCount가 이미
  // 0보다 크면(다른 기기에서 기록했거나 앱을 재실행한 경우) 오늘을 이미
  // 기록된 날로 표시해야 한다 — recordCount는 그 날의 실제 기록 수이므로
  // "오늘이 기록됐는지" 판정에 직접 연결한다.
  const isTodayRecorded =
    doneCount > 0 || (daysByDate.get(toDateKey(today))?.recordCount ?? 0) > 0;
  const isSelectedDateToday =
    selectedCalendarDate.toDateString() === today.toDateString();
  // 오늘 이후(미래) 날짜는 아직 안 지난 날이라 "운동 추가"는 계속 가능해야
  // 하고, 미션 "받기"만 오늘에만 되는 것이므로 제외한다. isSelectedDateToday를
  // 먼저 걸러낸 뒤 비교하므로 시각(time-of-day) 차이는 결과에 영향 없다.
  const isSelectedDateFuture =
    !isSelectedDateToday && selectedCalendarDate > today;

  // 오늘(뱃지·스트릭 계산에 항상 필요)과 지금 보고 있는 날짜의 오늘의 운동을
  // 불러온다 — 지난 날짜는 TodayWorkoutCard 대신 DayRecordCard(캘린더 기반)를
  // 보여주므로 이 목록이 필요 없다.
  useEffect(() => {
    loadWorkoutsForDate(today);
    loadWorkoutsForDate(selectedCalendarDate);
    // 지난 날짜만 DayRecordCard("지난 운동")를 보여주므로, 그 실제 기록도
    // 그 경우에만 불러온다.
    if (!isSelectedDateToday && !isSelectedDateFuture) {
      loadWorkoutHistoryForDate(selectedCalendarDate);
    }
    // today는 매 렌더 새로 만들어지는 Date라 deps에 넣으면 매번 재실행된다.
    // 실제 재조회 여부는 각 loadXForDate 내부의 날짜별 캐시(ref)가 결정한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCalendarDate, isSelectedDateToday, isSelectedDateFuture]);
  const selectedDateLabel = `${selectedCalendarDate.getMonth() + 1}월 ${selectedCalendarDate.getDate()}일`;
  const selectedDateWorkoutHistory =
    workoutHistoryByDate[selectedCalendarDate.toDateString()] ?? [];
  const selectedDayRecord: DayRecord | null =
    isSelectedDateToday ||
    isSelectedDateFuture ||
    selectedDateWorkoutHistory.length === 0
      ? null
      : {
          workouts: selectedDateWorkoutHistory.map((entry) => ({
            title: entry.name,
            subtitle: summarizeWorkoutHistoryEntry(entry),
            isMission: entry.refType === "MISSION",
          })),
        };
  // 로컬에 상세가 없어도 서버 recordCount가 0보다 크면 "기록이 없다"고 하면
  // 안 된다 — 서버 사실과 모순된다. DayRecordCard가 이 값을 받아 로컬 상세가
  // 없을 때만 "이 날의 기록이 없어요" 대신 recordCount 기반 문구로 구분한다.
  const selectedDayServerRecordCount =
    isSelectedDateToday || isSelectedDateFuture
      ? 0
      : (daysByDate.get(toDateKey(selectedCalendarDate))?.recordCount ?? 0);

  const detailPlan =
    planDetailTarget?.kind === "saved"
      ? (savedWorkoutPlans.find(
          (plan) => plan.id === planDetailTarget.planId,
        ) ?? null)
      : planDetailTarget?.kind === "instance"
        ? (selectedDateWorkouts.find(
            (workout) => workout.id === planDetailTarget.instanceId,
          )?.plan ?? null)
        : null;

  // POST /api/v1/daily-plans — 오늘의 운동 등록. 서버가 발급한 id로 로컬
  // 인스턴스를 만들어야 이후 상세 조회/수정(/api/v1/daily-plans/{id})과
  // 이어질 수 있다.
  async function addSavedPlanToDate(plan: WorkoutPlanDraft, date: Date) {
    try {
      const { id } = await createDailyPlan({
        ...toPlanRequestFields(plan),
        planDate: toDateKey(date),
      });
      updateWorkoutsForDate(date, (workouts) => [
        ...workouts,
        createTodayWorkoutInstance(plan, String(id)),
      ]);
    } catch (error) {
      console.error("Failed to create daily plan", error);
      Alert.alert(
        "오류",
        "오늘의 운동을 등록하지 못했습니다. 다시 시도해주세요.",
      );
    }
  }

  function openNewPlanSheet() {
    setNewPlanDraft(createBlankWorkoutPlanDraft(`saved-plan-${Date.now()}`));
  }

  async function saveNewPlan(plan: WorkoutPlanDraft, saveAsRoutine: boolean) {
    // "루틴으로 할래요"(saveAsRoutine)가 꺼져 있으면(기본값) 1회성 운동이므로
    // 저장된 운동 계획에는 넣지 않고, 캘린더에서 지금 보고 있는 날짜(반드시
    // 실제 오늘은 아니다 — 다른 날짜를 보면서 추가할 수도 있다)에만 추가한다.
    // 켜져 있으면 재사용할 루틴이므로 POST /api/v1/plan-presets로 등록한다.
    if (!saveAsRoutine) {
      await addSavedPlanToDate(plan, selectedCalendarDate);
      setNewPlanDraft(null);
      return;
    }

    try {
      const { id } = await createPlanPreset(toPlanRequestFields(plan));
      setSavedWorkoutPlans((plans) => [...plans, { ...plan, id: String(id) }]);
    } catch {
      Alert.alert("오류", "루틴을 등록하지 못했습니다. 다시 시도해주세요.");
    }
    setNewPlanDraft(null);
  }

  // 오늘의 미션 체크와 동일한 패턴: 빈 체크를 탭하면 즉시 낙관적으로 완료
  // 처리하는 동시에 같은 이벤트에서 기록 방식 선택 모달을 연다. 완료된
  // 항목은 실제 기록(POST /api/v1/workouts)이 이미 만들어졌으므로 체크를
  // 다시 눌러 되돌릴 수 없다 — UI(TodayWorkoutRow)가 isDone인 항목엔
  // onToggle 자체를 안 넘겨서 이 함수는 항상 미완료 → 완료 방향으로만
  // 호출된다.
  function toggleTodayWorkoutDone(instanceId: string) {
    const workout = todayWorkouts.find((item) => item.id === instanceId);
    if (!workout || workout.isDone) return;

    updateWorkoutsForDate(today, (workouts) =>
      workouts.map((item) =>
        item.id === instanceId ? { ...item, isDone: true } : item,
      ),
    );
    openRecordMethodModal(instanceId, workout.plan.title);
  }

  // 오늘의 실제 운동 기록(day-record 화면)을 연다. day-record는 기록 id가
  // 아니라 날짜와 그 날 기록 목록에서의 위치(index)를 받으므로, 오늘 기록을
  // 다시 불러와 위치를 찾는다. 조회에 실패하거나 위치를 확정하지 못하면
  // (-1) 이동하지 않는다 — 0번(첫 기록)으로 fallback하면 탭한 항목과 다른
  // 기록이 열린다. 사진 유무는 진입 조건이 아니다(사진 없는 기록은 상세
  // 화면이 빈 사진 영역으로 보여준다).
  async function openTodayRecord(
    resolveIndex: (workouts: WorkoutHistoryResponse[]) => number,
  ) {
    let workouts: WorkoutHistoryResponse[];
    try {
      ({ workouts } = await getWorkoutHistory(toDateKey(today)));
    } catch (error) {
      console.error("Failed to load workout history", error);
      Alert.alert(
        "오류",
        "운동 기록을 불러오지 못했습니다. 다시 시도해주세요.",
      );
      return;
    }
    const index = resolveIndex(workouts);
    if (index < 0) {
      Alert.alert("오류", "해당 운동 기록을 찾지 못했습니다.");
      return;
    }
    router.push({
      pathname: "/day-record",
      params: { date: toDateKey(today), index: String(index) },
    });
  }

  // 완료된 "오늘의 운동" 항목을 탭하면 점세개(수정 시트) 대신 실제 운동
  // 기록으로 이동한다. 기록은 POST /api/v1/workouts에 refId(오늘의 운동 id
  // = TodayWorkoutInstance.id)로 연결해 만들지만 GET /api/v1/workouts 응답
  // (WorkoutHistoryResponse)은 그 refId를 돌려주지 않아 id로 직접 맞출 수
  // 없다. 그래서 같은 제목의 PLAN 기록이 정확히 하나일 때만 연다 — 같은
  // 제목이 둘 이상이면 어느 것이 이 항목의 기록인지 프론트에서 구분할 수
  // 없으므로 열지 않는다. 정확히 맞추려면 서버가 refId를 내려줘야 한다.
  function openTodayWorkoutRecord(instanceId: string) {
    const workout = todayWorkouts.find((item) => item.id === instanceId);
    if (!workout) return;
    return openTodayRecord((workouts) =>
      findUniqueRecordIndex(
        workouts,
        (entry) =>
          entry.refType === "PLAN" && entry.name === workout.plan.title,
      ),
    );
  }

  // 서버에서 완료된 "오늘의 미션"을 탭하면 그 미션으로 남긴 실제 운동
  // 기록으로 이동한다. GET /api/v1/missions/daily가 하루에 미션 하나만
  // 내려주므로 오늘 기록 중 refType === "MISSION"인 것이 그 미션의 기록이다
  // — 단 위와 같이 refId가 없어 MISSION 기록이 정확히 하나일 때만 연다.
  function openMissionRecord() {
    return openTodayRecord((workouts) =>
      findUniqueRecordIndex(workouts, (entry) => entry.refType === "MISSION"),
    );
  }

  // 스톱워치 시작/일시정지 — 확인창은 StopwatchBar가 띄우고, 여기선 상태만
  // 바꾼다. startedAt(벽시계 기준 시각)로 경과시간을 계산하므로 이 함수는
  // 그 기준점만 세팅/정산한다.
  function toggleStopwatchRun(instanceId: string) {
    updateWorkoutsForDate(today, (workouts) =>
      workouts.map((item) => {
        if (item.id !== instanceId || !item.stopwatch) return item;
        if (item.stopwatch.isRunning) {
          const elapsedSeconds =
            item.stopwatch.elapsedSeconds +
            (item.stopwatch.startedAt
              ? (Date.now() - item.stopwatch.startedAt) / 1000
              : 0);
          return {
            ...item,
            stopwatch: { elapsedSeconds, isRunning: false, startedAt: null },
          };
        }
        return {
          ...item,
          stopwatch: {
            ...item.stopwatch,
            isRunning: true,
            startedAt: Date.now(),
          },
        };
      }),
    );
  }

  function resetStopwatch(instanceId: string) {
    updateWorkoutsForDate(today, (workouts) =>
      workouts.map((item) =>
        item.id === instanceId && item.stopwatch
          ? {
              ...item,
              stopwatch: {
                elapsedSeconds: 0,
                isRunning: false,
                startedAt: null,
              },
            }
          : item,
      ),
    );
  }

  // "저장하기" 확인 후 호출 — 다른 완료 처리와 동일하게 사진 기록 방식 선택
  // 모달로 이어진다. 스톱워치 값 자체는 toggleStopwatchRun이 이미 멈춰서
  // 정산해뒀다.
  function finishStopwatch(instanceId: string) {
    const workout = todayWorkouts.find((item) => item.id === instanceId);
    if (!workout) return;

    updateWorkoutsForDate(today, (workouts) =>
      workouts.map((item) =>
        item.id === instanceId ? { ...item, isDone: true } : item,
      ),
    );
    openRecordMethodModal(instanceId, workout.plan.title);
  }

  function updateSavedPlan(updatedPlan: WorkoutPlanDraft) {
    setSavedWorkoutPlans((plans) =>
      plans.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan)),
    );
  }

  function deleteSavedPlan(planId: string) {
    setSavedWorkoutPlans((plans) => plans.filter((plan) => plan.id !== planId));
  }

  // WorkoutPlanDetailBottomSheet는 "저장된 계획"과 "오늘의 운동 인스턴스"
  // 둘 다에 재사용된다 — planDetailTarget의 종류에 따라 PUT
  // /api/v1/plan-presets/{id} 또는 PUT /api/v1/daily-plans/{id}로 보내고,
  // 성공하면 그 쪽(savedWorkoutPlans 또는 그 날짜의 workoutsByDate)만
  // 갱신한다.
  async function updateDetailPlan(updatedPlan: WorkoutPlanDraft) {
    if (!planDetailTarget) return;

    try {
      if (planDetailTarget.kind === "saved") {
        await updatePlanPreset(
          Number(updatedPlan.id),
          toPlanRequestFields(updatedPlan),
        );
        updateSavedPlan(updatedPlan);
        return;
      }

      await updateDailyPlan(
        Number(updatedPlan.id),
        toPlanRequestFields(updatedPlan),
      );
      updateWorkoutsForDate(selectedCalendarDate, (workouts) =>
        workouts.map((workout) => {
          if (workout.id !== planDetailTarget.instanceId) return workout;
          // plan 교체만으론 부족하다 — TodayWorkoutRow/StopwatchBar는
          // plan.stopwatchEnabled가 아니라 workout.stopwatch(런타임 값)의
          // 존재 여부로 스톱워치 바를 그린다. 수정에서 새로 켰다면 채워
          // 주고, 껐다면 지워야 켜기 전 상태로 만든 스톱워치가 계속 남지
          // 않는다. 이미 켜져 있었다면 진행 중이던 값을 그대로 둔다.
          const stopwatch = !updatedPlan.stopwatchEnabled
            ? undefined
            : (workout.stopwatch ?? {
                elapsedSeconds: 0,
                isRunning: false,
                startedAt: null,
              });
          return { ...workout, plan: updatedPlan, stopwatch };
        }),
      );
    } catch {
      Alert.alert("오류", "수정하지 못했습니다. 다시 시도해주세요.");
    }
  }

  // planDetailTarget의 종류에 따라 DELETE /api/v1/plan-presets/{id} 또는
  // DELETE /api/v1/daily-plans/{id}를 먼저 보내고, 성공했을 때만 로컬
  // 목록에서 지운다.
  async function deleteDetailPlan() {
    if (!planDetailTarget) return;

    if (planDetailTarget.kind === "saved") {
      try {
        await deletePlanPreset(Number(planDetailTarget.planId));
        deleteSavedPlan(planDetailTarget.planId);
        setPlanDetailTarget(null);
      } catch {
        Alert.alert("오류", "삭제하지 못했습니다. 다시 시도해주세요.");
      }
      return;
    }

    try {
      await deleteDailyPlan(Number(planDetailTarget.instanceId));
      updateWorkoutsForDate(selectedCalendarDate, (workouts) =>
        workouts.filter(
          (workout) => workout.id !== planDetailTarget.instanceId,
        ),
      );
      setPlanDetailTarget(null);
    } catch {
      // 이미 완료 처리한 오늘의 운동은 서버가 제외(삭제)를 거절한다
      // (API 설명: "이미 완료 처리한 운동은 제외할 수 없다").
      Alert.alert("오류", "이미 완료 처리한 운동은 제외할 수 없습니다.");
    }
  }

  // 빈 체크를 탭하면 즉시(optimistic) 체크 UI를 켜는 동시에 같은 이벤트에서
  // 기록 방식 선택 모달을 연다 — 모달 결과를 기다렸다가 그때 체크하지 않는다.
  // 이미 체크된 상태를 다시 누르면(완료 취소) 기존처럼 즉시 되돌린다.
  function openRecordMethodModal(planItemId: string, title: string) {
    setPendingRecordPlanItemId(planItemId);
    setRecordModalTitle(title);
    setIsRecordMethodModalVisible(true);
  }

  // 서버에서 이미 COMPLETED인 미션(=pendingRecordPlanItemId가 미션이
  // 아닌 completed)은 실제 기록(POST /api/v1/workouts)과 미션 완료 처리가
  // 이미 끝났으므로 체크를 다시 눌러 되돌릴 수 없다 — 되돌린 뒤 다시
  // 완료하면 같은 refId로 기록이 중복 생성된다. 체크 탭 직후 아직 기록
  // 방식을 고르기 전(낙관적 completed, pendingRecordPlanItemId가 미션)에만
  // 기존처럼 즉시 되돌린다. MissionCard도 이 조건으로 체크 버튼을
  // 비활성화하지만, 여기서도 한 번 더 막아둔다.
  const isMissionCompletedOnServer =
    missionStatus === "completed" &&
    pendingRecordPlanItemId !== MISSION_PLAN_ITEM_ID;

  function handleMissionCompletePress() {
    if (missionStatus === "completed") {
      if (isMissionCompletedOnServer) return;
      setIsRecordMethodModalVisible(false);
      revertPendingRecord();
      return;
    }
    setMissionStatus("completed");
    openRecordMethodModal(MISSION_PLAN_ITEM_ID, missionTitle);
  }

  function dismissRecordMethodModal() {
    setIsRecordMethodModalVisible(false);
    revertPendingRecord();
  }

  // planItemId가 미션 sentinel이면 missionId(실제 서버 id)를, 아니면
  // planItemId 자체(이미 실제 서버 오늘의 운동 id)를 refId로 삼는다.
  // MISSION_PLAN_ITEM_ID sentinel은 절대 refId로 보내지 않는다 — 미션
  // id를 아직 모르면(이론상 있을 수 없지만 방어적으로) null을 돌려준다.
  function buildRecordTarget(planItemId: string) {
    if (planItemId === MISSION_PLAN_ITEM_ID) {
      if (missionId == null) return null;
      return {
        mode: "LINKED" as const,
        refType: "MISSION" as const,
        refId: missionId,
        title: recordModalTitle,
      };
    }
    // todayWorkouts의 plan은 이미 fromDailyPlanResponse를 거친 UI 도메인
    // 값(selectedGoalTypes/goalValues, 분·km)이다 — record-editor가 "실제
    // 수행값"의 초기값으로 그대로 쓸 수 있도록 함께 넘긴다. 목록에서 찾지
    // 못하면(이론상 있을 수 없지만 방어적으로) 초기값 없이 기존 빈 선택
    // 상태로 시작한다.
    const workout = todayWorkouts.find((item) => item.id === planItemId);
    // 스톱워치로 잰 시간은 계획의 목표 시간(plan.goalValues.time)과 다른
    // 값이다 — 스톱워치가 있는 항목(plan.stopwatchEnabled)은 finishStopwatch
    // 시점에 toggleStopwatchRun이 이미 멈춰서 정산해둔 실제 경과 초를
    // 분으로 바꿔 목표 시간 대신 넣는다. 없으면 그대로 목표값을 쓴다.
    const stopwatchMinutes = workout?.stopwatch
      ? Math.max(1, Math.round(workout.stopwatch.elapsedSeconds / 60))
      : null;
    return {
      mode: "LINKED" as const,
      refType: "PLAN" as const,
      refId: Number(planItemId),
      title: recordModalTitle,
      ...(workout && workout.plan.selectedGoalTypes.length > 0
        ? {
            initialGoalTypes: workout.plan.selectedGoalTypes,
            initialGoalValues:
              stopwatchMinutes == null
                ? workout.plan.goalValues
                : { ...workout.plan.goalValues, time: stopwatchMinutes },
          }
        : null),
    };
  }

  // 사진 없이도 실제 수행값 입력(record-editor)은 그대로 거쳐야 한다 —
  // "사진 생략"은 사진만 건너뛸 뿐, 기록 자체는 여전히 그 화면에서
  // 확정된다.
  function completeRecordWithoutPhoto() {
    setIsRecordMethodModalVisible(false);
    const planItemId = pendingRecordPlanItemId ?? MISSION_PLAN_ITEM_ID;
    const target = buildRecordTarget(planItemId);
    if (!target) {
      revertPendingRecord();
      return;
    }
    useRecordFlowStore.getState().setPhoto(null);
    useRecordFlowStore.getState().setTarget(target);
    router.push("/record-editor");
  }

  // camera.tsx가 refType/refId를 이미 받았으면(PLAN/MISSION 둘 다) 대상
  // 선택 화면을 건너뛰고 바로 기록 입력으로 이어간다 — route param은
  // 문자열만 가능해 refId를 String으로 보낸다.
  function buildRecordCameraParams() {
    const planItemId = pendingRecordPlanItemId ?? MISSION_PLAN_ITEM_ID;
    const target = buildRecordTarget(planItemId);
    return {
      title: recordModalTitle,
      ...(target
        ? { refType: target.refType, refId: String(target.refId) }
        : null),
    };
  }

  function startRecordPhotoCapture() {
    setIsRecordMethodModalVisible(false);
    const planItemId = pendingRecordPlanItemId ?? MISSION_PLAN_ITEM_ID;
    const target = buildRecordTarget(planItemId);
    if (!target) {
      revertPendingRecord();
      return;
    }
    // camera.tsx가 업로드 완료 후 route param(refType/refId)만으로 target을
    // 다시 만들면 여기서 계산한 initialGoalTypes/initialGoalValues(PLAN
    // 목표값 prefill)가 사라진다 — 카메라로 넘어가기 전에 미리 full target을
    // store에 심어 두면 camera.tsx가 이 값을 그대로 보존해 쓴다(camera.tsx의
    // handleUsePhoto 참고). 이전 세션에서 남은 사진이 있을 수 있어 함께
    // 정리한다.
    useRecordFlowStore.getState().setPhoto(null);
    useRecordFlowStore.getState().setTarget(target);
    router.push({
      pathname: "/camera",
      params: buildRecordCameraParams(),
    });
  }

  // 앨범 picker는 여기(홈 화면)에서 바로 연다 — /camera 화면이 fullScreenModal로
  // 올라오는 present 전환이 채 끝나기 전에 그 안에서 두 번째 네이티브 모달(사진
  // picker)을 띄우면 iOS가 그 두 번째 present를 조용히 무시해버려서 피커가 아예
  // 뜨지 않는 문제가 있었다. 홈 화면은 이미 완전히 떠 있는 상태라 그 충돌이 없다.
  // 사진을 고르면 그때 /camera를 그 사진 미리보기(확인) 화면으로 바로 띄운다.
  async function startRecordLibraryPick() {
    setIsRecordMethodModalVisible(false);
    const planItemId = pendingRecordPlanItemId ?? MISSION_PLAN_ITEM_ID;
    const target = buildRecordTarget(planItemId);
    if (!target) {
      revertPendingRecord();
      return;
    }
    try {
      const libraryPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!libraryPermission.granted) {
        Alert.alert("사진 보관함 접근 권한이 필요합니다.");
        revertPendingRecord();
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
      });
      if (result.canceled) {
        revertPendingRecord();
        return;
      }

      const asset = result.assets[0];
      // startRecordPhotoCapture와 같은 이유로, 실제로 사진이 확정된 뒤(취소/
      // 권한 거부 시에는 건드리지 않는다) /camera로 넘어가기 직전에만 full
      // target을 store에 심는다 — 그래야 picker를 취소해도 stale target이
      // 남지 않는다.
      useRecordFlowStore.getState().setPhoto(null);
      useRecordFlowStore.getState().setTarget(target);
      router.push({
        pathname: "/camera",
        params: {
          ...buildRecordCameraParams(),
          pickedUri: asset.uri,
          pickedWidth: String(asset.width),
          pickedHeight: String(asset.height),
        },
      });
    } catch (pickError) {
      logImageUploadError("photo library pick failed", pickError);
      Alert.alert("사진을 불러오지 못했어요. 다시 시도해 주세요.");
      revertPendingRecord();
    }
  }

  return (
    // bottom을 빼는 이유: 이 화면은 항상 탭바 위에 떠 있고, 탭바가 하단 시스템
    // 네비게이션 바 여백을 이미 처리한다. Screen의 기본(all edges)을 그대로
    // 쓰면 안드로이드 edge-to-edge에서 insets.bottom이 탭바 유무와 무관하게
    // 그대로 잡혀 탭바 위에 빈 여백이 한 번 더 생긴다(iOS는 탭 화면에서 0으로
    // 잡혀 눈에 띄지 않았다).
    <Screen
      edges={["top"]}
      style={{ backgroundColor: HOME_SURFACE_BACKGROUND }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.three,
          paddingBottom: Spacing.four,
          gap: Spacing.four,
        }}
      >
        <HomeCalendar
          viewedMonth={viewedMonth}
          onViewedMonthChange={setViewedMonth}
          today={today}
          onSelectDate={setSelectedCalendarDate}
          onDayWithRecordPress={(dateKey) =>
            router.push({
              pathname: "/day-record",
              params: { date: dateKey, index: "0" },
            })
          }
          daysByDate={daysByDate}
          isTodayRecorded={isTodayRecorded}
          hasLocalScheduledWorkout={(date) =>
            getWorkoutsForDate(date).length > 0
          }
          streakDays={streakDays}
          calendarError={calendarError}
          unreadPushCount={unreadPushCount}
          onPressNotifications={() => router.push("/notifications")}
        />

        {isSelectedDateToday && (
          <MissionCard
            arrivalLabel={missionArrivalLabel}
            description={missionDescription}
            onAccept={handleMissionAccept}
            onOpenRecord={
              isMissionCompletedOnServer ? openMissionRecord : undefined
            }
            onReveal={handleMissionReveal}
            onToggleComplete={
              isMissionCompletedOnServer
                ? undefined
                : handleMissionCompletePress
            }
            status={missionStatus}
            title={missionTitle}
          />
        )}

        {isSelectedDateToday || isSelectedDateFuture ? (
          <TodayWorkoutCard
            dateLabel={isSelectedDateToday ? todayLabel : selectedDateLabel}
            emptyStateLabel={
              isSelectedDateToday
                ? "오늘 담은 운동이 없어요"
                : "담은 운동이 없어요"
            }
            expanded={isTodayCardExpanded}
            onAddSavedPlan={(plan) =>
              addSavedPlanToDate(plan, selectedCalendarDate)
            }
            onOpenSavedPlan={(planId) =>
              setPlanDetailTarget({ kind: "saved", planId })
            }
            onOpenWorkoutDetail={(instanceId) =>
              setPlanDetailTarget({ kind: "instance", instanceId })
            }
            onOpenWorkoutRecord={openTodayWorkoutRecord}
            onToggleExpanded={() =>
              setIsTodayCardExpanded((expanded) => !expanded)
            }
            onStopwatchFinish={finishStopwatch}
            onStopwatchReset={resetStopwatch}
            onStopwatchToggleRun={toggleStopwatchRun}
            onToggleTodayWorkout={toggleTodayWorkoutDone}
            readOnly={!isSelectedDateToday}
            savedWorkoutPlans={savedWorkoutPlans}
            title={isSelectedDateToday ? "오늘의 운동" : "예정된 운동"}
            todayWorkouts={selectedDateWorkouts}
          />
        ) : (
          <DayRecordCard
            dateLabel={selectedDateLabel}
            record={selectedDayRecord}
            serverRecordCount={selectedDayServerRecordCount}
            expanded={isTodayCardExpanded}
            onToggleExpanded={() =>
              setIsTodayCardExpanded((expanded) => !expanded)
            }
            onSelectRecord={(index) =>
              router.push({
                pathname: "/day-record",
                params: {
                  date: toDateKey(selectedCalendarDate),
                  index: String(index),
                },
              })
            }
          />
        )}

        {(isSelectedDateToday || isSelectedDateFuture) && (
          <AddItemButton label="운동 추가하기" onPress={openNewPlanSheet} />
        )}
      </ScrollView>

      {detailPlan && isFocused && (
        <WorkoutPlanDetailBottomSheet
          key={detailPlan.id}
          onClose={() => setPlanDetailTarget(null)}
          onDelete={deleteDetailPlan}
          onUpdate={updateDetailPlan}
          plan={detailPlan}
        />
      )}

      <RecordMethodModal
        onClose={dismissRecordMethodModal}
        onPickFromLibrary={startRecordLibraryPick}
        onSkipPhoto={completeRecordWithoutPhoto}
        onTakePhoto={startRecordPhotoCapture}
        title={recordModalTitle}
        visible={isRecordMethodModalVisible}
      />

      {isFocused && (
        <MissionFeedbackModal
          missionId={pendingMissionFeedbackId}
          missionTitle={missionTitle}
          onComplete={handleMissionFeedbackComplete}
          onSkip={handleMissionFeedbackSkip}
          visible={pendingMissionFeedbackId != null}
        />
      )}

      {isFocused && isMissionFeedbackToastVisible && (
        <MissionFeedbackToast
          onHide={() => setIsMissionFeedbackToastVisible(false)}
        />
      )}

      {newPlanDraft && isFocused && (
        <WorkoutPlanEditSheet
          onClose={() => setNewPlanDraft(null)}
          onDelete={() => setNewPlanDraft(null)}
          onSave={saveNewPlan}
          saveLabel="오늘의 운동으로 담기"
          showDelete={false}
          showAddToTodayToggle
          title="운동 추가하기"
          value={newPlanDraft}
          visible
        />
      )}
    </Screen>
  );
}
