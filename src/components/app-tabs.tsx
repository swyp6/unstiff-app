import { useSegments } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];
  // 카메라 탭의 촬영 화면(capture/index)만 탭바 없이 몰입형으로 보여준다 —
  // 그 탭의 nested route(capture/target·record-editor·manual-record)로 들어가면
  // 마지막 segment가 바뀌면서 탭바가 다시 나타난다. 화면을 root modal로
  // 옮기지 않고 탭바 표시 여부만 바꾸므로 nested Stack 구조는 그대로다.
  const segments = useSegments();
  const isCameraCaptureScreen = segments[segments.length - 1] === "capture";

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
        selected: colors.textSecondary,
      }}
      labelStyle={{
        default: { color: colors.textDisabled },
        selected: { color: colors.textSecondary },
      }}
    >
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>홈</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="capture">
        <NativeTabs.Trigger.Label>카메라</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "camera", selected: "camera.fill" }}
          md="photo_camera"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Label>채팅</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: "bubble.left.and.bubble.right",
            selected: "bubble.left.and.bubble.right.fill",
          }}
          md="chat_bubble"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mypage">
        <NativeTabs.Trigger.Label>마이</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
