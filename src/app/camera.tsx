import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions } from "expo-camera";
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
import { logImageUploadError } from "@/features/upload/cloudinary";
import { uploadPickedImage } from "@/features/upload/upload-image";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";

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

// [체크] 1.10/1.10.2 카메라 · 촬영 결과 (Figma) — 오늘의 미션/계획 완료 시,
// 또는 하단 카메라 탭에서 곧장 인증 사진을 촬영하는 커스텀 카메라 화면.
// 촬영 후 확인까지 마치면 Cloudinary 업로드를 수행하고, 결과는
// record-flow-store를 거쳐 다음 화면으로 넘어간다:
// - refType/refId가 이미 있으면(PLAN/MISSION에서 진입) 대상 선택을 건너뛰고
//   바로 실제 수행값 입력(record-editor)으로 이어간다.
// - 없으면(하단 카메라 탭에서 진입) 대상 선택 화면(record-target)에서
//   오늘의 미션/오늘의 운동/루틴 중 무엇에 연결할지 고르게 한다.
export default function CameraScreen() {
  const { title, refType, refId, pickedUri, pickedWidth, pickedHeight } =
    useLocalSearchParams<{
      title?: string;
      // PLAN/MISSION 화면에서 이미 대상이 정해진 채로 들어올 때만 채워짐
      // — 하단 카메라 탭(standalone)에서는 둘 다 비어 있다.
      refType?: "PLAN" | "MISSION";
      refId?: string;
      // "기록 방식 선택" 모달에서 "앨범에서 선택"으로 들어온 경우, 홈
      // 화면에서 이미 앨범 picker로 골라온 사진 — 이 화면은 바로 확인
      // 미리보기로 시작한다(라이브 카메라를 띄우지 않는다).
      pickedUri?: string;
      pickedWidth?: string;
      pickedHeight?: string;
    }>();
  // expo-camera 문서: "Only one Camera preview can be active at any given
  // time. If you have multiple screens in your app, you should unmount
  // Camera components whenever a screen is unfocused." 이 화면(/camera)은
  // Stack push/pop으로 마운트/언마운트되지만, 뒤로 나가는 전환 애니메이션이
  // 끝나기 전에 다시 진입하면 이전 인스턴스가 아직 언마운트되는 중일 수
  // 있다 — isFocused로 CameraView를 직접 게이팅해 그 순간에도 두 세션이
  // 겹치지 않게 한다.
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [photo, setPhoto] = useState<CapturedPhoto | null>(() =>
    pickedUri && pickedWidth && pickedHeight
      ? {
          uri: pickedUri,
          width: Number(pickedWidth),
          height: Number(pickedHeight),
        }
      : null,
  );
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const navigation = useNavigation();
  // fullScreenModal로 뜨는 화면이라 <SafeAreaView>의 네이티브 인셋 측정이
  // 상단(상태바 영역)을 0으로 잡는 경우가 있어 — 명시적으로 훅에서 읽은
  // 값을 padding으로 적용한다.
  const insets = useSafeAreaInsets();

  // 업로드 도중 사용자가 닫기/뒤로가기로 이 화면을 벗어날 수 있다. 업로드
  // 자체(및 setResult)는 화면을 나가도 계속 끝까지 진행되어야 하지만,
  // 그 시점에 router.back()을 또 호출하면 그 사이 사용자가 이동해 있을
  // 수도 있는 엉뚱한 화면을 팝시켜버리므로 이 화면에 남아있을 때만 부른다.
  // unmount 시점(화면 전환 애니메이션 이후)엔 이미 늦을 수 있어, 제거가
  // 시작되는 즉시(버튼 탭·제스처·하드웨어 back 공통) 동기적으로 도는
  // beforeRemove에서 플래그를 세운다.
  const hasLeftRef = useRef(false);
  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      hasLeftRef.current = true;
    });
  }, [navigation]);

  // 포커스를 잃는 즉시(cleanup) ready 상태를 내려서, 화면이 아직 완전히
  // unmount되지 않은 전환 애니메이션 도중에도 셔터가 눌리지 않게 막는다.
  // 다시 포커스를 받으면 CameraView가 새로 mount되며 onCameraReady가 다시
  // 불릴 때까지는 계속 false로 남는다.
  useEffect(() => {
    if (!isFocused) return;
    return () => setIsCameraReady(false);
  }, [isFocused]);

  async function handleCapture() {
    try {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          setError("카메라 접근 권한이 필요합니다.");
        }
        return;
      }

      // expo-camera는 onCameraReady 콜백 전에 takePictureAsync를 호출하지
      // 말라고 명시한다 — 셔터 버튼이 비활성화돼 있어도 혹시 모를 호출을
      // 한 번 더 막는다. isCapturing은 촬영 중 연타로 takePictureAsync가
      // 중복 실행되는 것을 막는다.
      if (!isCameraReady || isCapturing) return;

      setIsCapturing(true);
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
    } finally {
      setIsCapturing(false);
    }
  }

  // 라이브 카메라 화면 하단의 갤러리 아이콘 전용 — 이 화면이 이미 완전히
  // 떠 있는 상태에서 사용자가 직접 누르는 경우라 present 충돌이 없다("앨범
  // 에서 선택"으로 처음 들어올 때 쓰는 picker는 home.tsx의
  // startRecordLibraryPick이 화면 전환 전에 따로 연다).
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
    if (!photo || isUploading) return;

    setIsUploading(true);
    setError(null);
    try {
      const secureUrl = await uploadPickedImage(
        photo.uri,
        photo.width,
        photo.height,
        "DAILY_PHOTO",
      );

      // 화면을 이미 벗어났으면(뒤로가기 등) 업로드 자체는 끝까지 흘러가게
      // 두되, 그 결과로 전역 record-flow-store를 건드리지 않는다 — 그 사이
      // 사용자가 새 기록을 시작했다면 store에는 이미 새 photo/target이 들어가
      // 있고, 여기서 setPhoto를 부르면 뒤늦게 도착한 이전 기록의 사진이 그
      // 새 기록의 사진을 덮어써 버린다. 다음 화면으로 밀어넣지 않는 것도
      // 마찬가지 이유(예상 밖의 화면 전환)로 그대로 유지한다.
      if (hasLeftRef.current) return;

      useRecordFlowStore.getState().setPhoto({ secureUrl });

      const linkedTarget = parseLinkedTarget(refType, refId);
      if (linkedTarget) {
        useRecordFlowStore.getState().setTarget({
          mode: "LINKED",
          refType: linkedTarget.refType,
          refId: linkedTarget.refId,
          title: title ?? "",
        });
        router.push("/record-editor");
      } else {
        // 하단 카메라 탭(capture/index)에서 진입한 경우만 여기로 온다
        // — 대상 선택 화면은 그 탭의 nested route(capture/target)라
        // Native TabBar가 계속 보인다(camera 탭 자체가 root fullScreenModal
        // 이 아니라 탭 콘텐츠라서 이 분기는 항상 그 안에서만 실행된다).
        router.push("/capture/target");
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
      <StatusBar style="light" />
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <View className="h-[54px] flex-row items-center justify-center px-[14px]">
          <Pressable
            className="absolute left-[18px] size-12 items-center justify-center"
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
          {permission?.granted && isFocused ? (
            // photo 유무와 무관하게 계속 mount된 상태로 둔다 — "다시
            // 찍기"마다 이 CameraView를 unmount/remount하면(예전엔 photo가
            // 있을 때 이 자리에 <Image>를 대신 렌더해 매번 없앴다가 다시
            // 만들었다) 네이티브 세션이 새로 뜨는 도중에 촬영하는 셈이 돼
            // takePictureAsync가 응답하지 않는 문제가 실기기/시뮬레이터
            // 모두에서 재현됐다. 촬영된 사진은 이 위에 <Image>로 덮어
            // 보여주고, 세션 자체는 화면 포커스를 잃을 때만 내린다.
            <CameraView
              // facing이 바뀔 때만 강제로 재마운트해 새 카메라 세션이 열릴
              // 때까지(onCameraReady가 다시 불릴 때까지) 촬영이 막히도록
              // 한다 — photo는 이제 이 key에 관여하지 않는다.
              key={facing}
              ref={cameraRef}
              style={{ flex: 1 }}
              facing={facing}
              onCameraReady={() => setIsCameraReady(true)}
              onMountError={(mountError) => {
                setIsCameraReady(false);
                setError(mountError.message || "카메라를 열지 못했어요.");
              }}
            />
          ) : permission?.granted ? (
            // 포커스를 잃은 동안(전환 애니메이션 등)에는 CameraView 자체를
            // 렌더하지 않는다 — expo-camera 문서 권고: 동시에 활성화된
            // 프리뷰는 하나만 유지해야 한다.
            <View style={{ flex: 1 }} />
          ) : !photo ? (
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
          ) : null}
          {photo && (
            // CameraView 위를 완전히 덮는 오버레이로 찍은 사진을 보여준다 —
            // 아래 CameraView는 이 동안에도 계속 살아 있다(위 주석 참고).
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
                className="h-[52px] flex-1 items-center justify-center rounded-[14px] bg-white/[0.16]"
                accessibilityRole="button"
                disabled={isUploading}
                // CameraView는 photo가 있는 동안에도 계속 mount돼 있으므로
                // (위 뷰파인더 참고) isCameraReady를 여기서 다시 false로
                // 내릴 필요가 없다 — 이미 준비된 같은 세션을 그대로 쓴다.
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
                className="h-[52px] flex-1 items-center justify-center rounded-[14px] bg-white"
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
                className="items-center justify-center rounded-full border-2 border-white/60 p-[5px]"
                accessibilityRole="button"
                accessibilityLabel="촬영"
                disabled={!isCameraReady || isCapturing}
                onPress={handleCapture}
              >
                <View
                  className="size-[58px] rounded-full bg-white"
                  style={{ opacity: isCameraReady ? 1 : 0.4 }}
                />
              </Pressable>

              <Pressable
                className="size-12 items-center justify-center rounded-full bg-white/[0.16]"
                accessibilityRole="button"
                accessibilityLabel="카메라 전환"
                onPress={() => {
                  setIsCameraReady(false);
                  setFacing((current) =>
                    current === "back" ? "front" : "back",
                  );
                }}
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
      </View>
    </View>
  );
}
