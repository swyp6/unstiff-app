import axios from "axios";

import type {
  CloudinaryUploadResponse,
  UploadSignatureResponse,
} from "./types";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export type ImageUploadErrorCode =
  "UNSUPPORTED_FORMAT" | "FILE_TOO_LARGE" | "UPLOAD_FAILED";

export class ImageUploadError extends Error {
  constructor(
    public readonly code: ImageUploadErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ImageUploadError";
  }
}

// 서버 에러 응답은 RFC 7807 형식(status/detail/code)을 따른다 — 콘솔에 남겨두면
// 재현이 간헐적인 서명/업로드 실패를 디버깅할 때 detail·code를 바로 확인할 수 있다.
export function logImageUploadError(context: string, error: unknown) {
  if (axios.isAxiosError(error)) {
    console.error(context, {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
  } else {
    console.error(context, error);
  }
}

// Cloudinary는 apiClient(우리 서버)와 다른 호스트라 Authorization 헤더나
// JSON Content-Type이 섞이면 안 되므로 별도 인스턴스로 분리한다.
const cloudinaryClient = axios.create();

function assertUploadable(mimeType: string | null, fileSize: number) {
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new ImageUploadError(
      "UNSUPPORTED_FORMAT",
      `지원하지 않는 이미지 형식입니다: ${mimeType}`,
    );
  }

  if (fileSize > MAX_IMAGE_BYTES) {
    throw new ImageUploadError(
      "FILE_TOO_LARGE",
      "이미지 용량은 10MB를 초과할 수 없습니다.",
    );
  }
}

export async function uploadImageToCloudinary(
  fileUri: string,
  mimeType: string | null,
  fileSize: number,
  signature: UploadSignatureResponse,
): Promise<CloudinaryUploadResponse> {
  assertUploadable(mimeType, fileSize);

  // timestamp, folder, public_id, allowed_formats는 서명 계산에 포함된
  // 값이라 signature 응답에서 받은 값을 그대로, 빠짐없이 실어야 한다.
  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    name: signature.publicId,
    type: mimeType ?? "image/jpeg",
  } as unknown as Blob);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);
  formData.append("public_id", signature.publicId);
  formData.append("allowed_formats", signature.allowedFormats);

  try {
    const { data } = await cloudinaryClient.post<CloudinaryUploadResponse>(
      signature.uploadUrl,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  } catch (error) {
    throw new ImageUploadError(
      "UPLOAD_FAILED",
      "이미지 업로드에 실패했습니다.",
      { cause: error },
    );
  }
}
