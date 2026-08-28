import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";

// No Figma design has been shared for this tab yet — placeholder until one exists.
export default function XpScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} />
    </ThemedView>
  );
}
