import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function UiPlaygroundScreen() {
  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-5 pb-20 pt-16"
    >
      <Text className="mb-10 text-3xl font-bold text-[#191F28]">
        UI Components
      </Text>

      <View className="mb-10">
        <Text className="mb-4 text-xl font-bold text-[#191F28]">Input</Text>
        <Link href="/dev/ui-playground/text-field" asChild>
          <Pressable className="rounded-lg border border-[#E5E8EB] px-4 py-4">
            <Text className="text-base font-medium text-[#333D4B]">
              TextField
            </Text>
          </Pressable>
        </Link>
      </View>

      <View className="mb-10">
        <Text className="text-xl font-bold text-[#191F28]">Display</Text>
      </View>

      <View className="mb-10">
        <Text className="text-xl font-bold text-[#191F28]">Navigation</Text>
      </View>

      <View className="mb-10">
        <Text className="text-xl font-bold text-[#191F28]">Feedback</Text>
      </View>
    </ScrollView>
  );
}
