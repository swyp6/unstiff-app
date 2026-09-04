import { apiClient } from "@/lib/api-client";

export async function registerPushDevice(deviceToken: string) {
  await apiClient.post("/api/v1/push", { deviceToken });
}
