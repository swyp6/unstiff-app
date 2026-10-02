import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import {
  router,
  useIsFocused,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { semanticColors } from "@/constants/tokens";
import { trackClick } from "@/features/analytics/analytics";
import { ViewfinderCorner } from "@/features/camera/viewfinder-corner";
import { logImageUploadError } from "@/features/upload/cloudinary";
import {
  type RecordPhotoFile,
  submitRecordPhoto,
} from "@/features/workout-record/submit-record-photo";

// Figma 1917:24863/1917:24879 배경색과 동일한 값 — 하드코딩 대신 토큰을 쓴다.
const CAMERA_BG = semanticColors["label-normal"];

// useLocalSearchParams의 제네릭 타입은 컴파일 타임 단언일 뿐이다 — 실제 URL
// 쿼리값은 타입과 무관하게 임의 문자열이거나(예: /camera?refType=PLAN&refId=abc)
// 같은 키가 반복되면 배열로 온다. 여기서 실제 값을 검증한다.
function firstParamValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

// refType/refId가 있어야 LINKED(PLAN/MISSION에서 진입) 흐름으로 인정한다 —
// refId가 숫자로 파싱되지 않거나(예: "abc") 0/음수/실수면 유효하지 않다고
// 보고, sentinel(0, -1 등)을 지어내 만들지 않는다. 유효하지 않으면 standalone
// 카메라 흐름(target 화면)으로 그대로 흘려보낸다.
function parseLinkedTarget(
  rawRefType: unknown,
  rawRefId: unknown,
): { refType: "PLAN" | "MISSION"; refId: number } | null {
  const refType = firstParamValue(rawRefType);
  const refId = firstParamValue(rawRefId);
  if (refType !== "PLAN" && refType !== "MISSION") return null;
  if (refId == null) return null;

  const parsedRefId = Number(refId);
  if (!Number.isSafeInteger(parsedRefId) || parsedRefId <= 0) return null;

  return { refType, refId: parsedRefId };
}

// [체크] 1.10.2 촬영 결과 (Figma) — 홈의 "기록 방식 선택"에서 "앨범에서
// 선택"으로 고른 사진을 확인하고 업로드하는 화면(root /camera). 사진 촬영은
// 앱 안에서 하지 않고 OS 기본 카메라를 쓰며, 그 경우 시스템 UI가 확인까지
// 하므로 이 화면을 거치지 않는다(home.tsx startRecordPhotoCapture, 하단
// 카메라 탭은 features/camera/system-camera-capture.tsx). 앨범 picker는 고르는
// 즉시 확정되므로 이 화면이 앨범 사진의 유일한 확인 단계다.
// 확인을 마치면 공통 흐름(submitRecordPhoto: 업로드 → record-flow-store →
// 다음 화면)으로 넘긴다 — refType/refId가 있으면(PLAN/MISSION) 바로 실제
// 수행값 입력(record-editor)으로, 없으면 대상 선택 화면으로 이어간다.
export default function CameraScreen() {
  const { title, refType, refId, pickedUri, pickedWidth, pickedHeight } =
    useLocalSearchParams<{
      title?: string;
      // PLAN/MISSION 화면에서 이미 대상이 정해진 채로 들어올 때만 채워짐.
      refType?: "PLAN" | "MISSION";
      refId?: string;
      // 홈 화면에서 이미 앨범 picker로 골라온 사진.
      pickedUri?: string;
      pickedWidth?: string;
      pickedHeight?: string;
    }>();
  const isFocused = useIsFocused();
  const [photo, setPhoto] = useState<RecordPhotoFile | null>(() =>
    pickedUri && pickedWidth && pickedHeight
      ? {
          uri: pickedUri,
          width: Number(pickedWidth),
          height: Number(pickedHeight),
        }
      : null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();
  // fullScreenModal로 뜨는 화면이라 <SafeAreaView>의 네이티브 인셋 측정이
  // 상단(상태바 영역)을 0으로 잡는 경우가 있어 — 명시적으로 훅에서 읽은
  // 값을 padding으로 적용한다.
  const insets = useSafeAreaInsets();

  // 업로드 도중 사용자가 닫기/뒤로가기로 이 화면을 벗어날 수 있다. 업로드
  // 자체는 화면을 나가도 계속 끝까지 진행되어야 하지만, 그 결과로 store를
  // 건드리거나 다음 화면으로 넘기면 그 사이 사용자가 이동해 있을 수도 있는
  // 엉뚱한 상태를 만든다. unmount 시점(화면 전환 애니메이션 이후)엔 이미
  // 늦을 수 있어, 제거가 시작되는 즉시(버튼 탭·제스처·하드웨어 back 공통)
  // 동기적으로 도는 beforeRemove에서 플래그를 세운다.
  const hasLeftRef = useRef(false);
  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      hasLeftRef.current = true;
    });
  }, [navigation]);

  // "다시 선택" — 이 화면이 이미 완전히 떠 있는 상태에서 사용자가 직접
  // 누르는 경우라 present 충돌이 없다(처음 들어올 때 쓰는 picker는 home.tsx의
  // startRecordLibraryPick이 화면 전환 전에 따로 연다). 취소하면 지금 사진을
  // 그대로 둔다.
  async function handlePickFromLibrary() {
    trackClick("camera", "pick_from_library");
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
    trackClick("camera", "use_photo");
    if (!photo || isUploading) return;

    setIsUploading(true);
    setError(null);
    try {
      // 화면을 이미 벗어났으면(뒤로가기 등) 업로드 자체는 끝까지 흘러가게
      // 두되, 그 결과로 전역 record-flow-store를 건드리거나 다음 화면으로
      // 밀어넣지 않는다 — 그 사이 사용자가 새 기록을 시작했다면 뒤늦게 도착한
      // 이전 기록의 사진이 새 기록의 사진을 덮어써 버린다.
      await submitRecordPhoto(photo, {
        linkedTarget: parseLinkedTarget(refType, refId),
        title,
        shouldContinue: () => !hasLeftRef.current,
      });
    } catch (uploadError) {
      logImageUploadError("daily photo upload failed", uploadError);
      setError("업로드에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: CAMERA_BG }}>
      {/* RN StatusBar는 마운트된 <StatusBar> 중 마지막 것이 이기는 스택이라
          포커스 동안만 올린다 — 벗어나면 _layout.tsx의 "dark"로 돌아간다. */}
      {isFocused && <StatusBar style="light" />}
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <View className="h-[54px] flex-row items-center justify-center px-[14px]">
          <Pressable
            className="absolute left-5 size-11 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="닫기"
            onPress={() => {
              trackClick("camera", "close");
              router.back();
            }}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>
          <ThemedText typography="heading-1-bold" style={{ color: "#ffffff" }}>
            {title ?? "오늘의 기록"}
          </ThemedText>
        </View>

        <View className="relative flex-1 overflow-hidden bg-[#292e33]">
          {photo && (
            <Image
              source={{ uri: photo.uri }}
              className="absolute inset-0"
              resizeMode="cover"
            />
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
            <View className="flex-row gap-3.5">
              <Pressable
                className="h-[52px] flex-1 items-center justify-center rounded-full bg-white/[0.16]"
                accessibilityRole="button"
                disabled={isUploading}
                onPress={handlePickFromLibrary}
              >
                <ThemedText
                  typography="body-3-bold"
                  style={{ color: "#ffffff" }}
                >
                  다시 선택
                </ThemedText>
              </Pressable>
              <Pressable
                className="h-[52px] flex-1 items-center justify-center rounded-full bg-white"
                accessibilityRole="button"
                disabled={isUploading}
                onPress={handleUsePhoto}
              >
                <ThemedText
                  typography="body-3-bold"
                  style={{ color: semanticColors["label-normal"] }}
                >
                  {isUploading ? "업로드 중..." : "이 사진 사용"}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            // 사진 없이 열린 경우(딥링크 등) — 확인할 사진이 없으니 앨범에서
            // 고르게 한다.
            <Pressable
              className="h-[52px] items-center justify-center rounded-full bg-white"
              accessibilityRole="button"
              onPress={handlePickFromLibrary}
            >
              <ThemedText
                typography="body-3-bold"
                style={{ color: semanticColors["label-normal"] }}
              >
                앨범에서 선택
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
