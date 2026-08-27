import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { TextField } from "../../../components/ui/input/text-field";

export default function TextFieldTestScreen() {
  const [defaultValue, setDefaultValue] = useState("");
  const [focusValue, setFocusValue] = useState("값");
  const [actionValue, setActionValue] = useState("");

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator
        scrollEnabled
        alwaysBounceVertical
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.container}>
          <Text className="mb-[40px] text-[28px] font-bold text-[#191F28]">
            TextField
          </Text>

          <View className="gap-[40px]">
            {/* Default */}
            <View className="gap-[12px]">
              <Text className="text-[14px] font-semibold text-[#4E5968]">
                Default
              </Text>

              <TextField
                label="주제"
                placeholder="값"
                value={defaultValue}
                onChangeText={setDefaultValue}
                helperText="메시지에 마침표를 찍어요."
              />
            </View>

            {/* Filled / Focus */}
            <View className="gap-[12px]">
              <Text className="text-[14px] font-semibold text-[#4E5968]">
                Filled / Focus
              </Text>

              <TextField
                label="주제"
                placeholder="값"
                value={focusValue}
                onChangeText={setFocusValue}
                helperText="메시지에 마침표를 찍어요."
              />
            </View>

            {/* Success */}
            <View className="gap-[12px]">
              <Text className="text-[14px] font-semibold text-[#4E5968]">
                Success
              </Text>

              <TextField
                label="주제"
                value="값"
                helperText="메시지에 마침표를 찍어요."
                status="success"
              />
            </View>

            {/* Error */}
            <View className="gap-[12px]">
              <Text className="text-[14px] font-semibold text-[#4E5968]">
                Error
              </Text>

              <TextField
                label="주제"
                value="값"
                helperText="메시지에 마침표를 찍어요."
                status="error"
              />
            </View>

            {/* Disabled */}
            <View className="gap-[12px]">
              <Text className="text-[14px] font-semibold text-[#4E5968]">
                Disabled
              </Text>

              <TextField
                label="주제"
                placeholder="값"
                helperText="메시지에 마침표를 찍어요."
                disabled
              />
            </View>

            {/* Action */}
            <View className="gap-[12px]">
              <Text className="text-[14px] font-semibold text-[#4E5968]">
                Action
              </Text>

              <TextField
                label="주제"
                placeholder="값"
                value={actionValue}
                onChangeText={setActionValue}
                helperText="메시지에 마침표를 찍어요."
                actionLabel="텍스트"
                onPressAction={() => {
                  console.log("Action");
                }}
              />
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

    // 마지막 Action까지 충분히 스크롤되도록 여유 공간
    paddingBottom: 160,
  },

  container: {
    width: "100%",
    maxWidth: 340,
  },
});
