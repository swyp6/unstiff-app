import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { semanticColors } from "@/constants/tokens";

type LegalArticleData = {
  title: string;
  body: string;
};

type LegalDocumentScreenProps = {
  title: string;
  version: string;
  articles: readonly LegalArticleData[];
};

function LegalArticle({ title, body }: LegalArticleData) {
  return (
    <View style={styles.article}>
      <ThemedText style={styles.articleTitle} typography="body-3-medium">
        {title}
      </ThemedText>
      <ThemedText style={styles.articleBody} typography="caption-1-regular">
        {body}
      </ThemedText>
    </View>
  );
}

export function LegalDocumentScreen({
  title,
  version,
  articles,
}: LegalDocumentScreenProps) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Pressable
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              color={semanticColors["label-normal"]}
              name="chevron-back"
              size={20}
            />
          </Pressable>
        </View>
        <ThemedText typography="body-1-medium">{title}</ThemedText>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.version} typography="caption-1-regular">
          {version}
        </ThemedText>

        <View style={styles.document}>
          <ScrollView
            contentContainerStyle={styles.documentContent}
            contentInsetAdjustmentBehavior="never"
          >
            {articles.map((article) => (
              <LegalArticle key={article.title} {...article} />
            ))}
          </ScrollView>
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
  version: {
    color: semanticColors["label-disabled"],
  },
  document: {
    backgroundColor: semanticColors["fill-subtle"],
    borderColor: semanticColors["line-normal"],
    borderRadius: 12,
    borderWidth: 1,
    height: 526,
    marginTop: 28,
    overflow: "hidden",
    width: "100%",
  },
  documentContent: {
    gap: Spacing.four,
    padding: Spacing.three,
  },
  article: {
    gap: Spacing.two,
  },
  articleTitle: {
    color: semanticColors["label-subtle"],
  },
  articleBody: {
    color: semanticColors["label-disabled"],
  },
});
