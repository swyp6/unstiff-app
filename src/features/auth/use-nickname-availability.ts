import { useEffect, useState } from "react";
import { Alert } from "react-native";

import { checkNicknameAvailability } from "./api";
import { NICKNAME_FORMAT_PATTERN } from "./nickname-validation";

export type NicknameAvailabilityStatus =
  "idle" | "checking" | "available" | "unavailable" | "error";

// Debounced so a fast typist doesn't fire one request per keystroke.
const CHECK_DEBOUNCE_MS = 400;

type UseNicknameAvailabilityOptions = {
  // The caller's own current/saved nickname — matching it bypasses the API
  // call entirely and reports "available", since the server contract for
  // whether a user's own unchanged nickname passes its own duplicate check
  // isn't documented. Used by edit-profile so leaving your nickname
  // untouched never requires (or risks failing) a check against yourself.
  skipValue?: string;
  // Bump this to force a re-check of the same nickname string without it
  // changing — e.g. when a screen the user was sent back to regains focus
  // after a value it already deemed "available" was rejected server-side.
  refreshKey?: number;
};

type CheckResult = {
  nickname: string;
  refreshKey: number | undefined;
  status: "available" | "unavailable" | "error";
};

// Debounced, race-safe nickname duplicate-check. "idle"/"available" (skip
// match) are derived directly from the arguments on every render — no
// state needed for those. Only the actual async result is state, and it's
// only ever written from inside the request's own callback (React's
// recommended effect shape), never synchronously in the effect body — the
// stored (nickname, refreshKey) pair is compared against the current
// arguments at render time, so a stale result (superseded by a newer
// keystroke, or invalidated by a refreshKey bump) is never returned even
// for the one render before the corresponding effect gets a chance to run.
export function useNicknameAvailability(
  nickname: string,
  { skipValue, refreshKey }: UseNicknameAvailabilityOptions = {},
): NicknameAvailabilityStatus {
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);

  const isSkipped = skipValue !== undefined && nickname === skipValue;
  const isFormatValid = NICKNAME_FORMAT_PATTERN.test(nickname);
  const shouldCheck = !isSkipped && isFormatValid;

  useEffect(() => {
    if (!shouldCheck) return;

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      checkNicknameAvailability(nickname)
        .then((available) => {
          if (cancelled) return;
          setCheckResult({
            nickname,
            refreshKey,
            status: available ? "available" : "unavailable",
          });
        })
        .catch(() => {
          if (cancelled) return;
          setCheckResult({ nickname, refreshKey, status: "error" });
          Alert.alert(
            "오류",
            "닉네임 확인 중 문제가 발생했습니다. 다시 시도해주세요.",
          );
        });
    }, CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [nickname, shouldCheck, refreshKey]);

  if (isSkipped) return "available";
  if (!isFormatValid) return "idle";
  if (
    checkResult?.nickname === nickname &&
    checkResult.refreshKey === refreshKey
  ) {
    return checkResult.status;
  }
  return "checking";
}
