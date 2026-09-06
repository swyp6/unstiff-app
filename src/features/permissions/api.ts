import {
  AuthorizationStatus,
  getMessaging,
  hasPermission,
  requestPermission as requestMessagingPermission,
} from "@react-native-firebase/messaging";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Linking, PermissionsAndroid, Platform } from "react-native";

// A permission whose OS API reports both a current grant and whether asking
// again would even show a prompt — camera/photos/location (via expo) are
// consistent on this shape already; push notifications aren't (see below),
// so we normalize it to the same shape everyone else uses.
export type OsPermissionStatus = {
  granted: boolean;
  canAskAgain: boolean;
};

export async function getCameraPermissionStatus(): Promise<OsPermissionStatus> {
  const { granted, canAskAgain } = await Camera.getCameraPermissionsAsync();
  return { granted, canAskAgain };
}

export async function requestCameraPermission(): Promise<OsPermissionStatus> {
  const { granted, canAskAgain } = await Camera.requestCameraPermissionsAsync();
  return { granted, canAskAgain };
}

export async function getPhotoLibraryPermissionStatus(): Promise<OsPermissionStatus> {
  const { granted, canAskAgain } =
    await ImagePicker.getMediaLibraryPermissionsAsync();
  return { granted, canAskAgain };
}

export async function requestPhotoLibraryPermission(): Promise<OsPermissionStatus> {
  const { granted, canAskAgain } =
    await ImagePicker.requestMediaLibraryPermissionsAsync();
  return { granted, canAskAgain };
}

export async function getLocationPermissionStatus(): Promise<OsPermissionStatus> {
  const { granted, canAskAgain } =
    await Location.getForegroundPermissionsAsync();
  return { granted, canAskAgain };
}

export async function requestLocationPermission(): Promise<OsPermissionStatus> {
  const { granted, canAskAgain } =
    await Location.requestForegroundPermissionsAsync();
  return { granted, canAskAgain };
}

// Push spans two unrelated native permission systems depending on platform:
// Android 13+'s runtime POST_NOTIFICATIONS (PermissionsAndroid, which is the
// only one of the two that can report "never ask again" up front) and
// iOS/older-Android's firebase messaging authorization (which can only be
// probed by re-requesting — see push-token.ts for the same branch).
export async function getPushPermissionStatus(): Promise<OsPermissionStatus> {
  if (Platform.OS === "android") {
    if (Platform.Version < 33) return { granted: true, canAskAgain: false };
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    // Android has no static "can we still prompt" query — request() is the
    // only place that reveals a permanent "never ask again" denial, so we
    // optimistically allow re-asking here and let requestPushPermission's
    // result correct course.
    return { granted, canAskAgain: !granted };
  }

  const status = await hasPermission(getMessaging());
  const granted =
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL;
  return {
    granted,
    canAskAgain: !granted && status === AuthorizationStatus.NOT_DETERMINED,
  };
}

export async function requestPushPermission(): Promise<OsPermissionStatus> {
  if (Platform.OS === "android") {
    if (Platform.Version < 33) return { granted: true, canAskAgain: false };
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return {
      granted: result === PermissionsAndroid.RESULTS.GRANTED,
      canAskAgain: result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    };
  }

  const status = await requestMessagingPermission(getMessaging());
  const granted =
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL;
  return { granted, canAskAgain: !granted };
}

// Returns the same promise `Linking.openSettings()` gives back (rather than
// swallowing it) so callers can await it and let a failure reach their own
// error handling instead of it becoming an unhandled rejection.
export function openOsSettings() {
  return Linking.openSettings();
}

// Runs the shared tap policy for a single OS permission row: request while
// a prompt is still possible, otherwise fall back to the app's OS settings
// page. Also covers the Android case where `canAskAgain` optimistically
// said yes but the request silently resolves as blocked (no dialog shown)
// — that result routes to settings immediately instead of requiring a
// second tap. Any failure (status check, request, or opening settings)
// propagates to the caller instead of being handled here.
export async function handlePermissionRowPress(kind: {
  getStatus: () => Promise<OsPermissionStatus>;
  request: () => Promise<OsPermissionStatus>;
}) {
  const status = await kind.getStatus();

  if (status.granted || !status.canAskAgain) {
    await openOsSettings();
    return;
  }

  const result = await kind.request();
  if (!result.granted && !result.canAskAgain) {
    await openOsSettings();
  }
}
