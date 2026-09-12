import { File, Paths } from "expo-file-system";
// 최상위 "expo-media-library"의 saveToLibraryAsync는 이 SDK 버전에서
// deprecated 처리되어 호출 시 항상 throw한다 — legacy 경로에서 가져온다.
import * as MediaLibrary from "expo-media-library/legacy";

// 사진(원격 Cloudinary URL)을 기기 사진 앨범에 저장한다. saveToLibraryAsync는
// 로컬 파일 경로만 받으므로, 캐시 디렉터리로 먼저 내려받은 뒤 저장하고 그
// 임시 파일은 지운다.
export async function saveImageToAlbum(imageUrl: string) {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) {
    throw new Error("사진 보관함 접근 권한이 필요합니다.");
  }

  const file = await File.downloadFileAsync(imageUrl, Paths.cache);
  try {
    await MediaLibrary.saveToLibraryAsync(file.uri);
  } finally {
    file.delete();
  }
}
