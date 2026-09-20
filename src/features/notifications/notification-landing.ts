// 푸시 알림을 탭했을 때 어느 화면으로 갈지의 결정. 서버(PushMessage.java)는
// FCM data payload에 항상 `type` 키로 PushNotificationType.name()을 싣는다 —
// 랜딩은 그 값만 보고, 그 밖의 data 필드(planId 등)는 아직 계약이 없어 읽지
// 않는다. 실제 이동은 use-notification-landing.ts가 한다.
export type NotificationLandingRoute = "/home" | "/chat";

// data.type은 런타임 입력이라 unknown으로 받는다. 알 수 없는 값·누락·
// REMIND_PLAN(제거 예정)·TEST는 null — 이동 없이 지금 화면을 유지한다.
export function getNotificationLandingRoute(
  type: unknown,
): NotificationLandingRoute | null {
  switch (type) {
    // TODO: DAILY_PLAN은 추후 해당 계획을 선택/스크롤하는 동작까지 붙인다.
    // 지금은 홈 탭 진입까지만.
    case "DAILY_PLAN":
    case "DAILY_MISSION":
      return "/home";
    case "DAILY_DISCOVERY":
      return "/chat";
    default:
      return null;
  }
}
