// pathname(그룹 제거된 실제 URL) → GA4 page_id. 전체 카탈로그: Notion "GA4 이벤트 정의"
// 문서 참고. 여기 없는 경로(index 리다이렉트, 읽기 전용 웹뷰 화면, test.tsx 등)는
// 화면 진입 이벤트를 보내지 않는다.
const EXACT_PAGE_IDS: Record<string, string> = {
  "/splash": "splash",
  "/login": "login",
  "/onboarding": "onboarding",
  "/terms-agreement": "terms_agreement",
  "/nickname": "nickname",
  "/profile-photo": "profile_photo",
  "/profile-photo-library": "profile_photo_library",
  "/profile-photo-adjust": "profile_photo_adjust",
  "/signup-complete": "signup_complete",
  "/camera": "camera",
  "/capture": "camera",
  "/record-editor": "record_editor",
  "/capture/record-editor": "record_editor",
  "/capture/manual-record": "capture_manual_record",
  "/capture/target": "capture_target",
  "/record-complete": "record_complete",
  "/day-record": "day_record",
  "/home": "home",
  "/notifications": "notifications",
  "/notification-settings": "mypage_settings_notification",
  "/notification-settings/mission-time": "mypage_settings_mission_time",
  "/chat": "chat",
  "/mypage": "mypage",
  "/mypage/edit-profile": "mypage_edit_profile",
  "/mypage/settings": "mypage_settings",
  "/mypage/settings/notification": "mypage_settings_notification",
  "/mypage/settings/mission-time": "mypage_settings_mission_time",
  "/mypage/settings/permissions": "mypage_settings_permissions",
  "/mypage/settings/withdrawal": "mypage_settings_withdrawal",
  "/mypage/settings/legal": "mypage_settings_legal",
};

export function getPageId(pathname: string): string | null {
  if (pathname in EXACT_PAGE_IDS) return EXACT_PAGE_IDS[pathname];
  if (pathname.startsWith("/workout-plans/")) return "workout_plan_detail";
  return null;
}
