// Figma's "프로필 이미지 선택" sheet offers 7 illustrated hamster stickers
// (햄찌1-7) as preset avatar options, alongside "직접 추가" (pick from library).
export type AvatarPreset = {
  id: string;
  image: number;
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "hamster-1", image: require("@/assets/mypage/hamsters/hamster-1.png") },
  { id: "hamster-2", image: require("@/assets/mypage/hamsters/hamster-2.png") },
  { id: "hamster-3", image: require("@/assets/mypage/hamsters/hamster-3.png") },
  { id: "hamster-4", image: require("@/assets/mypage/hamsters/hamster-4.png") },
  { id: "hamster-5", image: require("@/assets/mypage/hamsters/hamster-5.png") },
  { id: "hamster-6", image: require("@/assets/mypage/hamsters/hamster-6.png") },
  { id: "hamster-7", image: require("@/assets/mypage/hamsters/hamster-7.png") },
];

export type AvatarSelection =
  { type: "preset"; presetId: string } | { type: "photo"; uri: string } | null;

export function getAvatarPresetImage(presetId: string) {
  return AVATAR_PRESETS.find((preset) => preset.id === presetId)?.image;
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
