import { Component, type ReactNode } from "react";
import { Pressable } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { recordError } from "@/features/crash-reporting/crash-reporting";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    recordError(error, "React Render Error");
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <ThemedView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
        }}
      >
        <ThemedText type="subtitle">문제가 발생했어요</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          잠시 후 다시 시도해 주세요.
        </ThemedText>
        <Pressable onPress={() => this.setState({ hasError: false })}>
          <ThemedText type="link">다시 시도</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }
}
