import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "unstiff",
  slug: "unstiff",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "unstiff",
  userInterfaceStyle: "automatic",

  ios: {
    icon: "./assets/images/icon.png",
    bundleIdentifier: "com.percent8.unstiff",
  },

  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    package: "com.percent8.unstiff",

    permissions: ["android.permission.health.READ_STEPS"],

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

    "expo-apple-authentication",

    "react-native-health-connect",

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
        backgroundColor: "#208AEF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
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

    "./modules/kakao-map/app.plugin.js",

    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "현재 위치를 지도 중심에 표시하기 위해 위치 권한이 필요합니다.",
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        isIosBackgroundLocationEnabled: false,
      },
    ],
    [
      "@kingstinct/react-native-healthkit",
      {
        NSHealthShareUsageDescription:
          "걸음 수 데이터를 불러오기 위해 건강 데이터 접근 권한이 필요합니다.",
        NSHealthUpdateUsageDescription: false,
        background: false,
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
