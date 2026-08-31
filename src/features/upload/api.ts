import { apiClient } from "@/lib/api-client";

import type { ImageUploadType, UploadSignatureResponse } from "./types";

export async function getUploadSignature(type: ImageUploadType) {
  const { data } = await apiClient.post<UploadSignatureResponse>(
    "/api/v1/upload/images/signature",
    { type },
  );
  return data;
}
