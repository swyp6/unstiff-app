import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useIsFocused } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { semanticColors } from "@/constants/tokens";
import { getCalendarMonth } from "@/features/calendar/api";
import type { CalendarDay, CalendarResponse } from "@/features/calendar/types";
import {
  acceptMission,
  dismissMission,
  getDailyMission,
  prefetchDailyMission,
} from "@/features/missions/api";
import { formatOfferArrivalLabel } from "@/features/missions/offer-time";
import type { DailyMissionResponse } from "@/features/missions/types";
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
  TodayWorkoutCard,
  type TodayWorkoutInstance,
} from "@/features/workout-plan/components/home-workout-cards";
import { WorkoutPlanDetailBottomSheet } from "@/features/workout-plan/components/workout-plan-detail-bottom-sheet";
import { WorkoutPlanEditSheet } from "@/features/workout-plan/components/workout-plan-edit-sheet";
import {
  createBlankWorkoutPlanDraft,
  fromDailyPlanResponse,
  fromPlanPresetResponse,
  getWorkoutPlanSummary,
  toPlanRequestFields,
  type WorkoutPlanDraft,
} from "@/features/workout-plan/model";
import { RecordMethodModal } from "@/features/upload/components/record-method-modal";
import { logImageUploadError } from "@/features/upload/cloudinary";
import { getOptimizedImageUrl } from "@/features/upload/image-transform";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";
import { useTheme } from "@/hooks/use-theme";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_SWIPE_THRESHOLD = 60;

// 캘린더 날짜 셀(43x60pt) 표시 크기의 2배(레티나 기준)로 요청 — 프리셋
// (w200_h200 등)은 정사각형 프로필용이라 이 좁고 긴 셀 비율에 맞지 않는다.
const CALENDAR_DAY_THUMBNAIL_SIZE = { width: 86, height: 120 };

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

// calendar API에는 날짜별 recordCount만 있고 개별 기록의 제목/미션 여부 같은
// 상세 정보가 없다 — 그래서 미션 항목은 아예 만들 수 없고, "지난 운동"
// 목록은 이 세션에서 사용자가 실제로 완료 처리한 로컬 운동(workoutsByDate)만
// 보여준다. 상세 기록 조회 API가 생기면 이 타입을 확장한다.
type DayRecord = {
  workouts: { title: string; subtitle: string }[];
};

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
  };
}

function buildCalendarWeeks(reference: Date): (number | null)[][] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // Sun=0..Sat=6

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

// 서버 CalendarDay.date가 "YYYY-MM-DD" 로컬 날짜 문자열이므로, UTC 변환이
// 섞이는 toISOString() 대신 로컬 필드로 같은 포맷의 키를 만들어 그대로 비교한다.
function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// 요일 라벨 행. 달 전환 시 날짜 그리드와 같이 슬라이드되도록 각 달 패널
// 안쪽에 렌더링한다 — 셋 다 내용은 같지만 패널마다 하나씩 필요하다.
function WeekdayHeaderRow() {
  return (
    <View className="flex-row items-center justify-between">
      {WEEKDAY_LABELS.map((label) => (
        <View key={label} className="w-[43px] items-center">
          <ThemedText typography="caption-1-bold" themeColor="textSecondary">
            {label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
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
}: {
  dateLabel: string;
  record: DayRecord | null;
  // 로컬에 상세 항목이 없을 때(entries.length === 0) "기록이 없다"와 "서버에는
  // 기록이 있지만 상세를 보여줄 수 없다"를 구분하는 데만 쓰인다.
  serverRecordCount: number;
  expanded: boolean;
  onToggleExpanded: () => void;
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
                <View
                  key={index}
                  className="flex-row items-center gap-3 border-b border-line-subtle py-3"
                >
                  <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-label-normal">
                    <Ionicons
                      color={semanticColors["label-inverse"]}
                      name="checkmark"
                      size={16}
                    />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <ThemedText
                      typography="body-3-bold"
                      themeColor="textSecondary"
                      style={{ textDecorationLine: "line-through" }}
                    >
                      {entry.title}
                    </ThemedText>
                    <ThemedText
                      typography="caption-1-regular"
                      style={{ color: semanticColors["label-disabled"] }}
                    >
                      {entry.subtitle}
                    </ThemedText>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
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
      .then((response) => {
        // offerTime이 빈 문자열/undefined로 오면 도착 문구만 조용히
        // 비어버리는 문제가 있어(포맷 함수는 방어했지만 원인 확인용),
        // 실제 응답 값을 남겨서 기기 로그에서 확인할 수 있게 한다.
        console.log("[mission] daily mission response", response);
        applyMissionResponse(response);
      })
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

  async function handleMissionDismiss() {
    if (missionId == null) return;
    try {
      applyMissionResponse(await dismissMission(missionId));
    } catch {
      Alert.alert("오류", "미션을 닫지 못했습니다. 다시 시도해주세요.");
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

  function updateWorkoutsForDate(
    date: Date,
    updater: (workouts: TodayWorkoutInstance[]) => TodayWorkoutInstance[],
  ) {
    const key = date.toDateString();
    setWorkoutsByDate((current) => ({
      ...current,
      [key]: updater(current[key] ?? []),
    }));
  }

  // GET /api/v1/daily-plans?date= 로 채운 날짜는 세션 동안 다시 불러오지
  // 않는다 — ref라 값이 바뀌어도 리렌더를 트리거하지 않고, 이미 로드된
  // 날짜에 로컬로 추가한 항목(addSavedPlanToDate 등)이 재조회로 덮어써지지
  // 않게 막아준다.
  const loadedWorkoutDateKeysRef = useRef(new Set<string>());

  function loadWorkoutsForDate(date: Date) {
    const key = date.toDateString();
    if (loadedWorkoutDateKeysRef.current.has(key)) return;
    loadedWorkoutDateKeysRef.current.add(key);

    getDailyPlans(toDateKey(date))
      .then(({ dailyPlans }) => {
        const fetched = dailyPlans.map((dailyPlan) => ({
          id: String(dailyPlan.id),
          plan: fromDailyPlanResponse(dailyPlan),
          isDone: dailyPlan.status === "COMPLETED",
        }));
        setWorkoutsByDate((current) => {
          // 이 요청이 떠 있는 동안 addSavedPlanToDate 등으로 로컬에 먼저
          // 추가된 항목은 이 스냅샷에 없을 수 있다 — 통째로 덮어쓰면
          // 사라지므로, 응답에 없는 로컬 항목만 뒤에 이어붙인다.
          const fetchedIds = new Set(fetched.map((workout) => workout.id));
          const localOnly = (current[key] ?? []).filter(
            (workout) => !fetchedIds.has(workout.id),
          );
          return { ...current, [key]: [...fetched, ...localOnly] };
        });
      })
      .catch((error) => {
        console.error("Failed to load daily plans", error);
        loadedWorkoutDateKeysRef.current.delete(key);
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
  // "신규 운동 계획 추가"로 연 빈 계획 초안. null이면 시트가 안 보인다.
  const [newPlanDraft, setNewPlanDraft] = useState<WorkoutPlanDraft | null>(
    null,
  );
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
  // 로딩 중인지도 별도 setState 없이 파생한다 — 지금 보고 있는 달의 응답도
  // 에러도 아직 없으면(=요청이 진행 중이면) loading이다.
  const isCalendarDataForViewedMonth =
    calendarMonthData?.year === viewedYear &&
    calendarMonthData?.month === viewedMonthNumber;
  const isCalendarLoading = !isCalendarDataForViewedMonth && !calendarError;

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
  }, [viewedYear, viewedMonthNumber]);

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
      resyncPendingRecordWithServer(pendingRecordPlanItemId);
      setPendingRecordPlanItemId(null);
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
  const weeks = buildCalendarWeeks(viewedMonth);
  const previousMonthDate = new Date(
    viewedMonth.getFullYear(),
    viewedMonth.getMonth() - 1,
    1,
  );
  const nextMonthDate = new Date(
    viewedMonth.getFullYear(),
    viewedMonth.getMonth() + 1,
    1,
  );
  const previousMonthWeeks = buildCalendarWeeks(previousMonthDate);
  const nextMonthWeeks = buildCalendarWeeks(nextMonthDate);
  // 달마다 주(week) 수가 다르므로(4~6주), 옆 달 패널의 높이에 캘린더 전체가
  // 끌려가지 않도록 현재 달 기준으로 뷰포트 높이를 고정한다. 요일 행(16px)도
  // 이제 패널 안에서 같이 슬라이드되므로 그 높이 + gap(6px)까지 더한다.
  const calendarViewportHeight =
    16 + 6 + weeks.length * 60 + (weeks.length - 1) * 6;
  const monthLabel = `${viewedMonth.getFullYear()}년 ${viewedMonth.getMonth() + 1}월`;
  const todayLabel = `${today.getMonth() + 1}월 ${today.getDate()}일`;
  const doneCount = todayWorkouts.filter((workout) => workout.isDone).length;
  const hasCompletedTodayWorkout = todayWorkouts.some(
    (workout) => workout.isDone,
  );
  // 로컬에서 아직 오늘 운동을 체크하지 않았어도, 서버 recordCount가 이미
  // 0보다 크면(다른 기기에서 기록했거나 앱을 재실행한 경우) 오늘을 이미
  // 기록된 날로 표시해야 한다 — recordCount는 그 날의 실제 기록 수이므로
  // "오늘이 기록됐는지" 판정에 직접 연결한다.
  const isTodayRecorded =
    doneCount > 0 || (daysByDate.get(toDateKey(today))?.recordCount ?? 0) > 0;
  const todayPhotoUrl = todayWorkouts.find(
    (workout) => workout.photoUrl,
  )?.photoUrl;
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
    if (isSelectedDateToday || isSelectedDateFuture) {
      loadWorkoutsForDate(selectedCalendarDate);
    }
    // today는 매 렌더 새로 만들어지는 Date라 deps에 넣으면 매번 재실행된다.
    // 실제 재조회 여부는 loadWorkoutsForDate 내부의 날짜별 캐시(ref)가 결정한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCalendarDate, isSelectedDateToday, isSelectedDateFuture]);
  const selectedDateLabel = `${selectedCalendarDate.getMonth() + 1}월 ${selectedCalendarDate.getDate()}일`;
  // calendar API는 그 날의 recordCount만 알려줄 뿐 어떤 운동/미션이었는지는
  // 내려주지 않는다 — 그 내용을 지어내지 않고, 이 세션에서 사용자가 실제로
  // 완료 처리한 로컬 기록(workoutsByDate)만 "지난 운동" 목록으로 보여준다.
  const completedSelectedDateWorkouts = selectedDateWorkouts.filter(
    (workout) => workout.isDone,
  );
  const selectedDayRecord: DayRecord | null =
    isSelectedDateToday ||
    isSelectedDateFuture ||
    completedSelectedDateWorkouts.length === 0
      ? null
      : {
          workouts: completedSelectedDateWorkouts.map((workout) => ({
            title: workout.plan.title,
            subtitle: getWorkoutPlanSummary(workout.plan),
          })),
        };
  // 로컬에 상세가 없어도 서버 recordCount가 0보다 크면 "기록이 없다"고 하면
  // 안 된다 — 서버 사실과 모순된다. DayRecordCard가 이 값을 받아 로컬 상세가
  // 없을 때만 "이 날의 기록이 없어요" 대신 recordCount 기반 문구로 구분한다.
  const selectedDayServerRecordCount =
    isSelectedDateToday || isSelectedDateFuture
      ? 0
      : (daysByDate.get(toDateKey(selectedCalendarDate))?.recordCount ?? 0);

  // 드래그 중엔 캘린더가 손가락을 그대로 따라가다가(dragX), 손을 떼면 임계값을
  // 넘었는지에 따라 다음/이전 달 패널 쪽으로 마저 넘어가거나(withTiming) 제자리로
  // 되돌아온다(withSpring). calendarWidth는 실제 달(가운데 패널) 기준 오프셋이다.
  const dragX = useSharedValue(0);
  const [calendarWidth, setCalendarWidth] = useState(0);

  // 달력에서 달만 넘기는 것(화살표·스와이프)과 날짜를 실제로 선택하는 것
  // (날짜 셀 탭, 아래쪽 setSelectedCalendarDate)은 별개다 — 그냥 달만
  // 둘러보는 중에는 하단 미션/운동 패널이 계속 마지막으로 선택했던 날짜를
  // 그대로 보여준다. 여기서 selectedCalendarDate를 건드리지 않는다.
  const commitMonthChange = useCallback((delta: 1 | -1) => {
    setViewedMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() + delta, 1),
    );
  }, []);

  // dragX를 여기서 바로 0으로 되돌리면 패널 내용(previousMonthWeeks 등)이 새
  // viewedMonth로 다시 그려지기 전에 위치부터 가운데로 스냅돼 한 프레임 깜빡인다.
  // useLayoutEffect로 재렌더가 커밋된 뒤에 리셋해서 내용과 위치가 같이 바뀌게 한다.
  useLayoutEffect(() => {
    dragX.value = 0;
  }, [viewedMonth, dragX]);

  function goToPreviousMonth() {
    if (!calendarWidth) {
      commitMonthChange(-1);
      return;
    }
    // Reanimated shared value — .value assignment is the intended API, not
    // a mutation of a hook's return value.
    // eslint-disable-next-line react-hooks/immutability
    dragX.value = withTiming(calendarWidth, { duration: 220 }, (finished) => {
      "worklet";
      if (finished) scheduleOnRN(commitMonthChange, -1);
    });
  }

  function goToNextMonth() {
    if (!calendarWidth) {
      commitMonthChange(1);
      return;
    }
    // eslint-disable-next-line react-hooks/immutability
    dragX.value = withTiming(-calendarWidth, { duration: 220 }, (finished) => {
      "worklet";
      if (finished) scheduleOnRN(commitMonthChange, 1);
    });
  }

  // 세로 ScrollView 안에 있으므로 activeOffsetX/failOffsetY로 가로 스와이프일
  // 때만 반응하고 세로 스크롤은 그대로 통과시킨다.
  const monthSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .onUpdate((event) => {
          "worklet";
          if (!calendarWidth) return;
          // eslint-disable-next-line react-hooks/immutability
          dragX.value = Math.max(
            -calendarWidth,
            Math.min(calendarWidth, event.translationX),
          );
        })
        .onEnd((event) => {
          "worklet";
          if (!calendarWidth) return;

          if (event.translationX < -MONTH_SWIPE_THRESHOLD) {
            // eslint-disable-next-line react-hooks/immutability
            dragX.value = withTiming(
              -calendarWidth,
              { duration: 220 },
              (finished) => {
                if (finished) scheduleOnRN(commitMonthChange, 1);
              },
            );
          } else if (event.translationX > MONTH_SWIPE_THRESHOLD) {
            dragX.value = withTiming(
              calendarWidth,
              { duration: 220 },
              (finished) => {
                if (finished) scheduleOnRN(commitMonthChange, -1);
              },
            );
          } else {
            dragX.value = withSpring(0);
          }
        }),
    [calendarWidth, commitMonthChange, dragX],
  );

  const pagerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -calendarWidth + dragX.value }],
  }));

  function renderMonthGrid(monthWeeks: (number | null)[][], monthDate: Date) {
    const isThisMonth =
      monthDate.getFullYear() === today.getFullYear() &&
      monthDate.getMonth() === today.getMonth();

    return monthWeeks.map((week, weekIndex) => (
      <View key={weekIndex} className="flex-row items-center justify-between">
        {week.map((day, dayIndex) => {
          if (day === null) {
            return <View key={dayIndex} className="h-[60px] w-[43px]" />;
          }

          const isToday = isThisMonth && day === today.getDate();
          const cellDate = new Date(
            monthDate.getFullYear(),
            monthDate.getMonth(),
            day,
          );
          // daysByDate는 현재 조회된 달(viewedMonth)의 응답만 담고 있으므로,
          // 스와이프 중인 옆 달 패널의 날짜는 자연히 매칭되지 않아 하이라이트가
          // 없는 상태로 보인다 — 그 달로 넘어가 API가 다시 조회되면 채워진다.
          const dayEntry = daysByDate.get(toDateKey(cellDate));
          // hasPhoto는 "사진이 있다"는 뜻이지 "기록이 있다"는 뜻이 아니다 — 이
          // 값은 오늘이 아닌 셀에만 실제로 쓰이므로(아래 className/textColor는
          // isToday를 먼저 분기해 오늘 셀에서는 이 값을 보지 않는다) imageUrl만
          // 본다. 오늘 실제로 업로드된 사진은 todayPhotoUrl로 별도 렌더링된다.
          const hasPhoto = dayEntry?.imageUrl != null;
          // recordCount는 "그 날 남긴 기록 수"이지 사진 수가 아니다 — API에
          // 사진 개수 필드가 없어서 이 값으로 "여러 장 사진" 스택 UI를 채우면
          // 사진이 하나도 없는 날에도 스택이 보이는 등 의미가 달라진다. 정확한
          // 사진 개수를 내려주는 필드가 생기기 전까지는 끄둔다.
          const hasMultiplePhotos = false;
          const isFutureDay =
            cellDate >
            new Date(today.getFullYear(), today.getMonth(), today.getDate());
          // 오늘 이후 날짜에 예정 운동이 있으면 점으로 표시한다(Figma node
          // 2918-4983의 31일 셀). workout-plan 기능은 아직 백엔드에 저장하는
          // API가 없어(운동 계획 추가는 로컬 상태만 갱신) 서버 hasPlan만으로는
          // 방금 이 세션에서 추가한 예정 운동이 반영되지 않는다 — 두 신호를
          // OR로 합쳐서 기존 로컬-상태 기반 표시를 유지한다.
          const hasScheduledWorkout =
            isFutureDay &&
            (dayEntry?.hasPlan === true ||
              getWorkoutsForDate(cellDate).length > 0);

          const textColor =
            isToday && todayPhotoUrl
              ? "#ffffff"
              : isToday
                ? semanticColors["label-normal"]
                : hasPhoto
                  ? semanticColors["label-normal"]
                  : isFutureDay
                    ? semanticColors["label-disabled"]
                    : semanticColors["label-subtle"];

          return (
            <Pressable
              key={dayIndex}
              accessibilityRole="button"
              accessibilityLabel={`${monthDate.getMonth() + 1}월 ${day}일`}
              onPress={() => setSelectedCalendarDate(cellDate)}
              className="h-[60px] w-[43px]"
            >
              {/* 메인 카드보다 먼저 그려야 "뒤에 깔린" 것처럼 보인다 — 형제로
                  두지 않고 메인 카드 안에 넣으면 zIndex를 아무리 낮춰도 부모(=
                  메인 카드) 자신의 배경보다 뒤로는 못 가서 오히려 위에 덮인다. */}
              {hasMultiplePhotos && !isToday && (
                <View className="absolute -top-1 left-2 h-[52px] w-[35px] rounded-lg border-[1.5px] border-background-normal bg-fill-subtle" />
              )}
              <View
                className={
                  isToday
                    ? `h-[60px] w-[43px] items-start overflow-hidden rounded-lg border-2 p-1.5 ${
                        isTodayRecorded
                          ? "border-solid border-label-normal bg-fill-normal"
                          : "border-dashed border-label-normal"
                      }`
                    : hasPhoto
                      ? "h-[60px] w-[43px] items-start rounded-lg bg-fill-normal p-1.5"
                      : "h-[60px] w-[43px] items-start p-1.5"
                }
              >
                {isToday && todayPhotoUrl && (
                  <>
                    <Image
                      source={{
                        uri: getOptimizedImageUrl(todayPhotoUrl, {
                          ...CALENDAR_DAY_THUMBNAIL_SIZE,
                          crop: "fill",
                        }),
                      }}
                      style={{ position: "absolute", inset: 0 }}
                      contentFit="cover"
                    />
                    <View
                      className="absolute inset-0"
                      style={{ backgroundColor: "rgba(0,0,0,0.28)" }}
                    />
                  </>
                )}
                <ThemedText
                  typography={isToday ? "caption-1-bold" : "caption-1-regular"}
                  style={{ color: textColor }}
                >
                  {day}
                </ThemedText>
                {hasScheduledWorkout && (
                  <View className="absolute bottom-1.5 left-5 h-1 w-1 rounded-full bg-label-normal" />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    ));
  }

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
    } catch {
      Alert.alert(
        "오류",
        "오늘의 운동을 등록하지 못했습니다. 다시 시도해주세요.",
      );
    }
  }

  function openNewPlanSheet() {
    setNewPlanDraft(createBlankWorkoutPlanDraft(`saved-plan-${Date.now()}`));
  }

  async function saveNewPlan(plan: WorkoutPlanDraft, addToToday: boolean) {
    // "오늘만 할래요"(addToToday)가 켜져 있으면 1회성 운동이므로 저장된
    // 운동 계획에는 넣지 않고, 캘린더에서 지금 보고 있는 날짜(반드시 실제
    // 오늘은 아니다 — 다른 날짜를 보면서 추가할 수도 있다)에만 추가한다.
    // 꺼져 있으면 재사용할 루틴이므로 POST /api/v1/plan-presets로 등록한다.
    if (addToToday) {
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
  // 처리하는 동시에 같은 이벤트에서 기록 방식 선택 모달을 연다. 이미 완료된
  // 항목을 다시 누르면(완료 취소) 모달 없이 즉시 되돌린다.
  function toggleTodayWorkoutDone(instanceId: string) {
    const workout = todayWorkouts.find((item) => item.id === instanceId);
    if (!workout) return;

    if (workout.isDone) {
      updateWorkoutsForDate(today, (workouts) =>
        workouts.map((item) =>
          item.id === instanceId ? { ...item, isDone: false } : item,
        ),
      );
      return;
    }

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
        workouts.map((workout) =>
          workout.id === planDetailTarget.instanceId
            ? { ...workout, plan: updatedPlan }
            : workout,
        ),
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

  function handleMissionCompletePress() {
    if (missionStatus === "completed") {
      setMissionStatus("accepted");
      return;
    }
    setMissionStatus("completed");
    openRecordMethodModal(MISSION_PLAN_ITEM_ID, missionTitle);
  }

  // 낙관적으로 켰던 체크를 되돌린다 — 백드롭 탭으로 모달을 닫을 때, 그리고
  // 앨범에서 선택하다 취소/거부됐을 때 공통으로 쓴다. 카메라로 넘어가거나
  // "사진 없이 기록하기"를 고르는 경우는 기록이 확정되므로 여기로 오지 않는다.
  function revertPendingRecord() {
    if (!pendingRecordPlanItemId) return;
    if (pendingRecordPlanItemId === MISSION_PLAN_ITEM_ID) {
      setMissionStatus("accepted");
    } else {
      updateWorkoutsForDate(today, (workouts) =>
        workouts.map((workout) =>
          workout.id === pendingRecordPlanItemId
            ? { ...workout, isDone: false }
            : workout,
        ),
      );
    }
    setPendingRecordPlanItemId(null);
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
        refType: "MISSION" as const,
        refId: missionId,
        title: recordModalTitle,
      };
    }
    return {
      refType: "PLAN" as const,
      refId: Number(planItemId),
      title: recordModalTitle,
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

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1">
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="이전 달"
                onPress={goToPreviousMonth}
              >
                <Ionicons name="caret-back" size={10} color={theme.text} />
              </Pressable>
              <ThemedText typography="title-3-bold">{monthLabel}</ThemedText>
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="다음 달"
                onPress={goToNextMonth}
              >
                <Ionicons name="caret-forward" size={10} color={theme.text} />
              </Pressable>
            </View>

            <Pressable
              className="flex-row items-center gap-1 rounded-full bg-fill-subtle px-3 py-1.5"
              accessibilityRole="button"
              accessibilityLabel="연속 스트릭"
              onPress={() => console.log("streak badge pressed")}
            >
              <Ionicons name="flame" size={16} color={theme.text} />
              <ThemedText typography="caption-1-medium">
                {streakDays}일
              </ThemedText>
            </Pressable>
          </View>

          {calendarError ? (
            <ThemedText
              typography="caption-1-medium"
              themeColor="textSecondary"
            >
              캘린더 정보를 불러오지 못했어요
            </ThemedText>
          ) : (
            isCalendarLoading && (
              <ThemedText
                typography="caption-1-medium"
                themeColor="textSecondary"
              >
                캘린더 정보를 불러오는 중이에요
              </ThemedText>
            )
          )}

          <GestureDetector gesture={monthSwipeGesture}>
            <View
              onLayout={(event) =>
                setCalendarWidth(event.nativeEvent.layout.width)
              }
            >
              {calendarWidth > 0 && (
                <View
                  style={{
                    height: calendarViewportHeight,
                    overflow: "hidden",
                  }}
                >
                  <Animated.View
                    style={[
                      {
                        flexDirection: "row",
                        alignItems: "flex-start",
                        width: calendarWidth * 3,
                      },
                      pagerAnimatedStyle,
                    ]}
                  >
                    <View style={{ width: calendarWidth, gap: 6 }}>
                      <WeekdayHeaderRow />
                      {renderMonthGrid(previousMonthWeeks, previousMonthDate)}
                    </View>
                    <View style={{ width: calendarWidth, gap: 6 }}>
                      <WeekdayHeaderRow />
                      {renderMonthGrid(weeks, viewedMonth)}
                    </View>
                    <View style={{ width: calendarWidth, gap: 6 }}>
                      <WeekdayHeaderRow />
                      {renderMonthGrid(nextMonthWeeks, nextMonthDate)}
                    </View>
                  </Animated.View>
                </View>
              )}
            </View>
          </GestureDetector>

          {isSelectedDateToday && (
            <MissionCard
              arrivalLabel={missionArrivalLabel}
              canDismiss={hasCompletedTodayWorkout}
              description={missionDescription}
              onAccept={handleMissionAccept}
              onDismiss={handleMissionDismiss}
              onReveal={handleMissionReveal}
              onToggleComplete={handleMissionCompletePress}
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
              onAddNewPlan={openNewPlanSheet}
              onAddSavedPlan={(plan) =>
                addSavedPlanToDate(plan, selectedCalendarDate)
              }
              onOpenSavedPlan={(planId) =>
                setPlanDetailTarget({ kind: "saved", planId })
              }
              onOpenWorkoutDetail={(instanceId) =>
                setPlanDetailTarget({ kind: "instance", instanceId })
              }
              onToggleExpanded={() =>
                setIsTodayCardExpanded((expanded) => !expanded)
              }
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
            />
          )}
        </ScrollView>
      </SafeAreaView>

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

      {newPlanDraft && isFocused && (
        <WorkoutPlanEditSheet
          onClose={() => setNewPlanDraft(null)}
          onDelete={() => setNewPlanDraft(null)}
          onSave={saveNewPlan}
          saveLabel="루틴 추가하기"
          showDelete={false}
          showAddToTodayToggle
          title="루틴 추가"
          value={newPlanDraft}
          visible
        />
      )}
    </ThemedView>
  );
}
