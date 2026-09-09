const { withInfoPlist } = require("expo/config-plugins");

const ENVIRONMENT_VARIABLE_NAME = "KAKAO_NATIVE_APP_KEY";
const INFO_PLIST_KEY = "KakaoNativeAppKey";

const withKakaoMap = (config) => {
  const appKey = process.env.KAKAO_NATIVE_APP_KEY?.trim();

  if (!appKey) {
    // eas-cli re-evaluates this config locally in several unrelated code
    // paths (project-id lookup, env resolution, fingerprinting, metro
    // config) that don't consistently expose EAS-stored env vars. Warn
    // instead of throwing so those don't break — the real cloud build
    // worker does have the real key.
    console.warn(
      `[kakao-map] ${ENVIRONMENT_VARIABLE_NAME} not set — skipping Kakao map config.`,
    );
    return config;
  }

  return withInfoPlist(config, (infoPlistConfig) => {
    infoPlistConfig.modResults[INFO_PLIST_KEY] = appKey;
    return infoPlistConfig;
  });
};

module.exports = withKakaoMap;
