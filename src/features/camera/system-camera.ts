import * as ImagePicker from "expo-image-picker";

import type { RecordPhotoFile } from "@/features/workout-record/submit-record-photo";

// OS 기본 카메라 UI(iOS UIImagePickerController / Android 카메라 앱)로
// 사진 한 장을 찍는다. 촬영 확인(다시 찍기/사진 사용)은 시스템 UI가 하므로
// 앱에서 같은 확인 화면을 다시 띄우지 않는다.
const SYSTEM_CAMERA_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: false,
  quality: 1,
  cameraType: ImagePicker.CameraType.back,
};

export function launchSystemCamera() {
  return ImagePicker.launchCameraAsync(SYSTEM_CAMERA_OPTIONS);
}

// granted: 바로 촬영 가능 / denied: 다시 물어볼 수 있음 / blocked: OS가 더는
// 팝업을 띄우지 않아(iOS는 한 번 거부하면 항상, Android는 "다시 묻지 않음")
// 설정 앱에서 직접 허용해야 함.
export type CameraPermissionOutcome = "granted" | "denied" | "blocked";

function toPermissionOutcome(
  response: ImagePicker.CameraPermissionResponse,
): CameraPermissionOutcome {
  if (response.granted) return "granted";
  return response.canAskAgain ? "denied" : "blocked";
}

// OS 팝업 없이 현재 상태만 읽는다(설정 앱에서 돌아왔을 때 화면 갱신용).
export async function readCameraPermission(): Promise<CameraPermissionOutcome> {
  return toPermissionOutcome(await ImagePicker.getCameraPermissionsAsync());
}

// 현재 상태를 먼저 보고 필요할 때만 OS 팝업을 띄운다.
export async function ensureCameraPermission(): Promise<CameraPermissionOutcome> {
  const current = await readCameraPermission();
  if (current !== "denied") return current;

  return toPermissionOutcome(await ImagePicker.requestCameraPermissionsAsync());
}

export type SystemCameraOutcome =
  | { kind: "captured"; photo: RecordPhotoFile }
  | { kind: "canceled" }
  | { kind: "invalid" };

// 시스템 카메라 결과를 기존 기록 흐름이 쓰는 { uri, width, height } 경계로
// 바꾼다. 결과 모양이 예상과 다르면(assets 없음/비어 있음, uri·크기 없음)
// "invalid"로 돌려 호출부가 오류 안내 후 다시 시도할 수 있게 한다.
export function readSystemCameraResult(
  result: ImagePicker.ImagePickerResult,
): SystemCameraOutcome {
  if (result.canceled) return { kind: "canceled" };

  const asset = result.assets?.[0];
  if (
    !asset ||
    typeof asset.uri !== "string" ||
    asset.uri.length === 0 ||
    !Number.isFinite(asset.width) ||
    !Number.isFinite(asset.height) ||
    asset.width <= 0 ||
    asset.height <= 0
  ) {
    return { kind: "invalid" };
  }

  return {
    kind: "captured",
    photo: { uri: asset.uri, width: asset.width, height: asset.height },
  };
}
