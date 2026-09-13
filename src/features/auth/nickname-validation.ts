export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;

export const NICKNAME_FORMAT_GUIDE_TEXT =
  "영문과 숫자로 2~20자, 특수기호는 . _ 만 쓸 수 있어요";
export const NICKNAME_ALREADY_USED_TEXT = "이미 사용 중인 닉네임이에요";

// 영문(대소문자 구별)/숫자와 특수기호 `.` `_` 만 허용, 공백 및 그 외 문자(한글, `-` 포함)는 불허.
// `g` flag is only safe here for `.replace` (sanitizeNickname) — `.test()` with a
// global regex mutates `lastIndex` across calls, so getNicknameFormatError below
// uses its own non-global copy instead of reusing this one.
const NICKNAME_DISALLOWED_CHARS = /[^A-Za-z0-9._]/g;

// `.`/`_`는 첫 글자·마지막 글자로 올 수 없고, 서로 다른 특수문자 조합을 포함해 연속으로
// 올 수 없다 — 영문/숫자 구간(`[A-Za-z0-9]+`) 사이에 특수문자 하나만 끼워 넣는 구조로 강제.
export const NICKNAME_FORMAT_PATTERN = new RegExp(
  `^(?=.{${NICKNAME_MIN_LENGTH},${NICKNAME_MAX_LENGTH}}$)[A-Za-z0-9]+(?:[._][A-Za-z0-9]+)*$`,
);

export function sanitizeNickname(value: string) {
  return value
    .replace(NICKNAME_DISALLOWED_CHARS, "")
    .slice(0, NICKNAME_MAX_LENGTH);
}

// Figma's "Field / 닉네임" component shows one specific message per failure
// reason (길이 오류/문자 오류/기호 위치 오류) instead of one generic message —
// this decomposes NICKNAME_FORMAT_PATTERN's single regex into the same
// per-reason checks, in priority order, so the UI can show the matching copy.
export function getNicknameFormatError(value: string): string | null {
  if (value.length < NICKNAME_MIN_LENGTH) return "2자 이상 입력해 주세요";
  if (value.length > NICKNAME_MAX_LENGTH) return "20자까지 쓸 수 있어요";
  if (/[^A-Za-z0-9._]/.test(value)) return NICKNAME_FORMAT_GUIDE_TEXT;
  if (/^[._]|[._]$|[._]{2,}/.test(value)) {
    return "기호는 처음과 끝, 연속으로 쓸 수 없어요";
  }
  return null;
}
