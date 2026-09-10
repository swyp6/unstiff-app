import { useSegments } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";
import { primitiveColors } from "@/constants/tokens";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];
  // 카메라 탭의 촬영 화면(capture/index)만 탭바 없이 몰입형으로 보여준다 —
  // 그 탭의 nested route(capture/target·record-editor·manual-record)로 들어가면
  // 마지막 segment가 바뀌면서 탭바가 다시 나타난다. 화면을 root modal로
  // 옮기지 않고 탭바 표시 여부만 바꾸므로 nested Stack 구조는 그대로다.
  const segments = useSegments();
  const isCameraCaptureScreen = segments[segments.length - 1] === "capture";
  // Figma node 3502:36518 (Nav / 하단 탭): selected tab uses brand/primary
  // orange instead of the default textSecondary.
  const selectedColor = primitiveColors.orange["500"];

  return (
    <NativeTabs
      hidden={isCameraCaptureScreen}
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      // shadowColor is iOS-only (react-native-screens has no Android tab bar
      // border prop) — the top divider only renders there.
      shadowColor={colors.border}
      iconColor={{
        default: colors.textDisabled,
        selected: selectedColor,
      }}
      labelStyle={{
        default: { color: colors.textDisabled },
        selected: { color: selectedColor },
      }}
    >
      {/* Figma node 3326:9154(Nav / 하단 탭)는 SF Symbols/Material 기본
          아이콘이 아니라 자체 제작 아이콘 세트를 쓴다 — 탭마다 같은 모양을
          iconColor로만 재색칠하므로(선택 시 오렌지) renderingMode는 기본값
          "template"을 그대로 둔다. */}
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>기록</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("@/assets/nav-icons/record.png")}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="capture">
        <NativeTabs.Trigger.Label>카메라</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("@/assets/nav-icons/camera.png")}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Label>채팅</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require("@/assets/nav-icons/chat.png")} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mypage">
        <NativeTabs.Trigger.Label>마이</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("@/assets/nav-icons/mypage.png")}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
