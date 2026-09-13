import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";

// 점선 테두리의 "항목 추가" 버튼(Figma node 4631:44790) — 라벨만 바꿔서 여러
// 화면의 "OO 추가하기" 액션에 재사용한다.
export function AddItemButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-[60px] w-full flex-row items-center justify-center gap-2 rounded-[18px] border border-dashed border-line-normal bg-background-normal"
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <Ionicons name="add" size={14} color={semanticColors["label-normal"]} />
      <ThemedText
        typography="body-2-bold"
        style={{ color: semanticColors["label-normal"] }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}
