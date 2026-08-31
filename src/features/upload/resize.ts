import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const MAX_DIMENSION = 1920;
const COMPRESS_QUALITY = 0.8;

export type ResizedImage = {
  uri: string;
  mimeType: string;
  fileSize: number;
};

// 정확한 바이트 타겟팅(권장 5MB)은 지원되지 않으므로, 장축을 MAX_DIMENSION으로
// 제한하고 quality를 압축해 실질적으로 목표에 맞춘다. 원본이 이미 더 작으면
// 리사이즈로 인한 강제 확대를 피하기 위해 resize 단계를 건너뛴다.
export async function resizeImageForUpload(
  uri: string,
  originalWidth: number,
): Promise<ResizedImage> {
  const context = ImageManipulator.manipulate(uri);
  if (originalWidth > MAX_DIMENSION) {
    context.resize({ width: MAX_DIMENSION });
  }

  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: COMPRESS_QUALITY,
  });

  const file = new File(result.uri);

  return {
    uri: result.uri,
    mimeType: "image/jpeg",
    fileSize: file.size ?? 0,
  };
}
