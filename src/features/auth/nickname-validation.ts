export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;

export const NICKNAME_FORMAT_GUIDE_TEXT =
  "영문과 숫자로 2~20자, 특수기호는 . _ 만 쓸 수 있어요";
export const NICKNAME_ALREADY_USED_TEXT = "이미 사용 중인 닉네임이에요";
export const NICKNAME_TOO_SHORT_TEXT = `${NICKNAME_MIN_LENGTH}자 이상 입력해 주세요`;
export const NICKNAME_TOO_LONG_TEXT = `${NICKNAME_MAX_LENGTH}자까지 쓸 수 있어요`;
export const NICKNAME_SYMBOL_POSITION_TEXT =
  "기호는 처음과 끝, 연속으로 쓸 수 없어요";

// `.`/`_`는 첫 글자·마지막 글자로 올 수 없고, 서로 다른 특수문자 조합을 포함해 연속으로
// 올 수 없다 — 영문/숫자 구간(`[A-Za-z0-9]+`) 사이에 특수문자 하나만 끼워 넣는 구조로 강제.
export const NICKNAME_FORMAT_PATTERN = new RegExp(
  `^(?=.{${NICKNAME_MIN_LENGTH},${NICKNAME_MAX_LENGTH}}$)[A-Za-z0-9]+(?:[._][A-Za-z0-9]+)*$`,
);

// 영문(대소문자 구별)/숫자와 특수기호 `.` `_` 만 허용, 공백 및 그 외 문자(한글, `-` 포함)는 불허.
const NICKNAME_DISALLOWED_CHAR_PATTERN = /[^A-Za-z0-9._]/;
// 기호가 처음/끝에 오거나, 같은 기호든 다른 기호든 둘 이상 붙어 있는 경우.
const NICKNAME_SYMBOL_POSITION_PATTERN = /^[._]|[._]$|[._]{2,}/;

export type NicknameValidationStatus =
  | "empty"
  | "too-short"
  | "too-long"
  | "invalid-character"
  | "invalid-symbol-position"
  | "valid";

export type NicknameValidation = {
  status: NicknameValidationStatus;
  // 로컬 규칙을 모두 통과했는지 — 이 값이 true일 때만 중복 확인 API를 부르고,
  // 서버로 보낼 수 있다.
  isValid: boolean;
  // Figma "Field / 닉네임"(4273:17741) variant별 안내 문구. empty/valid는 null.
  message: string | null;
};

// 온보딩(nickname.tsx)과 마이페이지 프로필 수정(edit-profile.tsx)이 공유하는
// 닉네임 로컬 검증. 입력값은 절대 가공하지 않고(sanitize 없음) 사용자가 친 raw
// string을 그대로 판정만 한다 — 잘못된 문자는 화면에 남기고 오류로 안내한다.
//
// 한 값이 여러 규칙에 동시에 걸릴 수 있어 아래 순서로 하나만 고른다. 예: "_" 하나는
// 길이 오류와 기호 위치 오류 둘 다지만 "2자 이상 입력해 주세요"가 먼저다.
//   empty → too-short → too-long → invalid-character → invalid-symbol-position → valid
// NICKNAME_FORMAT_PATTERN(정규식 한 방)과 결과가 항상 같아야 한다 — 아래 검사들은
// 그 정규식을 이유별로 쪼갠 것이다.
export function validateNickname(value: string): NicknameValidation {
  if (value.length === 0) {
    return { status: "empty", isValid: false, message: null };
  }
  if (value.length < NICKNAME_MIN_LENGTH) {
    return {
      status: "too-short",
      isValid: false,
      message: NICKNAME_TOO_SHORT_TEXT,
    };
  }
  if (value.length > NICKNAME_MAX_LENGTH) {
    return {
      status: "too-long",
      isValid: false,
      message: NICKNAME_TOO_LONG_TEXT,
    };
  }
  if (NICKNAME_DISALLOWED_CHAR_PATTERN.test(value)) {
    return {
      status: "invalid-character",
      isValid: false,
      message: NICKNAME_FORMAT_GUIDE_TEXT,
    };
  }
  if (NICKNAME_SYMBOL_POSITION_PATTERN.test(value)) {
    return {
      status: "invalid-symbol-position",
      isValid: false,
      message: NICKNAME_SYMBOL_POSITION_TEXT,
    };
  }
  return { status: "valid", isValid: true, message: null };
}
