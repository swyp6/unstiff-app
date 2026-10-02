import { crash, getCrashlytics } from "@react-native-firebase/crashlytics";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import {
  primitiveColors,
  radius,
  semanticColors,
  typography,
} from "@/constants/tokens";

// Playground for trying out components against the Figma foundation tokens
// (colors, typography, radius). Add new component examples below as needed —
// this route isn't linked from app navigation, only opened directly.

function SectionTitle({ children }: { children: string }) {
  return (
    <ThemedText type="subtitle" style={{ marginTop: 32, marginBottom: 12 }}>
      {children}
    </ThemedText>
  );
}

function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  return (
    <View style={{ width: 92 }}>
      <View
        style={{
          height: 44,
          borderRadius: 8,
          backgroundColor: hex,
          borderWidth: 1,
          borderColor: "#00000014",
        }}
      />
      <ThemedText type="small" numberOfLines={1}>
        {name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {hex}
      </ThemedText>
    </View>
  );
}

export default function TestScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 64 }}>
        <ThemedText type="title">Test</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          컴포넌트 작성 예시 + Figma 토큰(src/constants/tokens.ts) 확인용 페이지
        </ThemedText>

        <SectionTitle>Typography</SectionTitle>
        <View style={{ gap: 16 }}>
          {Object.entries(typography).map(([name, style]) => (
            <View key={name}>
              <ThemedText style={style}>{name} — 가나다 Abc 123</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {style.fontFamily} · {style.fontSize}/{style.lineHeight}
              </ThemedText>
            </View>
          ))}
        </View>

        <SectionTitle>Semantic Colors</SectionTitle>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {Object.entries(semanticColors).map(([name, hex]) => (
            <ColorSwatch key={name} name={name} hex={hex} />
          ))}
        </View>

        <SectionTitle>Primitive Colors</SectionTitle>
        {Object.entries(primitiveColors).map(([group, scale]) => (
          <View key={group} style={{ marginBottom: 16 }}>
            <ThemedText type="smallBold">{group}</ThemedText>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 8,
              }}
            >
              {Object.entries(scale).map(([step, hex]) => (
                <ColorSwatch key={step} name={step} hex={hex} />
              ))}
            </View>
          </View>
        ))}

        <SectionTitle>Radius</SectionTitle>
        <View style={{ flexDirection: "row", gap: 16 }}>
          {Object.entries(radius).map(([name, value]) => (
            <View key={name} style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: value,
                  backgroundColor: semanticColors["primary-normal"],
                }}
              />
              <ThemedText type="small">
                {name}: {value}px
              </ThemedText>
            </View>
          ))}
        </View>

        <SectionTitle>Crashlytics</SectionTitle>
        {/* __DEV__에선 crash-reporting.ts가 수집을 꺼두므로, 실제 리포트
            확인은 release/프로덕션 빌드에서 눌러야 한다. */}
        <Pressable
          onPress={() => crash(getCrashlytics())}
          style={{
            alignSelf: "flex-start",
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: radius.default,
            backgroundColor: semanticColors["primary-normal"],
          }}
        >
          <ThemedText style={{ color: "#fff" }}>강제 크래시 발생</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
