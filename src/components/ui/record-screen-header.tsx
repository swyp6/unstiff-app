import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

type RecordScreenHeaderProps = {
  dateLabel: string;
  onClose: () => void;
  // 아이콘은 항상 보인다 — 없으면 눌러도 반응 없는 장식 버튼이 된다(아직
  // 정해진 동작이 없는 화면용 — record-complete 참고).
  onMenuPress?: () => void;
  // light: 흰 배경 위 어두운 아이콘/텍스트(day-record). dark: 사진 등
  // 어두운 배경 위 흰 아이콘/텍스트(record-complete).
  variant?: "light" | "dark";
};

// day-record("운동 기록")와 record-complete("완료 -> 홈으로")가 같은
// X / 날짜(가운데) / 점세개 헤더를 쓴다 — 알림 헤더(notification-header.tsx)
// 와 크기를 맞춘 버전으로, 이 한 곳만 고치면 두 화면 모두 같이 바뀐다.
export function RecordScreenHeader({
  dateLabel,
  onClose,
  onMenuPress,
  variant = "light",
}: RecordScreenHeaderProps) {
  const iconColor =
    variant === "dark" ? "#ffffff" : semanticColors["label-normal"];

  return (
    <View className="h-12 flex-row items-center justify-between px-5">
      <Pressable
        accessibilityLabel="닫기"
        accessibilityRole="button"
        className="h-11 w-11 items-center justify-center"
        onPress={onClose}
      >
        <Ionicons color={iconColor} name="close" size={24} />
      </Pressable>
      <ThemedText
        style={variant === "dark" ? { color: "#ffffff" } : undefined}
        typography="heading-1-bold"
      >
        {dateLabel}
      </ThemedText>
      {(() => {
        const icon = (
          <Ionicons color={iconColor} name="ellipsis-horizontal" size={24} />
        );
        return onMenuPress ? (
          <Pressable
            accessibilityLabel="더보기"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center"
            onPress={onMenuPress}
          >
            {icon}
          </Pressable>
        ) : (
          <View className="h-11 w-11 items-center justify-center">{icon}</View>
        );
      })()}
    </View>
  );
}
