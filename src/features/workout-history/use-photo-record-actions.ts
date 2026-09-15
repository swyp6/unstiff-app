import { useState } from "react";
import { Alert } from "react-native";

import {
  ImageUploadError,
  logImageUploadError,
} from "@/features/upload/cloudinary";
import { uploadPickedImage } from "@/features/upload/upload-image";
import { pickImage } from "@/features/upload/use-image-upload";
import { useRecordFlowStore } from "@/features/workout-record/record-flow-store";

import { updateWorkoutHistory } from "./api";
import { saveImageToAlbum } from "./save-photo";
import type { WorkoutHistoryResponse } from "./types";

// day-record.tsx("운동 기록")와 record-complete.tsx("완료 -> 홈으로")의
// 점세개 메뉴가 공유하는 사진 저장/변경/삭제 동작 — 둘 다 "지금 보고 있는
// 기록 하나"를 대상으로 같은 PUT /api/v1/workouts/{id}를 쓴다. 삭제 확인
// 모달을 띄우고 닫는 것은 화면마다 다른 로컬 UI 상태라 이 훅이 아니라
// 호출부가 맡는다 — 여기 handleDeletePhoto는 실제 삭제만 한다.
export function usePhotoRecordActions(
  entry: WorkoutHistoryResponse | null,
  onUpdated: (updated: WorkoutHistoryResponse) => void,
) {
  // 저장/변경/삭제가 진행되는 동안 메뉴를 다시 열지 못하게 막는다 — 셋 다
  // 짧게 끝나는 단발성 동작이라 화면 전체를 덮는 로딩 UI까지는 필요 없다.
  const [isPhotoActionPending, setIsPhotoActionPending] = useState(false);

  async function handleSavePhoto() {
    if (!entry?.imageUrl) return;
    setIsPhotoActionPending(true);
    try {
      await saveImageToAlbum(entry.imageUrl);
      Alert.alert("저장 완료", "사진을 앨범에 저장했어요.");
    } catch (error) {
      console.error("Failed to save photo to album", error);
      Alert.alert("오류", "사진을 저장하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setIsPhotoActionPending(false);
    }
  }

  async function handleChangePhoto() {
    if (!entry) return;
    setIsPhotoActionPending(true);
    try {
      const asset = await pickImage("camera");
      if (!asset) return;

      // 낙관적 업데이트: 업로드/저장이 끝나길 기다리지 않고 방금 찍은 로컬
      // 사진으로 바로 바꿔 보여준다. 실패하면 원래 사진으로 되돌린다.
      onUpdated({ ...entry, imageUrl: asset.uri });

      const secureUrl = await uploadPickedImage(
        asset.uri,
        asset.width,
        asset.height,
        "DAILY_PHOTO",
      );
      await updateWorkoutHistory(entry.id, {
        measures: entry.measures,
        intensity: entry.intensity,
        memo: entry.memo,
        imageUrl: secureUrl,
      });
      onUpdated({ ...entry, imageUrl: secureUrl });
      // 홈 화면 캘린더는 이 화면과 별개 인스턴스라 자동으로 다시 안 읽는다
      // — savedRecordAt을 건드려서 home.tsx가 그 신호로 캘린더 달을
      // 재조회하게 한다(기록 저장 때와 같은 경로).
      useRecordFlowStore.getState().markRecordSaved();
    } catch (error) {
      onUpdated(entry);
      logImageUploadError("record photo change failed", error);
      Alert.alert(
        "오류",
        error instanceof ImageUploadError
          ? error.message
          : "사진을 바꾸지 못했습니다. 다시 시도해주세요.",
      );
    } finally {
      setIsPhotoActionPending(false);
    }
  }

  async function handleDeletePhoto() {
    if (!entry) return;
    setIsPhotoActionPending(true);
    try {
      // imageUrl을 보내지 않으면 서버가 사진을 지우고 스티커로 표시한다.
      await updateWorkoutHistory(entry.id, {
        measures: entry.measures,
        intensity: entry.intensity,
        memo: entry.memo,
      });
      onUpdated({ ...entry, imageUrl: undefined });
      useRecordFlowStore.getState().markRecordSaved();
    } catch (error) {
      console.error("Failed to delete photo", error);
      Alert.alert("오류", "사진을 삭제하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setIsPhotoActionPending(false);
    }
  }

  return {
    isPhotoActionPending,
    handleSavePhoto,
    handleChangePhoto,
    handleDeletePhoto,
  };
}
