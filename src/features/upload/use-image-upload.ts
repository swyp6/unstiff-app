import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";

import { ImageUploadError, logImageUploadError } from "./cloudinary";
import type { ImageUploadType } from "./types";
import { uploadPickedImage } from "./upload-image";

type ImagePickSource = "library" | "camera";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "error"; message: string };

async function pickImage(source: ImagePickSource) {
  const permission =
    source === "library"
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new ImageUploadError(
      "UPLOAD_FAILED",
      source === "library"
        ? "사진 보관함 접근 권한이 필요합니다."
        : "카메라 접근 권한이 필요합니다.",
    );
  }

  const result =
    source === "library"
      ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images" })
      : await ImagePicker.launchCameraAsync({ mediaTypes: "images" });

  if (result.canceled) return null;
  return result.assets[0];
}

// 이미지 선택 → 리사이즈 → 서명 발급 → Cloudinary 업로드를 한 번에 처리하는 훅.
// 서명은 발급 후 1시간만 유효하므로 캐싱하지 않고 매 업로드마다 새로 발급받는다.
export function useImageUpload(type: ImageUploadType) {
  const [state, setState] = useState<UploadState>({ status: "idle" });

  const pickAndUpload = useCallback(
    async (source: ImagePickSource = "library") => {
      try {
        const asset = await pickImage(source);
        if (!asset) return null;

        setState({ status: "uploading" });

        const secureUrl = await uploadPickedImage(
          asset.uri,
          asset.width,
          asset.height,
          type,
        );

        setState({ status: "idle" });
        return secureUrl;
      } catch (error) {
        logImageUploadError("image upload failed", error);
        const message =
          error instanceof ImageUploadError
            ? error.message
            : "이미지 업로드 중 문제가 발생했습니다.";
        setState({ status: "error", message });
        return null;
      }
    },
    [type],
  );

  return {
    isUploading: state.status === "uploading",
    error: state.status === "error" ? state.message : null,
    pickAndUpload,
  };
}
