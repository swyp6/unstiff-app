const { withInfoPlist } = require("expo/config-plugins");

const ENVIRONMENT_VARIABLE_NAME = "KAKAO_NATIVE_APP_KEY";
const INFO_PLIST_KEY = "KakaoNativeAppKey";

const withKakaoMap = (config) => {
  const appKey = process.env.KAKAO_NATIVE_APP_KEY;

  if (!appKey || appKey.trim().length === 0) {
    throw new Error(
      `${ENVIRONMENT_VARIABLE_NAME} must be set to a non-empty value before generating the iOS project.`,
    );
  }

  return withInfoPlist(config, (infoPlistConfig) => {
    infoPlistConfig.modResults[INFO_PLIST_KEY] = appKey;
    return infoPlistConfig;
  });
};

module.exports = withKakaoMap;
