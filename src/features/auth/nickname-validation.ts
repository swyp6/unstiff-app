export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 10;

// Input-stage filter only — keeps whitespace/punctuation/emoji out of state
// as the user types, but must still tolerate compatibility jamo (ㄱ-ㅎ,
// ㅏ-ㅣ) so an in-progress Hangul composition (a lone "ㅅ" before it becomes
// "사") isn't stripped mid-keystroke. This is deliberately looser than
// NICKNAME_FORMAT_PATTERN below — passing this filter does NOT mean the
// nickname is valid, only that it's safe to hold in state.
const NICKNAME_INPUT_DISALLOWED_CHARS = /[^A-Za-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/g;

// Final validity check. Deliberately stricter than the input filter above:
// lone/compatibility jamo that never resolved into a complete syllable
// (e.g. "ㄱㄱ", "ㅏㅏ", "ㄱ1") must NOT pass here, even though the input
// filter has to let it sit in state mid-composition.
export const NICKNAME_FORMAT_PATTERN = new RegExp(
  `^[A-Za-z0-9가-힣]{${NICKNAME_MIN_LENGTH},${NICKNAME_MAX_LENGTH}}$`,
);

export function sanitizeNickname(value: string) {
  return value
    .replace(NICKNAME_INPUT_DISALLOWED_CHARS, "")
    .slice(0, NICKNAME_MAX_LENGTH);
}
