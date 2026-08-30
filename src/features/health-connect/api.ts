import { Platform } from "react-native";

const STEP_COUNT_PERMISSION = {
  accessType: "read",
  recordType: "Steps",
} as const;

export type HealthConnectErrorCode =
  | "UNSUPPORTED_PLATFORM"
  | "HEALTH_CONNECT_UNAVAILABLE"
  | "INITIALIZATION_FAILED"
  | "AUTHORIZATION_FAILED"
  | "QUERY_FAILED";

export class HealthConnectError extends Error {
  constructor(
    public readonly code: HealthConnectErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "HealthConnectError";
  }
}

let isInitialized = false;

function assertAndroid() {
  if (Platform.OS !== "android") {
    throw new HealthConnectError(
      "UNSUPPORTED_PLATFORM",
      "Health Connect는 Android에서만 사용할 수 있습니다.",
    );
  }
}

async function ensureHealthConnectInitialized(): Promise<void> {
  assertAndroid();

  if (isInitialized) return;

  try {
    const { getSdkStatus, initialize, SdkAvailabilityStatus } =
      await import("react-native-health-connect");
    const sdkStatus = await getSdkStatus();

    if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) {
      throw new HealthConnectError(
        "HEALTH_CONNECT_UNAVAILABLE",
        "이 기기에서는 Health Connect를 사용할 수 없습니다.",
      );
    }

    if (!(await initialize())) {
      throw new HealthConnectError(
        "INITIALIZATION_FAILED",
        "Health Connect를 초기화하지 못했습니다.",
      );
    }

    isInitialized = true;
  } catch (error) {
    if (error instanceof HealthConnectError) throw error;

    throw new HealthConnectError(
      "INITIALIZATION_FAILED",
      "Health Connect를 초기화하지 못했습니다.",
      { cause: error },
    );
  }
}

function hasStepCountPermission(
  permissions: readonly {
    accessType: string;
    recordType: string;
  }[],
): boolean {
  return permissions.some(
    ({ accessType, recordType }) =>
      accessType === STEP_COUNT_PERMISSION.accessType &&
      recordType === STEP_COUNT_PERMISSION.recordType,
  );
}

export async function requestStepCountAuthorization(): Promise<void> {
  await ensureHealthConnectInitialized();

  try {
    const { getGrantedPermissions, requestPermission } =
      await import("react-native-health-connect");
    const grantedPermissions = await getGrantedPermissions();

    if (hasStepCountPermission(grantedPermissions)) return;

    const requestedPermissions = await requestPermission([
      STEP_COUNT_PERMISSION,
    ]);

    if (!hasStepCountPermission(requestedPermissions)) {
      throw new HealthConnectError(
        "AUTHORIZATION_FAILED",
        "걸음 수 읽기 권한이 필요합니다.",
      );
    }
  } catch (error) {
    if (error instanceof HealthConnectError) throw error;

    throw new HealthConnectError(
      "AUTHORIZATION_FAILED",
      "걸음 수 읽기 권한 요청 중 오류가 발생했습니다.",
      { cause: error },
    );
  }
}

export async function getTodayStepCount(): Promise<number> {
  await ensureHealthConnectInitialized();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  try {
    const { aggregateRecord } = await import("react-native-health-connect");
    const result = await aggregateRecord({
      recordType: "Steps",
      timeRangeFilter: {
        operator: "between",
        startTime: startOfToday.toISOString(),
        endTime: now.toISOString(),
      },
    });
    const stepCount = result.COUNT_TOTAL;

    return typeof stepCount === "number" && Number.isFinite(stepCount)
      ? Math.max(0, stepCount)
      : 0;
  } catch (error) {
    throw new HealthConnectError(
      "QUERY_FAILED",
      "오늘 걸음 수를 불러오지 못했습니다.",
      { cause: error },
    );
  }
}
