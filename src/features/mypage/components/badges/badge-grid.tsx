import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { radius, semanticColors } from "@/constants/tokens";
import type { Badge } from "@/features/mypage/mock-data";

type BadgeGridProps = {
  badges: Badge[];
};

function BadgeCard({ badge }: { badge: Badge }) {
  const acquired = badge.status === "acquired";

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.iconBg,
          {
            backgroundColor: acquired
              ? semanticColors["fill-strong"]
              : semanticColors["fill-subtle"],
          },
        ]}
      >
        <Ionicons
          color={
            acquired
              ? semanticColors["primary-normal"]
              : semanticColors["label-disabled"]
          }
          name="ribbon"
          size={30}
        />
      </View>
      <ThemedText style={styles.name} typography="body-2-bold">
        {badge.name}
      </ThemedText>
      <ThemedText
        style={acquired ? undefined : styles.lockedStatus}
        themeColor="textSecondary"
        typography="caption-1-regular"
      >
        {acquired ? "획득" : "미획득"}
      </ThemedText>
    </View>
  );
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  return (
    <View style={styles.section}>
      <ThemedText typography="body-2-bold">획득한 뱃지</ThemedText>
      <View style={styles.grid}>
        {badges.map((badge) => (
          <BadgeCard badge={badge} key={badge.id} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-subtle"],
    borderRadius: radius.default * 2,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    alignItems: "center",
    backgroundColor: semanticColors["background-normal"],
    borderColor: semanticColors["line-subtle"],
    borderRadius: radius.default * 2,
    borderWidth: 1,
    flexBasis: "31%",
    flexGrow: 1,
    paddingVertical: 12,
  },
  iconBg: {
    alignItems: "center",
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  name: {
    color: semanticColors["label-normal"],
    marginTop: 12,
  },
  lockedStatus: {
    color: semanticColors["label-disabled"],
  },
});
