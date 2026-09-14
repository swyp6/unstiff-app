import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import AppTabs from "@/components/app-tabs";
import { getMyProfile, hasUnagreedRequiredTerms } from "@/features/auth/api";
import { useAuthStore } from "@/store/auth-store";
import { useOnboardingStore } from "@/store/onboarding-store";
import { useSignupStore } from "@/store/signup-store";

// 인증된 사용자가 탭에 들어올 수 있는지의 판정. 약관이 먼저, 그다음 닉네임 —
// 둘 다 끝나기 전에는 AppTabs를 그리지 않는다.
type EntryGate = "terms" | "nickname" | "ready";

// 순서대로 판정한다. required 약관이 남아 있으면 프로필은 조회하지 않는다.
//
// nickname은 서버가 프로필 설정(PUT /users/me/profile)이 끝나기 전까지 null로
// 내려주므로(types.ts UserProfile), "약관은 다 동의했는데 nickname이 null"을
// 온보딩(닉네임 단계) 미완료 신호로 쓴다. in-memory signup-store는 앱/JS
// reload에 날아가기 때문에 그 상태로는 신규/기존을 구분할 수 없고, 서버
// nickname이 유일한 근거다. 빈 문자열은 계약상 미설정 상태가 아니라 정확히
// null만 본다.
async function resolveEntryGate(): Promise<EntryGate> {
  if (await hasUnagreedRequiredTerms()) return "terms";
  const profile = await getMyProfile();
  return profile.nickname === null ? "nickname" : "ready";
}

// reload 뒤 signup-store는 initialState(isNewUser=false,
// hasAgreedToRequiredTerms=false)라 nickname.tsx의 mount guard가 /login으로
// 돌려보낸다. 여기서 판정한 조건(인증됨 + required 약관 전부 동의 + 서버
// nickname null)에서만 닉네임 단계부터 재개하는 데 필요한 두 값을 되살린다.
// reset()은 부르지 않고, nickname/confirmedPhotoUri/hasCompletedProfileStep은
// 건드리지 않는다 — 그 단계들은 사용자가 다시 밟는다. 이 값은 서버의 신규
// 여부가 아니라 이 세션의 화면 순서용 in-memory state일 뿐이다.
function restoreSignupSequenceForNickname() {
  const signup = useSignupStore.getState();
  signup.setIsNewUser(true);
  signup.setHasAgreedToRequiredTerms(true);
}

export default function TabsLayout() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydratedAuth = useAuthStore((state) => state.hasHydrated);
  const hasHydratedOnboarding = useOnboardingStore(
    (state) => state.hasHydrated,
  );
  const [gate, setGate] = useState<EntryGate | null>(null);

  // Re-checked on every entry (not just right after login) so a user who
  // closed the app before agreeing to required terms — or before setting a
  // nickname — and so still holds a valid accessToken gets routed back to
  // that step instead of straight into the tabs.
  //
  // accessToken이 바뀌면(로그인, 서버의 토큰 재발급) 다시 판정하되 gate를
  // null로 되돌리지는 않는다 — 이미 탭 안에 있는 사용자가 재발급 한 번에
  // 탭 전체가 unmount/remount되면 안 된다. 진행 중이던 요청의 응답은
  // cancelled로 버린다.
  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    resolveEntryGate()
      .then((result) => {
        if (cancelled) return;
        if (result === "nickname") restoreSignupSequenceForNickname();
        setGate(result);
      })
      .catch(() => {
        // 약관/프로필 조회 실패는 기존 정책대로 탭 진입을 막지 않는다 —
        // 여기서 막으면 재시도 UI 없이 빈 화면에 갇힌다. 다음 진입 때 다시
        // 판정한다.
        if (!cancelled) setGate("ready");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (!hasHydratedAuth || !hasHydratedOnboarding) return null;
  if (!accessToken) return <Redirect href="/splash" />;
  if (gate === null) return null;
  if (gate === "terms") return <Redirect href="/terms-agreement" />;
  if (gate === "nickname") return <Redirect href="/nickname" />;

  return <AppTabs />;
}
