import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Textarea } from "../../../components/ui/input/textarea";

export default function TextareaTestScreen() {
  const [emptyValue, setEmptyValue] = useState("");
  const [filledValue, setFilledValue] = useState("내용을 입력하세요");
  const [focusValue, setFocusValue] = useState("내용을 입력하세요");

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.container}>
          <Text className="mb-[40px] text-[28px] font-bold text-[#191F28]">
            Textarea
          </Text>

          <View className="gap-[40px]">
            {/* Empty */}
            <View className="gap-[12px]">
              <Text className="text-[14px] font-semibold text-[#4E5968]">
                Empty
              </Text>

              <Textarea
                value={emptyValue}
                onChangeText={setEmptyValue}
                placeholder="내용을 입력하세요"
              />
            </View>

            {/* Filled */}
            <View className="gap-[12px]">
              <Text className="text-[14px] font-semibold text-[#4E5968]">
                Filled
              </Text>

              <Textarea value={filledValue} onChangeText={setFilledValue} />
            </View>

            {/* Focus */}
            <View className="gap-[12px]">
              <Text className="text-[14px] font-semibold text-[#4E5968]">
                Focus
              </Text>

              <Textarea value={focusValue} onChangeText={setFocusValue} />
            </View>

            {/* Error */}
            <View className="gap-[12px]">
              <Text className="text-[14px] font-semibold text-[#4E5968]">
                Error
              </Text>

              <Textarea
                value="내용을 입력하세요"
                status="error"
                errorMessage="100자를 넘을 수 없어요"
              />
            </View>

            {/* Max Length */}
            <View className="gap-[12px]">
              <Text className="text-[14px] font-semibold text-[#4E5968]">
                Max Length
              </Text>

              <Text className="text-[12px] leading-[16px] text-[#8B95A1]">
                최대 100자까지만 입력됩니다.
              </Text>

              <Textarea placeholder="100자 제한 테스트" maxLength={100} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 160,
  },

  container: {
    width: "100%",
    maxWidth: 335,
  },
});
