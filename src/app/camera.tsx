import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { logImageUploadError } from "@/features/upload/cloudinary";
import { useDailyPhotoStore } from "@/features/upload/daily-photo-store";
import { uploadPickedImage } from "@/features/upload/upload-image";

const CAMERA_BG = "#191f28";

type CapturedPhoto = {
  uri: string;
  width: number;
  height: number;
};

function ViewfinderCorner({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br";
}) {
  const isTop = position === "tl" || position === "tr";
  const isLeft = position === "tl" || position === "bl";

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: 32,
        height: 32,
        borderColor: "rgba(255,255,255,0.4)",
        ...(isTop
          ? { top: 24, borderTopWidth: 2 }
          : { bottom: 24, borderBottomWidth: 2 }),
        ...(isLeft
          ? { left: 24, borderLeftWidth: 2 }
          : { right: 24, borderRightWidth: 2 }),
      }}
    />
  );
}

// [체크] 1.10/1.10.2 카메라 · 촬영 결과 (Figma) — 오늘의 미션/계획 완료 시
// 인증 사진을 촬영하는 커스텀 카메라 화면. 촬영 후 확인까지 마치면
// Cloudinary 업로드를 수행하고, 결과는 daily-photo-store를 통해 홈 화면으로
// 전달한다(저장 API가 아직 없어 로컬 상태로만 반영됨).
export default function CameraScreen() {
  const { title, planItemId } = useLocalSearchParams<{
    title?: string;
    planItemId?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // 업로드 도중 사용자가 닫기/뒤로가기로 이 화면을 벗어날 수 있다. 업로드
  // 자체(및 setResult)는 화면을 나가도 계속 끝까지 진행되어야 하지만,
  // 그 시점에 router.back()을 또 호출하면 그 사이 사용자가 이동해 있을
  // 수도 있는 엉뚱한 화면을 팝시켜버리므로 이 화면에 남아있을 때만 부른다.
  const hasLeftRef = useRef(false);
  useEffect(() => {
    return () => {
      hasLeftRef.current = true;
    };
  }, []);

  async function handleCapture() {
    try {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          setError("카메라 접근 권한이 필요합니다.");
        }
        return;
      }

      const result = await cameraRef.current?.takePictureAsync();
      if (result) {
        setError(null);
        setPhoto({
          uri: result.uri,
          width: result.width,
          height: result.height,
        });
      }
    } catch (captureError) {
      logImageUploadError("camera capture failed", captureError);
      setError("사진 촬영에 실패했어요. 다시 시도해 주세요.");
    }
  }

  async function handlePickFromLibrary() {
    try {
      const libraryPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!libraryPermission.granted) {
        setError("사진 보관함 접근 권한이 필요합니다.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      setError(null);
      setPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
    } catch (pickError) {
      logImageUploadError("photo library pick failed", pickError);
      setError("사진을 불러오지 못했어요. 다시 시도해 주세요.");
    }
  }

  async function handleUsePhoto() {
    if (!photo || !planItemId) return;

    setIsUploading(true);
    setError(null);
    try {
      const secureUrl = await uploadPickedImage(
        photo.uri,
        photo.width,
        photo.height,
        "DAILY_PHOTO",
      );
      useDailyPhotoStore.getState().setResult({ planItemId, secureUrl });
      if (!hasLeftRef.current) {
        router.back();
      }
    } catch (uploadError) {
      logImageUploadError("daily photo upload failed", uploadError);
      setError("업로드에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: CAMERA_BG }}>
      <SafeAreaView className="flex-1">
        <View className="h-[54px] flex-row items-center justify-center px-[14px]">
          <Pressable
            className="absolute left-[14px] size-11 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="닫기"
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>
          <ThemedText typography="body-3-bold" style={{ color: "#ffffff" }}>
            {title ?? "오늘의 기록"}
          </ThemedText>
        </View>

        <View className="relative mt-6 flex-1 overflow-hidden bg-[#292e33]">
          {photo ? (
            <Image
              source={{ uri: photo.uri }}
              className="flex-1"
              resizeMode="cover"
            />
          ) : permission?.granted ? (
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />
          ) : (
            <Pressable
              className="flex-1 items-center justify-center gap-4 px-8"
              accessibilityRole="button"
              onPress={requestPermission}
            >
              <ThemedText
                typography="body-2-bold"
                style={{ color: "#ffffff", textAlign: "center" }}
              >
                카메라로 촬영하려면{"\n"}접근 권한이 필요합니다
              </ThemedText>
              <View className="rounded-2xl bg-white px-6 py-3">
                <ThemedText typography="body-3-bold">권한 허용</ThemedText>
              </View>
            </Pressable>
          )}
          <ViewfinderCorner position="tl" />
          <ViewfinderCorner position="tr" />
          <ViewfinderCorner position="bl" />
          <ViewfinderCorner position="br" />
        </View>

        <View className="px-5 pb-6 pt-5">
          {error && (
            <ThemedText
              typography="caption-1-regular"
              style={{
                color: "#ff6b6b",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              {error}
            </ThemedText>
          )}

          {photo ? (
            <View className="flex-row gap-2.5">
              <Pressable
                className="flex-1 items-center justify-center rounded-[14px] bg-white/[0.16] py-4"
                accessibilityRole="button"
                disabled={isUploading}
                onPress={() => setPhoto(null)}
              >
                <ThemedText
                  typography="body-3-bold"
                  style={{ color: "#ffffff" }}
                >
                  다시 찍기
                </ThemedText>
              </Pressable>
              <Pressable
                className="flex-1 items-center justify-center rounded-[14px] bg-white py-4"
                accessibilityRole="button"
                disabled={isUploading}
                onPress={handleUsePhoto}
              >
                <ThemedText typography="body-3-bold">
                  {isUploading ? "업로드 중..." : "이 사진 사용"}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View className="h-[76px] flex-row items-center justify-between">
              <Pressable
                className="size-[59px] items-center justify-center rounded-2xl bg-white/[0.16]"
                accessibilityRole="button"
                accessibilityLabel="갤러리에서 선택"
                onPress={handlePickFromLibrary}
              >
                <Ionicons name="images-outline" size={24} color="#ffffff" />
              </Pressable>

              <Pressable
                className="items-center justify-center rounded-full border-2 border-white/60 p-[7px]"
                accessibilityRole="button"
                accessibilityLabel="촬영"
                onPress={handleCapture}
              >
                <View className="size-[58px] rounded-full bg-white" />
              </Pressable>

              <Pressable
                className="size-12 items-center justify-center rounded-full bg-white/[0.16]"
                accessibilityRole="button"
                accessibilityLabel="카메라 전환"
                onPress={() =>
                  setFacing((current) =>
                    current === "back" ? "front" : "back",
                  )
                }
              >
                <Ionicons
                  name="camera-reverse-outline"
                  size={22}
                  color="#ffffff"
                />
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
