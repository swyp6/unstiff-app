export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 20;

// 영문(대소문자 구별)/숫자와 특수기호 `. - _` 만 허용, 공백 및 그 외 문자(한글 포함)는 불허.
const NICKNAME_DISALLOWED_CHARS = /[^A-Za-z0-9._-]/g;

export const NICKNAME_FORMAT_PATTERN = new RegExp(
  `^[A-Za-z0-9._-]{${NICKNAME_MIN_LENGTH},${NICKNAME_MAX_LENGTH}}$`,
);

export function sanitizeNickname(value: string) {
  return value
    .replace(NICKNAME_DISALLOWED_CHARS, "")
    .slice(0, NICKNAME_MAX_LENGTH);
}
