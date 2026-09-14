import { Image } from "expo-image";
// 최상위 "expo-media-library"는 이 SDK에서 새 API로 바뀌었고 이 프로젝트는
// legacy 경로를 쓴다(features/workout-history/save-photo.ts와 동일).
import * as MediaLibrary from "expo-media-library/legacy";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { CheckCircle } from "@/features/auth/components/check-circle";
import { OnboardingCtaButton } from "@/features/auth/components/onboarding-cta-button";
import { OnboardingHeader } from "@/features/auth/components/onboarding-header";
import { OnboardingFooter } from "@/features/auth/components/onboarding-layout";
import { signupColors } from "@/features/auth/signup-ui";

// Figma AC-02-02-f "사진 선택"(4501:44795) — TopNav 아래 스크롤 영역(pt 16,
// "최근 항목" 라벨, gap 12, 3열 그리드), 하단 흰 CTA 영역(pt 16, pb 50 =
// 16 + home indicator 34). 그리드는 좌우 여백 없이 셀 3개 + 3px 간격 2개가
// 화면 폭을 꽉 채운다(375: 123 * 3 + 3 * 2).
const GRID_COLUMNS = 3;
const GRID_GAP = 3;
const PAGE_SIZE = 60;
const FOOTER_BOTTOM_GAP = 16;

function handleBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/profile-photo");
}

type PhotoCellProps = {
  asset: MediaLibrary.Asset;
  size: number;
  selected: boolean;
  onPress: () => void;
};

function PhotoCell({ asset, size, selected, onPress }: PhotoCellProps) {
  return (
    <Pressable
      accessibilityLabel={asset.filename}
      accessibilityRole="imagebutton"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.cell, { height: size, width: size }]}
    >
      <Image
        contentFit="cover"
        recyclingKey={asset.id}
        source={{ uri: asset.uri }}
        style={StyleSheet.absoluteFill}
        transition={0}
      />
      {selected && (
        <>
          {/* Figma의 선택 테두리는 셀 크기를 유지한 채 사진 위에 겹쳐 그려진다
              (4501:44844) — RN border는 안쪽으로 그려지므로 사진 위 overlay로
              둔다. */}
          <View pointerEvents="none" style={styles.selectedBorder} />
          <View pointerEvents="none" style={styles.selectedCheck}>
            <CheckCircle checked size={24} />
          </View>
        </>
      )}
    </Pressable>
  );
}

function RowSeparator() {
  return <View style={styles.rowSeparator} />;
}

export default function ProfilePhotoLibraryScreen() {
  const { width } = useWindowDimensions();
  const cellSize = (width - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const pageRef = useRef<{ endCursor?: string; hasNextPage: boolean }>({
    hasNextPage: true,
  });
  const isFetchingRef = useRef(false);

  const loadPage = useCallback(async () => {
    if (isFetchingRef.current || !pageRef.current.hasNextPage) return;
    isFetchingRef.current = true;
    try {
      const page = await MediaLibrary.getAssetsAsync({
        after: pageRef.current.endCursor,
        first: PAGE_SIZE,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      pageRef.current = {
        endCursor: page.endCursor,
        hasNextPage: page.hasNextPage,
      };
      setAssets((current) => [...current, ...page.assets]);
    } catch (error) {
      console.error("profile photo library load failed", error);
      Alert.alert("오류", "사진을 불러오지 못했습니다.");
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const selectedAsset = assets.find((asset) => asset.id === selectedId);

  async function handleConfirm() {
    if (!selectedAsset || isConfirming) return;
    setIsConfirming(true);
    try {
      // iOS의 asset.uri는 ph:// 스킴이라 expo-image-manipulator가 읽지 못한다
      // — 크롭 화면에는 file:// localUri를 넘긴다.
      const info = await MediaLibrary.getAssetInfoAsync(selectedAsset);
      // 이 화면을 크롭 화면으로 replace한다: 크롭의 "완료"/뒤로가기는 모두
      // router.back()이라 그대로 profile-photo로 돌아간다 — native picker를
      // 쓰던 기존 profile-photo → adjust → profile-photo 흐름과 같다.
      router.replace({
        pathname: "/profile-photo-adjust",
        params: {
          uri: info.localUri ?? info.uri,
          width: String(selectedAsset.width),
          height: String(selectedAsset.height),
        },
      });
    } catch (error) {
      console.error("profile photo asset info failed", error);
      Alert.alert("오류", "사진을 불러오지 못했습니다.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={styles.screen}
    >
      <OnboardingHeader onBack={handleBack} title="사진 선택" />

      <FlatList
        ListEmptyComponent={
          <View style={styles.emptyArea}>
            {isLoading ? (
              <ActivityIndicator color={signupColors.text} />
            ) : (
              <ThemedText style={styles.emptyText} typography="body-2-regular">
                표시할 사진이 없어요
              </ThemedText>
            )}
          </View>
        }
        ListHeaderComponent={
          <View style={styles.albumLabelArea}>
            <ThemedText style={styles.albumLabel} typography="body-2-regular">
              최근 항목
            </ThemedText>
          </View>
        }
        ItemSeparatorComponent={RowSeparator}
        columnWrapperStyle={styles.gridRow}
        data={assets}
        keyExtractor={(asset) => asset.id}
        numColumns={GRID_COLUMNS}
        onEndReached={loadPage}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <PhotoCell
            asset={item}
            onPress={() =>
              setSelectedId((current) => (current === item.id ? null : item.id))
            }
            selected={item.id === selectedId}
            size={cellSize}
          />
        )}
        style={styles.flex}
      />

      <OnboardingFooter bottomGap={FOOTER_BOTTOM_GAP} style={styles.footer}>
        <OnboardingCtaButton
          disabled={!selectedAsset || isConfirming}
          label="선택"
          onPress={handleConfirm}
        />
      </OnboardingFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: signupColors.white,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  albumLabelArea: {
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  albumLabel: {
    color: signupColors.text,
  },
  gridRow: {
    gap: GRID_GAP,
  },
  rowSeparator: {
    height: GRID_GAP,
  },
  cell: {
    backgroundColor: signupColors.fill,
    overflow: "hidden",
  },
  selectedBorder: {
    borderColor: signupColors.primary,
    borderWidth: 2,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  selectedCheck: {
    position: "absolute",
    right: 6,
    top: 6,
  },
  emptyArea: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    color: signupColors.textSubtle,
  },
  footer: {
    paddingTop: 16,
  },
});
