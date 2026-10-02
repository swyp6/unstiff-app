import { View } from "react-native";

// 카메라 화면(촬영 결과 확인 /camera, 하단 카메라 탭)의 뷰파인더 모서리 장식.
export function ViewfinderCorner({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br";
}) {
  const isTop = position === "tl" || position === "tr";
  const isLeft = position === "tl" || position === "bl";

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: 32,
        height: 32,
        borderColor: "rgba(255,255,255,0.4)",
        ...(isTop
          ? { top: 24, borderTopWidth: 2 }
          : { bottom: 24, borderBottomWidth: 2 }),
        ...(isLeft
          ? { left: 24, borderLeftWidth: 2 }
          : { right: 24, borderRightWidth: 2 }),
      }}
    />
  );
}
