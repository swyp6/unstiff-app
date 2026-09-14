// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Figma plugin sandbox globals (figma, __html__) aren't part of this app's runtime.
    ignores: ["dist/*", "figma-plugin/**"],
  },
]);
