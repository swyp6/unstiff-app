import type { ExpoConfig } from "expo/config";

// Set by EAS Build to the profile name (e.g. "production", "preview",
// "development"); undefined for local builds. Only a "production" profile
// should get a production APNs environment — everything else needs
// development, or push notifications silently fail against the wrong APNs
// environment for that provisioning profile.
const apsEnvironment =
  process.env.EAS_BUILD_PROFILE === "production" ? "production" : "development";

const config: ExpoConfig = {
  name: "찌뿌두둥",
  slug: "unstiff",
  owner: "unstiff",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "unstiff",
  userInterfaceStyle: "automatic",

  ios: {
    icon: "./assets/images/icon.png",
    bundleIdentifier: "com.percent8.unstiff",
    googleServicesFile: "./GoogleService-Info.plist",
    entitlements: {
      "aps-environment": apsEnvironment,
    },
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    adaptiveIcon: {
      backgroundColor: "#FF6326",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    package: "com.percent8.unstiff",
    googleServicesFile: "./google-services.json",

    permissions: ["android.permission.POST_NOTIFICATIONS"],

    blockedPermissions: [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
    ],
  },

  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "expo-router",

    ["@react-native-firebase/app", { ios: { disableSPM: true } }],
    "@react-native-firebase/messaging",

    "expo-apple-authentication",

    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme:
          "com.googleusercontent.apps.1028453278024-br2ckjt71jf84v6eg5nsqv86g7eonrhv",
      },
    ],

    [
      "expo-splash-screen",
      {
        backgroundColor: "#FFFFFF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 152,
      },
    ],

    [
      "@react-native-seoul/kakao-login",
      {
        kakaoAppKey: process.env.KAKAO_NATIVE_APP_KEY,
      },
    ],

    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          minSdkVersion: 26,
          extraMavenRepos: [
            "https://devrepo.kakao.com/nexus/content/groups/public/",
          ],
        },
      },
    ],

    "expo-secure-store",

    [
      "expo-media-library",
      {
        photosPermission:
          "사진을 저장하기 위해 사진 보관함 접근 권한이 필요합니다.",
        savePhotosPermission:
          "사진을 앨범에 저장하기 위해 접근 권한이 필요합니다.",
        isAccessMediaLocationEnabled: false,
      },
    ],

    [
      "expo-image-picker",
      {
        photosPermission:
          "이미지를 업로드하기 위해 사진 보관함 접근 권한이 필요합니다.",
        cameraPermission:
          "이미지를 업로드하기 위해 카메라 접근 권한이 필요합니다.",
        microphonePermission: false,
      },
    ],

    [
      "expo-camera",
      {
        cameraPermission:
          "운동 기록 사진을 촬영하기 위해 카메라 접근 권한이 필요합니다.",
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    eas: {
      projectId: "11509332-c0c8-48fd-92f4-8e152f7052a1",
    },
  },
};

export default config;
