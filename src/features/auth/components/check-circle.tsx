import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { signupColors } from "@/features/auth/signup-ui";

type CheckCircleProps = {
  checked: boolean;
  size?: number;
};

// Figma "Circle / 미완료"(3326:8961) / "Circle / 완료"(3326:8959). 원본
// 컴포넌트는 30px이지만 약관 동의·사진 앨범 화면에서는 24px 인스턴스로 쓰여
// 완료 asset(주황 원 + 흰 체크)을 그대로 24로 축소해 그린다.
export function CheckCircle({ checked, size = 24 }: CheckCircleProps) {
  const dimension = { height: size, width: size };
  if (checked) {
    return (
      <Image
        contentFit="contain"
        source={require("@/assets/signup/circle-checked.svg")}
        style={dimension}
      />
    );
  }
  return (
    <View style={[styles.unchecked, dimension, { borderRadius: size / 2 }]} />
  );
}

const styles = StyleSheet.create({
  unchecked: {
    backgroundColor: signupColors.white,
    borderColor: signupColors.circleBorder,
    borderWidth: 1.5,
  },
});
