import { primitiveColors } from "@/constants/tokens";

export type AvatarOption =
  | { id: "upload"; kind: "upload" }
  | { id: string; kind: "preset"; color: string };

export const DEFAULT_AVATAR_ID = "preset-1";

// Presets stand in for the illustrated avatar set the design hasn't shipped
// yet — distinct token colors so the picker is testable in the meantime.
export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "upload", kind: "upload" },
  { id: "preset-1", kind: "preset", color: primitiveColors.sky["400"] },
  { id: "preset-2", kind: "preset", color: primitiveColors.sprout["400"] },
  { id: "preset-3", kind: "preset", color: primitiveColors.yellow["400"] },
  { id: "preset-4", kind: "preset", color: primitiveColors.red["300"] },
  { id: "preset-5", kind: "preset", color: primitiveColors.charcoal["400"] },
  { id: "preset-6", kind: "preset", color: primitiveColors.sky["700"] },
  { id: "preset-7", kind: "preset", color: primitiveColors.green["400"] },
];

export function getAvatarOption(id: string): AvatarOption {
  return (
    AVATAR_OPTIONS.find((option) => option.id === id) ?? AVATAR_OPTIONS[1]!
  );
}
