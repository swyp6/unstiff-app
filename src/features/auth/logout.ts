import { router } from "expo-router";

import { setAnalyticsUserId } from "@/features/analytics/analytics";
import { useMissionFeedbackStore } from "@/features/missions/mission-feedback-store";
import { useMyProfileStore } from "@/features/mypage/profile-store";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";
import { useAuthStore } from "@/store/auth-store";

export function logout() {
  // 로그아웃/탈퇴 클릭 이벤트는 호출부에서 먼저 보내 이전 user id에 연결되고,
  // 이후 이벤트는 다음 로그인 전까지 어떤 계정에도 연결되지 않게 비운다.
  void setAnalyticsUserId(null).catch(() => {});
  useMyProfileStore.getState().reset();
  // 계정에 묶인 임시 상태 — 이전 계정의 미션 id로 피드백 모달이 뜨거나,
  // 하다 만 기록 draft(photo/target/confirmed, 이전 계정의 refId·사진)가
  // 다음 계정의 기록 흐름에 남지 않도록 비운다. (chat-store/unread count는
  // accessToken이 null이 되는 시점을 각자 구독해 이미 초기화한다.)
  useMissionFeedbackStore.getState().clearFeedback();
  useRecordFlowStore.getState().reset();
  useAuthStore.getState().logout();
  router.replace("/splash");
}
