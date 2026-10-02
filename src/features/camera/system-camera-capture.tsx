import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useIsFocused, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { trackClick } from "@/features/analytics/analytics";
import {
  type CameraPermissionOutcome,
  ensureCameraPermission,
  launchSystemCamera,
  readCameraPermission,
  readSystemCameraResult,
} from "@/features/camera/system-camera";
import { ViewfinderCorner } from "@/features/camera/viewfinder-corner";
import { openOsSettings } from "@/features/permissions/api";
import { logImageUploadError } from "@/features/upload/cloudinary";
import {
  type RecordPhotoFile,
  submitRecordPhoto,
} from "@/features/workout-record/submit-record-photo";

// 촬영 결과 확인 화면(/camera)과 같은 배경 — 하드코딩 대신 토큰을 쓴다.
const CAPTURE_BG = semanticColors["label-normal"];

// NativeTabs에서 이 탭의 route 이름, 그리고 이 탭 안 nested Stack에서 이
// 화면(capture/index)의 route 이름.
const CAPTURE_TAB_ROUTE_NAME = "capture";
const CAPTURE_INDEX_ROUTE_NAME = "index";

// - launching: 권한 확인·시스템 카메라 표시 중(버튼 없이 카메라 화면 골격만)
// - processing: 찍은 사진 업로드 중
// - manual: target에서 back으로 돌아온 경우 등 — 직접 다시 열기
// - error: 카메라/업로드 실패 — 직접 다시 시도
// - permission: 카메라 권한 없음
type CaptureScreenState =
  | { kind: "launching" }
  | { kind: "processing" }
  | { kind: "manual" }
  | { kind: "error"; message: string }
  | { kind: "permission"; isBlocked: boolean };

type LaunchTrigger = "auto" | "manual";

const LAUNCHING_STATE: CaptureScreenState = { kind: "launching" };
const MANUAL_STATE: CaptureScreenState = { kind: "manual" };

// 권한 안내 화면에서 실제 OS 권한이 바뀌었을 때(설정 앱에서 허용 등)의 다음
// 화면 상태 — 허용됐으면 "카메라 열기"로 돌아갈 뿐 카메라를 자동으로 띄우지
// 않는다. 권한 안내 중이 아니거나 바뀐 게 없으면 그대로 둔다(같은 객체).
function applyPermissionRefresh(
  current: CaptureScreenState,
  permission: CameraPermissionOutcome,
): CaptureScreenState {
  if (current.kind !== "permission") return current;
  if (permission === "granted") return MANUAL_STATE;
  const isBlocked = permission === "blocked";
  return current.isBlocked === isBlocked
    ? current
    : { kind: "permission", isBlocked };
}

// 카메라 탭 닫기/취소의 목적지 — 이 화면은 탭의 root라 router.back()으로 갈
// 곳이 없을 수 있어 홈 탭으로 명시적으로 이동한다.
function leaveToHome() {
  router.navigate("/home");
}

// 하단 카메라 탭 — 중간 화면 없이 OS 기본 카메라를 바로 띄우는 "액션 탭".
// 사진을 받으면 기존 기록 흐름(업로드 → record-flow-store → capture/target)으로
// 넘긴다.
//
// 자동 실행은 "카메라 탭에 새로 들어온 순간"에만 한다:
// - 앱 실행 후 첫 진입, 다른 탭에서 넘어온 경우 → 이 화면이 Stack 맨 위면 실행.
// - 같은 탭 안에서 target → back으로 돌아온 경우는 탭 진입이 아니므로 실행하지
//   않고 직접 다시 여는 화면(manual)을 보여준다.
// - 기록을 마치고 dismissTo("/home")로 이 탭의 Stack이 다른 탭에 있는 동안
//   index까지 걷혔어도, 다음 탭 진입은 탭 진입이라 정상적으로 실행된다.
// 자동 실행한 카메라를 취소하면 이번 카메라 동작을 끝낸 것으로 보고 홈 탭으로
// 나간다 — 탭 root라 뒤로 갈 곳 없는 화면에 남기지 않는다.
export function SystemCameraCapture() {
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  // 첫 렌더부터 카메라 화면 골격만 보여 "카메라 열기" 화면이 깜빡이지 않는다.
  const [screenState, setScreenState] =
    useState<CaptureScreenState>(LAUNCHING_STATE);

  // 권한 확인 → 시스템 카메라 → 업로드/화면 이동까지 한 번에 하나만 —
  // 자동 실행·버튼 연타·포커스 반복·StrictMode 재실행이 겹쳐도 카메라가 두 번
  // 뜨거나 같은 사진이 두 번 처리되지 않는다. 카메라 promise가 끝나기 전에는
  // 풀리지 않는다.
  const isBusyRef = useRef(false);
  // 마지막 탭 진입 이후 다른 탭으로 나간 적이 있는지 — 다음 탭 focus가 "새 탭
  // 진입"인지 판단한다. root 모달이 탭을 잠깐 덮었다 사라지는 경우처럼 탭
  // 자체는 바뀌지 않은 focus와 구분하기 위함이다. 앱 실행 후 첫 진입도 진입이다.
  const hasLeftTabRef = useRef(true);

  function isIndexOnTop() {
    const stackState = navigation.getState();
    return (
      stackState?.routes[stackState.index]?.name === CAPTURE_INDEX_ROUTE_NAME
    );
  }

  async function processPhoto(photo: RecordPhotoFile) {
    setScreenState({ kind: "processing" });
    try {
      // 업로드 도중 다른 탭으로 떠났다면 결과로 화면을 이동시키지 않는다 —
      // 다른 탭에 있는 사용자를 카메라 탭으로 끌고 오지 않기 위함이다.
      const didContinue = await submitRecordPhoto(photo, {
        linkedTarget: null,
        shouldContinue: () => navigation.isFocused(),
      });
      // target으로 넘어갔으면 거기서 back으로 돌아왔을 때 보일 화면(manual),
      // 떠나 있었다면 다음 탭 진입에서 다시 자동 실행될 화면(launching).
      setScreenState(didContinue ? MANUAL_STATE : LAUNCHING_STATE);
    } catch (uploadError) {
      logImageUploadError("daily photo upload failed", uploadError);
      setScreenState({
        kind: "error",
        message: "업로드에 실패했어요. 다시 시도해 주세요.",
      });
    }
  }

  // 화면을 launching으로 바꾸는 건 호출부 몫이다(첫 마운트는 이미 launching,
  // 탭 focus/버튼은 각자 콜백에서) — 여기서는 첫 await 전에 state를 건드리지 않는다.
  async function openCamera(trigger: LaunchTrigger) {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    try {
      const permission = await ensureCameraPermission();
      if (permission !== "granted") {
        // 설정 앱 이동은 사용자가 직접 누른 경우에만 — 탭 진입만으로 앱을
        // 벗어나게 하지 않는다. 권한이 없을 때는 홈으로 보내지 않고 안내한다.
        if (permission === "blocked" && trigger === "manual") {
          await openOsSettings();
        }
        setScreenState({
          kind: "permission",
          isBlocked: permission === "blocked",
        });
        return;
      }

      const outcome = readSystemCameraResult(await launchSystemCamera());
      if (outcome.kind === "canceled") {
        // 탭 진입으로 자동으로 연 카메라를 닫았다면 카메라 동작을 끝낸 것 —
        // 홈 탭으로 나간다. 이 화면에서 직접 다시 연 경우엔 원래 화면으로.
        if (trigger === "auto") {
          leaveToHome();
        } else {
          setScreenState(MANUAL_STATE);
        }
        return;
      }
      if (outcome.kind === "invalid") {
        setScreenState({
          kind: "error",
          message: "사진을 불러오지 못했어요. 다시 시도해 주세요.",
        });
        return;
      }
      await processPhoto(outcome.photo);
    } catch (cameraError) {
      logImageUploadError("system camera launch failed", cameraError);
      setScreenState({
        kind: "error",
        message: "카메라를 열지 못했어요. 다시 시도해 주세요.",
      });
    } finally {
      isBusyRef.current = false;
    }
  }

  // 이번 탭 focus가 자동 실행할 "새 탭 진입"인지 판단하고 진입 표시를 소비한다
  // — 실제로 실행 흐름을 시작하는 바로 그 시점에만 부른다. Stack 맨 위가 이
  // 화면이 아니면(target 등에 머물러 있던 탭으로 돌아온 경우) 실행하지 않는다.
  function consumeTabEntry() {
    if (!hasLeftTabRef.current) return false;
    hasLeftTabRef.current = false;
    return isIndexOnTop() && !isBusyRef.current;
  }

  // 첫 마운트: 화면은 처음부터 launching이라 state를 바꿀 필요가 없다.
  const handleMountedFocused = useEffectEvent(() => {
    if (consumeTabEntry()) openCamera("auto");
  });

  // 이후 탭 진입: 이전 manual/error 화면이 카메라 뜨기 전 보이지 않게 먼저
  // launching으로 바꾼다.
  const handleTabFocus = useEffectEvent(() => {
    if (!consumeTabEntry()) return;
    setScreenState(LAUNCHING_STATE);
    openCamera("auto");
  });

  const handleTabBlur = useEffectEvent(() => {
    const tabsState = navigation.getParent()?.getState();
    const focusedTab = tabsState?.routes[tabsState.index]?.name;
    if (focusedTab === CAPTURE_TAB_ROUTE_NAME) return;
    hasLeftTabRef.current = true;
    // 다음 진입에서 자동 실행될 화면을 미리 준비해 둔다 — 돌아왔을 때 이전
    // manual/error 화면이 한 프레임 보였다가 카메라가 뜨지 않게. 업로드 중이면
    // 진행 표시를 유지한다.
    if (isIndexOnTop() && !isBusyRef.current) setScreenState(LAUNCHING_STATE);
  });

  // 탭 진입/이탈은 이 탭 route(부모 navigator의 화면)의 focus/blur로 본다 —
  // 이 화면 자체의 focus는 같은 탭 안 push/pop(target ↔ index)에도 바뀌어
  // 탭 진입과 구분할 수 없다. 탭이 처음 열리며 이 화면이 마운트되는 순간은
  // 이미 focus 이벤트가 지나갔을 수 있어 마운트 직후 한 번 직접 확인한다 —
  // 첫 프레임(카메라 화면 골격)을 그린 다음 프레임에 확인해 화면이 붙은 뒤
  // 시스템 카메라를 띄운다. cleanup에서 취소하므로 StrictMode의 effect 재실행
  // 에도 한 번만 실행된다.
  useEffect(() => {
    const tabNavigation = navigation.getParent();
    const mountFrame = requestAnimationFrame(() => {
      if (navigation.isFocused()) handleMountedFocused();
    });
    const unsubscribeFocus = tabNavigation?.addListener("focus", () =>
      handleTabFocus(),
    );
    const unsubscribeBlur = tabNavigation?.addListener("blur", () =>
      handleTabBlur(),
    );
    return () => {
      cancelAnimationFrame(mountFrame);
      unsubscribeFocus?.();
      unsubscribeBlur?.();
    };
  }, [navigation]);

  // 설정 앱에서 권한을 바꾸고 돌아오면(앱이 다시 active) 실제 OS 권한을 다시
  // 읽어 권한 안내 화면을 갱신한다. active가 반복돼도 상태가 같으면 그대로고,
  // 언마운트 뒤 도착한 응답은 버린다.
  useEffect(() => {
    let isSubscribed = true;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      readCameraPermission()
        .then((permission) => {
          if (!isSubscribed) return;
          setScreenState((current) =>
            applyPermissionRefresh(current, permission),
          );
        })
        .catch((permissionError) => {
          logImageUploadError(
            "camera permission refresh failed",
            permissionError,
          );
        });
    });
    return () => {
      isSubscribed = false;
      subscription.remove();
    };
  }, []);

  // 시스템 카메라를 띄우는 동안에는 카메라 화면(제목·닫기·뷰파인더·버튼)을
  // 그리지 않고 같은 배경색 한 장만 둔다 — 카메라가 present되기 직전 한두
  // 프레임 동안 기존 화면이 비쳐 깜빡이지 않게. 안전영역까지 같은 색이다.
  if (screenState.kind === "launching") {
    return (
      <View className="flex-1" style={{ backgroundColor: CAPTURE_BG }}>
        {isFocused && <StatusBar style="light" />}
      </View>
    );
  }

  const actionLabel =
    screenState.kind === "permission"
      ? screenState.isBlocked
        ? "설정 열기"
        : "권한 허용"
      : screenState.kind === "error"
        ? "카메라 다시 열기"
        : screenState.kind === "manual"
          ? "카메라 열기"
          : null;

  return (
    <View className="flex-1" style={{ backgroundColor: CAPTURE_BG }}>
      {isFocused && <StatusBar style="light" />}
      {/* 기존 카메라 화면과 같은 인셋 처리 — iOS NativeTabs는 탭바 높이를
          하단 안전영역으로 보고하므로 그만큼 띄워야 버튼이 탭바에 가리지 않는다. */}
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <View className="h-[54px] flex-row items-center justify-center px-[14px]">
          <Pressable
            className="absolute left-5 size-11 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="닫기"
            onPress={() => {
              trackClick("camera", "close");
              leaveToHome();
            }}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>
          <ThemedText typography="heading-1-bold" style={{ color: "#ffffff" }}>
            오늘의 기록
          </ThemedText>
        </View>

        <View className="relative flex-1 items-center justify-center gap-3 overflow-hidden bg-[#292e33] px-8">
          {screenState.kind === "processing" && (
            <>
              <ActivityIndicator color="#ffffff" />
              <ThemedText typography="body-2-bold" style={{ color: "#ffffff" }}>
                업로드 중...
              </ThemedText>
            </>
          )}
          {screenState.kind === "permission" && (
            // alignSelf: stretch — 부모가 items-center라 Text가 콘텐츠
            // 폭으로 측정되면 반올림 오차로 마지막 어절이 세 번째 줄로
            // 밀린 채 잘린다. 가용 폭을 전부 주고 textAlign으로 가운데 맞춘다.
            <ThemedText
              typography="body-2-bold"
              style={{
                color: "#ffffff",
                textAlign: "center",
                alignSelf: "stretch",
              }}
            >
              카메라로 촬영하려면{"\n"}접근 권한이 필요합니다
            </ThemedText>
          )}
          <ViewfinderCorner position="tl" />
          <ViewfinderCorner position="tr" />
          <ViewfinderCorner position="bl" />
          <ViewfinderCorner position="br" />
        </View>

        {/* launching/processing 동안에는 버튼을 두지 않는다 — 정상 진입에서
            사용자가 눌러야 하는 단계가 보이지 않게. 높이는 고정해 상태가
            바뀌어도 위 영역 크기가 흔들리지 않는다. */}
        <View className="h-[104px] justify-center px-5">
          {screenState.kind === "error" && (
            <ThemedText
              typography="caption-1-regular"
              style={{
                color: "#ff6b6b",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              {screenState.message}
            </ThemedText>
          )}
          {actionLabel && (
            <Pressable
              className="h-[52px] items-center justify-center rounded-full bg-white"
              accessibilityRole="button"
              onPress={() => {
                if (isBusyRef.current) return;
                if (screenState.kind === "permission") {
                  trackClick("camera", "permission_request");
                }
                setScreenState(LAUNCHING_STATE);
                openCamera("manual");
              }}
            >
              <ThemedText
                typography="body-3-bold"
                style={{ color: semanticColors["label-normal"] }}
              >
                {actionLabel}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
