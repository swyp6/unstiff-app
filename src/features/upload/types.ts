export type ImageUploadType = "USER_PROFILE" | "DAILY_PHOTO";

export type UploadSignatureResponse = {
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  allowedFormats: string;
};

export type CloudinaryUploadResponse = {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
};
