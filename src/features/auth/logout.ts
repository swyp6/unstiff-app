import { router } from "expo-router";

import { useMissionFeedbackStore } from "@/features/missions/mission-feedback-store";
import { useBadgeEarnedStore } from "@/features/mypage/badge-earned-store";
import { useBadgesStore } from "@/features/mypage/badges-store";
import { useMyProfileStore } from "@/features/mypage/profile-store";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";
import { useAuthStore } from "@/store/auth-store";

export function logout() {
  useMyProfileStore.getState().reset();
  // 계정에 묶인 임시 상태 — 이전 계정의 미션 id로 피드백 모달이 뜨거나,
  // 하다 만 기록 draft(photo/target/confirmed, 이전 계정의 refId·사진)가
  // 다음 계정의 기록 흐름에 남지 않도록 비운다. (chat-store/unread count는
  // accessToken이 null이 되는 시점을 각자 구독해 이미 초기화한다.)
  useMissionFeedbackStore.getState().clearFeedback();
  useRecordFlowStore.getState().reset();
  // 이전 계정의 뱃지 목록/낙관적 획득 상태/축하 큐가 다음 계정 로그인
  // 직후 잠깐 보이거나 섞이지 않도록 비운다 — badges-store.reset()은
  // 아직 안 돌아온 load() 응답도 무효화한다.
  useBadgesStore.getState().reset();
  useBadgeEarnedStore.getState().reset();
  useAuthStore.getState().logout();
  router.replace("/splash");
}
