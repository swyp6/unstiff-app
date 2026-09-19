import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LEGAL_URLS } from "@/constants/legal-urls";
import { semanticColors } from "@/constants/tokens";
import { LegalDocumentCard } from "@/features/legal/components/legal-document-card";
import {
  SETTINGS_CHROME_BACKGROUND,
  SettingsHeader,
} from "@/features/settings/components/settings-header";
import { goBackOrReplace } from "@/features/settings/navigation";

const CONTENT_PADDING_BOTTOM = 16;

// 설정 메인 > 고객 지원. 약관 문서 상세(legal/[type])와 같은 WebView 카드 shell을
// 쓰지만 약관이 아니다 — GET /terms·TermsType·동의 내역과 무관하게 앱 상수
// LEGAL_URLS.support(정적 페이지)를 그대로 열므로 API 상태와 관계없이 열린다.
// 시행일 meta는 약관 전용이라 넣지 않는다(페이지 본문에 운영 주체가 있다).
export default function SupportScreen() {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <SettingsHeader
        onBack={() => goBackOrReplace("/mypage/settings")}
        title="고객 지원"
        variant="settingsNav"
      />

      {/* 카드 안 WebView가 본문을 스크롤하므로 바깥에 ScrollView를 두지 않는다. */}
      <View style={styles.content}>
        <LegalDocumentCard title="고객 지원" uri={LEGAL_URLS.support} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: SETTINGS_CHROME_BACKGROUND,
    flex: 1,
  },
  content: {
    backgroundColor: semanticColors["background-normal"],
    flex: 1,
    paddingBottom: CONTENT_PADDING_BOTTOM,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
