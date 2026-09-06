import { primitiveColors } from "@/constants/tokens";

// No avatar-illustration assets exist yet (Figma's own option icons are
// flat wireframe placeholders, not final art), so presets are just solid
// swatches drawn from the existing palette instead of invented colors.
export type AvatarPreset = {
  id: string;
  color: string;
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "charcoal", color: primitiveColors.charcoal["8"] },
  { id: "orange", color: primitiveColors.orange["400"] },
  { id: "sky", color: primitiveColors.sky["400"] },
  { id: "green", color: primitiveColors.green["400"] },
  { id: "yellow", color: primitiveColors.yellow["500"] },
  { id: "sprout", color: primitiveColors.sprout["400"] },
  { id: "red", color: primitiveColors.red["300"] },
];

export type AvatarSelection =
  { type: "preset"; presetId: string } | { type: "photo"; uri: string } | null;

export function getAvatarPresetColor(presetId: string) {
  return AVATAR_PRESETS.find((preset) => preset.id === presetId)?.color;
}
