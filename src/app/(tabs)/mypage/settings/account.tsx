import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { goBackOrReplace } from "@/features/settings/navigation";

const ACCOUNT_DIVIDER_COLOR = "#E2E6EC";

type AccountInfoRowProps = {
  label: string;
  value: string;
};

function AccountInfoRow({ label, value }: AccountInfoRowProps) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.rowLabel} typography="body-2-medium">
        {label}
      </ThemedText>
      <View style={styles.rowValueContainer}>
        <ThemedText style={styles.rowValue} typography="body-2-regular">
          {value}
        </ThemedText>
      </View>
      <View style={styles.divider} />
    </View>
  );
}

export default function AccountScreen() {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Pressable
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => goBackOrReplace("/mypage/settings")}
            style={styles.backButton}
          >
            <Ionicons
              color={semanticColors["label-normal"]}
              name="chevron-back"
              size={20}
            />
          </Pressable>
        </View>
        <ThemedText typography="body-1-medium">계정</ThemedText>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.sectionLabel} typography="body-2-medium">
          계정 정보
        </ThemedText>

        <View style={styles.rows}>
          <AccountInfoRow label="로그인 계정" value="user@email.com" />
          <AccountInfoRow label="로그인 방식" value="Apple" />
        </View>

        <View style={styles.infoCard}>
          <ThemedText style={styles.cardTitle} typography="body-2-medium">
            계정 정보 안내
          </ThemedText>
          <ThemedText
            style={styles.cardDescription}
            typography="caption-1-regular"
          >
            {"로그인 계정과 방식은 인증 제공자에서\n확인한 정보예요."}
          </ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: semanticColors["background-normal"],
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 72,
    paddingHorizontal: 24,
  },
  backButton: {
    alignItems: "flex-start",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerSide: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  sectionLabel: {
    color: semanticColors["label-subtle"],
    lineHeight: 20,
  },
  rows: {
    marginTop: 20,
  },
  row: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    flexDirection: "row",
    gap: 12,
    height: 56,
    paddingHorizontal: 16,
    position: "relative",
    width: "100%",
  },
  rowLabel: {
    color: semanticColors["label-normal"],
  },
  rowValueContainer: {
    alignItems: "flex-end",
    flex: 1,
    minWidth: 0,
  },
  rowValue: {
    color: semanticColors["label-subtle"],
  },
  divider: {
    backgroundColor: ACCOUNT_DIVIDER_COLOR,
    bottom: 0,
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
  },
  infoCard: {
    backgroundColor: semanticColors["fill-normal"],
    borderRadius: 12,
    gap: 8,
    height: 90,
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    width: "100%",
  },
  cardTitle: {
    color: semanticColors["secondary-normal"],
    lineHeight: 20,
  },
  cardDescription: {
    color: semanticColors["label-subtle"],
    lineHeight: 18,
  },
});
