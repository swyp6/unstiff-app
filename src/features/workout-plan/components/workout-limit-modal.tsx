import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { addDays } from "@/features/calendar/date";
import { primitiveColors, semanticColors } from "@/constants/tokens";

import { DAILY_PLAN_LIMIT } from "../daily-plan-limit";
import { openHomeAtDate } from "../home-date-request-store";

// Figma "운동 5개 제한 모달"(화면 5367:17098, 모달 5367:17217) — 오늘의 운동이
// 이미 5개일 때 추가 진입(홈 "운동 추가하기"/루틴 추가/카메라 "+ 기록하기")을
// 막으면서 띄운다. 300x195 카드가 화면 정중앙, dim(surface/dim
// rgba(23,23,25,0.45))은 status bar·탭바까지 전체를 덮는다.
//
// ConfirmModal(공통)은 radius 20·가로 버튼 2개, RecordMethodModal은 radius
// 24·padding 24·max-width 340이라 이 디자인(300 고정, 26/20/18 padding, pill
// CTA + 보조 링크)과 맞지 않아 전용 컴포넌트로 둔다. Figma에 backdrop 탭
// 동작이 없으므로 dim을 눌러도 아무 일도 하지 않는다 — RN Modal이 뒤 화면의
// 터치를 자체적으로 막아서 별도 Pressable이 필요 없다.
//
// 버튼 기본 동작은 "홈 탭으로 가서 그 날짜를 보여준다"(openHomeAtDate) —
// 홈이 아닌 화면(카메라 탭)에서 쓸 때 그대로 쓰면 된다. 이미 홈에 있는
// 화면은 탭 전환 없이 자기 상태만 바꾸면 되므로 두 콜백을 덮어쓴다. 어느
// 쪽이든 onClose가 먼저 불려 모달이 닫힌 뒤 동작한다.
type WorkoutLimitModalProps = {
  visible: boolean;
  // Android 하드웨어 뒤로가기 포함 — 모달만 닫고 현재 화면은 그대로 둔다.
  onClose: () => void;
  onPlanTomorrow?: () => void;
  onViewTodayRecords?: () => void;
};

export function WorkoutLimitModal({
  visible,
  onClose,
  onPlanTomorrow,
  onViewTodayRecords,
}: WorkoutLimitModalProps) {
  // visible이 boolean state 하나로 관리되므로 연속 탭으로 여러 번 열어도
  // 인스턴스는 하나다(ConfirmModal과 같은 return null 패턴).
  if (!visible) return null;

  function handlePlanTomorrow() {
    onClose();
    if (onPlanTomorrow) {
      onPlanTomorrow();
      return;
    }
    openHomeAtDate(addDays(new Date(), 1), true);
  }

  function handleViewTodayRecords() {
    onClose();
    if (onViewTodayRecords) {
      onViewTodayRecords();
      return;
    }
    openHomeAtDate(new Date(), false);
  }

  return (
    <Modal
      animationType="fade"
      // Android: 둘 다 켜야 dim이 status bar·navigation bar 뒤까지 이어진다
      // (Figma는 812 전체를 덮는다). 앱 전체 StatusBar 설정은 건드리지 않는다.
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.dim}>
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.copy}>
            <ThemedText style={styles.title} typography="title-3-bold">
              {`운동 ${DAILY_PLAN_LIMIT}개 완료!`}
            </ThemedText>
            <ThemedText
              style={styles.description}
              typography="caption-1-regular"
            >
              {`오늘의 운동은 하루에 ${DAILY_PLAN_LIMIT}개까지만 가능해요`}
            </ThemedText>
          </View>

          {/* RecordMethodModal/DeletePlanModal과 같은 패턴 — Pressable 자체에
              배경/radius를 주면 fade Modal 안에서 버튼 배경이 그려지지 않는
              경우가 있어(실기기·시뮬레이터에서 재현), Pressable은 터치 영역
              크기만 갖고 시각 스타일은 pointerEvents="none" View가 갖는다.
              터치 영역은 여전히 버튼 전체다. */}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={handlePlanTomorrow}
              style={styles.primaryPressable}
            >
              {({ pressed }) => (
                <View
                  pointerEvents="none"
                  style={[styles.primaryButton, pressed && styles.pressed]}
                >
                  <ThemedText
                    style={styles.primaryText}
                    typography="body-2-bold"
                  >
                    내일 운동 미리 계획하기
                  </ThemedText>
                </View>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleViewTodayRecords}
              style={styles.secondaryPressable}
            >
              {({ pressed }) => (
                <View pointerEvents="none" style={pressed && styles.pressed}>
                  <ThemedText
                    style={styles.secondaryText}
                    typography="caption-1-bold"
                  >
                    오늘 기록 보기
                  </ThemedText>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // surface/dim — tokens.ts(auto-generated)에 없는 Figma 변수라 ConfirmModal과
  // 같이 여기서 직접 쓴다.
  dim: {
    alignItems: "center",
    backgroundColor: "rgba(23, 23, 25, 0.45)",
    flex: 1,
    justifyContent: "center",
  },
  card: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    borderRadius: 24,
    gap: 20,
    overflow: "hidden",
    paddingBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 26,
    width: 300,
  },
  copy: {
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  // Figma code context는 "5"만 white로 뽑히지만 실제 렌더는 제목 전체가
  // charcoal/11이다 — 한 색으로 그린다.
  title: {
    color: primitiveColors.charcoal["11"],
    textAlign: "center",
  },
  description: {
    color: primitiveColors.charcoal["5"],
    textAlign: "center",
  },
  actions: {
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  primaryPressable: {
    height: 50,
    width: "100%",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: primitiveColors.orange["500"],
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    overflow: "hidden",
  },
  primaryText: {
    color: semanticColors["label-inverse"],
    textAlign: "center",
  },
  secondaryPressable: {
    alignItems: "center",
    paddingTop: 4,
    width: "100%",
  },
  secondaryText: {
    color: primitiveColors.charcoal["5"],
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
