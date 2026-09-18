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
  // 설정 > 약관 및 개인정보(/mypage/settings/legal)와 그 문서 상세(legal/[type])
  // 는 Figma(4953:59928, 4953:59947 등)에 탭바가 없어 숨긴다. 마이 탭의 다른
  // 화면(settings 메인·계정·알림 등)은 그대로 탭바를 보여준다.
  // typed routes의 useSegments()는 길이 1짜리 tuple도 포함하는 union이라
  // segments[1] 같은 index 접근은 컴파일되지 않는다 — 경로 문자열로 비교한다.
  const isSettingsLegalScreen = segments
    .join("/")
    .includes("mypage/settings/legal");
  // Figma node 3502:36518 (Nav / 하단 탭): selected tab uses brand/primary
  // orange, unselected uses charcoal/5 — neither maps to theme.ts's
  // textDisabled (label-disabled, a lighter blue-gray), so both are pulled
  // straight from the primitive scale to match the design.
  const selectedColor = primitiveColors.orange["500"];
  const unselectedColor = primitiveColors.charcoal["5"];

  return (
    <NativeTabs
      hidden={isCameraCaptureScreen || isSettingsLegalScreen}
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      // Android 전용: Material3 BottomNavigationView가 선택된 탭 아이콘 뒤에
      // pill 모양 회색(backgroundElement) 인디케이터를 그려서 선택 시 배경이
      // 생긴 것처럼 보인다 — Figma에는 없는 요소라 끈다. iOS는 이 prop이 없다.
      disableIndicator
      // Android 전용: disableIndicator는 인디케이터만 끄고 press ripple은 그대로
      // 남긴다. 인디케이터가 없으면 Material NavigationBarItemView가 ripple의
      // mask(인디케이터 pill)를 잃고 unbounded RippleDrawable을 아이템 배경으로
      // 깔아서, 탭을 누르면 아이템 대각선 크기의 반투명 원이 탭바 밖까지 번진다
      // (expo-router 기본값은 Material3 dynamic primary). Figma에 없는 효과라
      // 투명으로 끈다 — 탭 전환/선택 색상/라벨/접근성과는 무관하다. iOS는 이
      // prop이 없다.
      rippleColor="transparent"
      // Android 전용: 탭 4개(3개 초과)라 기본값(auto)이 Material3
      // BottomNavigationView 규칙대로 선택된 탭 라벨만 보여준다 — Figma는
      // 항상 라벨을 보여주므로 강제한다. iOS는 이 prop이 없다.
      labelVisibilityMode="labeled"
      // shadowColor is iOS-only (react-native-screens has no Android tab bar
      // border prop) — the top divider only renders there.
      shadowColor={colors.border}
      iconColor={{
        default: unselectedColor,
        selected: selectedColor,
      }}
      labelStyle={{
        default: { color: unselectedColor },
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
