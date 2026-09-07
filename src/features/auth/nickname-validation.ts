export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 10;

// 영문(대소문자 구별)/숫자와 특수기호 `.` `_` 만 허용, 공백 및 그 외 문자(한글, `-` 포함)는 불허.
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
