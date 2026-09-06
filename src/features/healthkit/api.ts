import { Platform } from "react-native";

const STEP_COUNT_IDENTIFIER = "HKQuantityTypeIdentifierStepCount" as const;

export type HealthKitErrorCode =
  | "UNSUPPORTED_PLATFORM"
  | "HEALTHKIT_UNAVAILABLE"
  | "AUTHORIZATION_FAILED"
  | "QUERY_FAILED";

export class HealthKitError extends Error {
  constructor(
    public readonly code: HealthKitErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "HealthKitError";
  }
}

function assertIOS() {
  if (Platform.OS !== "ios") {
    throw new HealthKitError(
      "UNSUPPORTED_PLATFORM",
      "HealthKit은 iOS에서만 사용할 수 있습니다.",
    );
  }
}

export async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;

  try {
    const { isHealthDataAvailableAsync } =
      await import("@kingstinct/react-native-healthkit");
    return await isHealthDataAvailableAsync();
  } catch {
    return false;
  }
}

async function assertHealthKitAvailable() {
  assertIOS();

  if (!(await isHealthKitAvailable())) {
    throw new HealthKitError(
      "HEALTHKIT_UNAVAILABLE",
      "이 기기에서는 HealthKit을 사용할 수 없습니다.",
    );
  }
}

// HealthKit deliberately never reveals whether a *read* permission was
// denied (only whether it was ever asked about at all) — Apple hides this
// for privacy. `getRequestStatusForAuthorization` is the closest thing to a
// status check: "shouldRequest" means tapping should prompt, "unnecessary"
// means it's already been decided one way or another and the only way to
// let the user review/change it is the Health app itself, not this app's
// OS settings page.
export type HealthKitStepCountRequestStatus =
  "unavailable" | "shouldRequest" | "unnecessary";

export async function getStepCountAuthorizationRequestStatus(): Promise<HealthKitStepCountRequestStatus> {
  if (!(await isHealthKitAvailable())) return "unavailable";

  const { AuthorizationRequestStatus, getRequestStatusForAuthorization } =
    await import("@kingstinct/react-native-healthkit");
  const status = await getRequestStatusForAuthorization({
    toRead: [STEP_COUNT_IDENTIFIER],
  });

  return status === AuthorizationRequestStatus.shouldRequest
    ? "shouldRequest"
    : "unnecessary";
}

export async function requestStepCountAuthorization(): Promise<void> {
  await assertHealthKitAvailable();

  try {
    const { requestAuthorization } =
      await import("@kingstinct/react-native-healthkit");
    // This reports whether the request completed, not whether read access was granted.
    const didCompleteRequest = await requestAuthorization({
      toRead: [STEP_COUNT_IDENTIFIER],
    });

    if (!didCompleteRequest) {
      throw new HealthKitError(
        "AUTHORIZATION_FAILED",
        "걸음 수 읽기 권한 요청을 완료하지 못했습니다.",
      );
    }
  } catch (error) {
    if (error instanceof HealthKitError) throw error;

    throw new HealthKitError(
      "AUTHORIZATION_FAILED",
      "걸음 수 읽기 권한 요청 중 오류가 발생했습니다.",
      { cause: error },
    );
  }
}

export async function getTodayStepCount(): Promise<number> {
  await assertHealthKitAvailable();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  try {
    const { queryStatisticsForQuantity } =
      await import("@kingstinct/react-native-healthkit");
    const statistics = await queryStatisticsForQuantity(
      STEP_COUNT_IDENTIFIER,
      ["cumulativeSum"],
      {
        unit: "count",
        filter: {
          date: {
            startDate: startOfToday,
            endDate: now,
          },
        },
      },
    );

    return statistics.sumQuantity?.quantity ?? 0;
  } catch (error) {
    throw new HealthKitError(
      "QUERY_FAILED",
      "오늘 걸음 수를 불러오지 못했습니다.",
      { cause: error },
    );
  }
}
