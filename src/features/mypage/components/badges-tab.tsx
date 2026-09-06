import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { MOCK_BADGES } from "@/features/mypage/mock-data";

function BadgeCard({ name, acquired }: { name: string; acquired: boolean }) {
  return (
    <View
      className="items-center gap-2 rounded-[20px] border border-line-subtle bg-background-normal py-3"
      style={{ width: "31%" }}
    >
      <View
        className={`size-[68px] items-center justify-center rounded-full ${
          acquired ? "bg-fill-strong" : "bg-fill-subtle"
        }`}
      >
        <View
          className={`size-[30px] rounded-lg ${
            acquired ? "bg-primary-normal" : "bg-line-normal"
          }`}
        />
      </View>
      <View className="items-center">
        <ThemedText typography="body-2-bold">{name}</ThemedText>
        <ThemedText themeColor="textSecondary" typography="caption-1-regular">
          {acquired ? "획득" : "미획득"}
        </ThemedText>
      </View>
    </View>
  );
}

export function BadgesTab() {
  return (
    <View className="rounded-[20px] border border-line-subtle bg-background-normal p-4">
      <ThemedText typography="body-2-bold">획득한 뱃지</ThemedText>
      <View className="mt-4 flex-row flex-wrap justify-between gap-y-4">
        {MOCK_BADGES.map((badge) => (
          <BadgeCard
            acquired={badge.acquired}
            key={badge.id}
            name={badge.name}
          />
        ))}
      </View>
    </View>
  );
}
