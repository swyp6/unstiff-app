// Figma's "프로필 이미지 선택" sheet offers 7 illustrated hamster stickers
// (햄찌1-7) as preset avatar options, alongside "직접 추가" (pick from library).
//
// Each preset is one of the server's default characters — the same 7 images
// unstiff-api's DefaultProfileImage assigns at signup, in the same order.
// `imageUrl` is that server-side address: PUT /users/me/profile takes it
// as-is in `profileImageUrl` ("기본 캐릭터를 고르면 그 캐릭터의 주소를 그대로
// 보낸다"), and GET /users/me returns it back. `image` is the bundled
// hi-res copy used for rendering so a preset never needs a network fetch.
export type AvatarPreset = {
  id: string;
  image: number;
  imageUrl: string;
};

const DEFAULT_IMAGE_BASE_URL = "https://images.swyp-8team.workers.dev/profile";

function preset(index: number, image: number): AvatarPreset {
  return {
    id: `hamster-${index}`,
    image,
    imageUrl: `${DEFAULT_IMAGE_BASE_URL}/default-${index}.png`,
  };
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  preset(1, require("@/assets/mypage/hamsters/hamster-1.png")),
  preset(2, require("@/assets/mypage/hamsters/hamster-2.png")),
  preset(3, require("@/assets/mypage/hamsters/hamster-3.png")),
  preset(4, require("@/assets/mypage/hamsters/hamster-4.png")),
  preset(5, require("@/assets/mypage/hamsters/hamster-5.png")),
  preset(6, require("@/assets/mypage/hamsters/hamster-6.png")),
  preset(7, require("@/assets/mypage/hamsters/hamster-7.png")),
];

export type AvatarSelection =
  { type: "preset"; presetId: string } | { type: "photo"; uri: string } | null;

export function getAvatarPresetImage(presetId: string) {
  return AVATAR_PRESETS.find((preset) => preset.id === presetId)?.image;
}

export function getAvatarPresetImageUrl(presetId: string) {
  return AVATAR_PRESETS.find((preset) => preset.id === presetId)?.imageUrl;
}

// Maps a server profileImageUrl back to the local avatar representation:
// a known default-character address becomes a "preset" (so the picker
// sheet highlights it and avatarsEqual() matches a re-selection of the
// same sticker), anything else — a Cloudinary upload, or a default address
// this build doesn't know — stays a plain "photo" URL.
export function avatarFromProfileImageUrl(
  profileImageUrl: string,
): AvatarSelection {
  const matched = AVATAR_PRESETS.find(
    (preset) => preset.imageUrl === profileImageUrl,
  );
  return matched
    ? { type: "preset", presetId: matched.id }
    : { type: "photo", uri: profileImageUrl };
}

export function avatarsEqual(a: AvatarSelection, b: AvatarSelection) {
  if (a === b) return true;
  if (a?.type !== b?.type) return false;
  if (a?.type === "preset" && b?.type === "preset") {
    return a.presetId === b.presetId;
  }
  if (a?.type === "photo" && b?.type === "photo") return a.uri === b.uri;
  return false;
}
