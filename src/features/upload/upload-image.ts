import { getUploadSignature } from "./api";
import { uploadImageToCloudinary } from "./cloudinary";
import { resizeImageForUpload } from "./resize";
import type { ImageUploadType } from "./types";

// 리사이즈 → 서명 발급 → Cloudinary 업로드까지 묶은 핵심 로직.
// 이미지 소스(갤러리/카메라)에 상관없이 uri/width만 있으면 재사용 가능하다.
export async function uploadPickedImage(
  uri: string,
  width: number,
  type: ImageUploadType,
): Promise<string> {
  const resized = await resizeImageForUpload(uri, width);
  const signature = await getUploadSignature(type);
  const uploaded = await uploadImageToCloudinary(
    resized.uri,
    resized.mimeType,
    resized.fileSize,
    signature,
  );
  return uploaded.secure_url;
}
