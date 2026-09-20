import {
  getInitialNotification,
  getMessaging,
  onNotificationOpenedApp,
  type RemoteMessage,
} from "@react-native-firebase/messaging";
import { router, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import {
  getNotificationLandingRoute,
  type NotificationLandingRoute,
} from "@/features/notifications/notification-landing";

// 이미 랜딩한 메시지 id들. 훅 ref가 아니라 모듈 변수인 이유: iOS/Android
// 네이티브 모두 백그라운드 탭에서 opened 이벤트를 쏘면서 같은 메시지를
// initialNotification에도 남겨두므로, 훅이 다시 mount돼 getInitialNotification을
// 한 번 더 부르면(StrictMode, RootLayout remount) 같은 메시지가 다시 온다.
// 마지막 id 하나만 기억하면 A → B → A처럼 사이에 다른 메시지가 끼었을 때 A를
// 다시 랜딩하므로 최근 것들을 Set으로 들고 있는다. Set은 삽입 순서를 유지하므로
// 상한을 넘으면 가장 오래된 id부터 지운다(FIFO).
const MAX_HANDLED_MESSAGE_IDS = 20;
const handledMessageIds = new Set<string>();

function markMessageHandled(messageId: string) {
  handledMessageIds.add(messageId);
  if (handledMessageIds.size > MAX_HANDLED_MESSAGE_IDS) {
    const oldest = handledMessageIds.values().next().value;
    if (oldest !== undefined) handledMessageIds.delete(oldest);
  }
}

// 메시지 → 이동할 route. 랜딩 대상이 아니거나(알 수 없는 type 등) 이미 처리한
// 메시지면 null. dedupe 표시는 route가 정해지는 이 시점에 하므로, 같은 메시지가
// initial/opened 양쪽으로 들어와도 두 번째는 pending에도 navigate에도 닿지 않는다.
function resolveLandingRoute(
  message: RemoteMessage,
): NotificationLandingRoute | null {
  const route = getNotificationLandingRoute(message.data?.type);
  if (!route) return null;
  if (message.messageId) {
    if (handledMessageIds.has(message.messageId)) return null;
    markMessageHandled(message.messageId);
  }
  return route;
}

// 사용자가 푸시 알림을 "탭"했을 때만 type별 화면으로 보낸다 — 수신(onMessage)
// 에는 반응하지 않는다.
// - background(또는 foreground에 표시된 알림) 탭: onNotificationOpenedApp
// - 종료 상태에서 탭으로 시작(cold start): getInitialNotification
// enabled는 root Stack이 렌더된 뒤에만 true여야 한다.
//
// 두 경로 모두 route를 바로 navigate하지 않고 landing 요청으로 올린 뒤 아래
// effect가 "그 시점의" pathname을 보고 이동한다. cold start에서는 index("/")의
// Redirect("/home")가 useOptionalNavigation 때문에 React task 두 턴 뒤에야
// enqueue되는데, 네이티브 콜백(getInitialNotification 응답·opened 이벤트)은
// RuntimeScheduler에서 그보다 우선순위가 높아 먼저 도착할 수 있다. 그때 바로
// navigate하면 뒤따라온 replace("/home")가 덮어쓴다. 그래서 pathname이 "/"인
// 동안은 보류하고, Redirect가 끝나 "/"를 벗어난 뒤에 이동한다. listener는 한
// 번만 등록하고 pathname은 effect에서 읽으므로 stale closure가 없다.
export function useNotificationLanding(enabled: boolean) {
  const pathname = usePathname();
  // 요청마다 새 객체 — 같은 route로 다시 탭해도 구분되고, 처리 여부는 객체
  // identity로 ref에 기록한다(effect 안에서 state를 비우지 않기 위해).
  const [request, setRequest] = useState<{
    route: NotificationLandingRoute;
  } | null>(null);
  const handledRequestRef = useRef<object | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;

    const messaging = getMessaging();

    function handleNotificationMessage(message: RemoteMessage) {
      const route = resolveLandingRoute(message);
      if (route) setRequest({ route });
    }

    // cancelled guard를 두지 않는다 — 네이티브는 initialNotification을 한 번
    // 돌려주면 비우므로, 첫 호출의 결과를 버리면 cold-start 랜딩이 유실된다.
    // 중복은 handledMessageIds로 막는다.
    getInitialNotification(messaging)
      .then((message) => {
        if (message) handleNotificationMessage(message);
      })
      .catch(() => {
        // 초기 알림 조회 실패는 평소 앱 시작과 같다 — 아무 데도 보내지 않는다.
      });

    return onNotificationOpenedApp(messaging, handleNotificationMessage);
  }, [enabled]);

  useEffect(() => {
    if (!request || request === handledRequestRef.current) return;
    // index가 아직 replace되기 전이면 보류. pathname이 바뀌면 다시 들어온다.
    if (pathname === "/") return;
    handledRequestRef.current = request;
    // navigate: 목적지가 탭 화면이라 이미 그 탭이면 stack을 쌓지 않는다
    // (openHomeAtDate와 같은 방식). 로그인 전이면 (tabs)/_layout의 guard가
    // 평소 앱 진입과 똑같이 /splash로 돌려보내므로 여기서 auth를 보지 않는다.
    router.navigate(request.route);
  }, [request, pathname]);
}
