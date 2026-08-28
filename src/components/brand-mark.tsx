import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";

// Figma has no real logo asset yet — "로고 자리" is a placeholder box, so this
// renders a neutral placeholder mark instead of baking in Figma's own
// "missing image" pattern. Swap this out once branding delivers a real logo.
export function BrandMark({ size = 88 }: { size?: number }) {
  return (
    <View style={{ alignItems: "center", gap: 14 }}>
      <View
        className="bg-fill-normal"
        style={{ width: size, height: size, borderRadius: size * 0.25 }}
      />
      <ThemedText typography="title-2-bold">LOGO</ThemedText>
    </View>
  );
}
