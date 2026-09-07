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
  generation: number;
  status: "available" | "unavailable" | "error";
};

// Debounced, race-safe nickname duplicate-check.
//
// `generation` identifies one specific (nickname, refreshKey) occurrence —
// bumped synchronously during render (React's documented "adjust state
// when a prop changes" pattern, already used in profile-image-picker-
// sheet.tsx's `wasVisible`) whenever either argument changes, INCLUDING a
// return to a value seen before. Matching a result by generation rather
// than by the nickname string itself is what stops this sequence from
// resolving wrong:
//   foo -> "available" completes
//   bar -> (new generation; foo's old result no longer matches)
//   foo again -> a NEW generation, distinct from foo's first one — its own
//                pending check must complete before this can read
//                "available" again; the earlier completed result for the
//                literal string "foo" is never reused for it.
// "idle"/"available" (skip match) need no state at all — derived directly
// from the arguments every render. The async result is only ever written
// from inside the request's own callback (never synchronously in the
// effect body), and a `cancelled` flag per effect run additionally stops
// a slow, superseded response from landing after a newer one already has.
export function useNicknameAvailability(
  nickname: string,
  { skipValue, refreshKey }: UseNicknameAvailabilityOptions = {},
): NicknameAvailabilityStatus {
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [generation, setGeneration] = useState(0);
  const [prevKey, setPrevKey] = useState({ nickname, refreshKey });

  if (prevKey.nickname !== nickname || prevKey.refreshKey !== refreshKey) {
    setPrevKey({ nickname, refreshKey });
    setGeneration((g) => g + 1);
  }

  const isSkipped = skipValue !== undefined && nickname === skipValue;
  const isFormatValid = NICKNAME_FORMAT_PATTERN.test(nickname);
  const shouldCheck = !isSkipped && isFormatValid;

  useEffect(() => {
    if (!shouldCheck) return;

    const myGeneration = generation;
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      checkNicknameAvailability(nickname)
        .then((available) => {
          if (cancelled) return;
          setCheckResult({
            generation: myGeneration,
            status: available ? "available" : "unavailable",
          });
        })
        .catch(() => {
          if (cancelled) return;
          setCheckResult({ generation: myGeneration, status: "error" });
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
  }, [nickname, shouldCheck, refreshKey, generation]);

  if (isSkipped) return "available";
  if (!isFormatValid) return "idle";
  if (checkResult?.generation === generation) return checkResult.status;
  return "checking";
}
