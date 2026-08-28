const figmaTokens = require("./tailwind.tokens.js");

/** @type {import("tailwindcss").Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/features/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ...figmaTokens.colors,
        // Brand colors for third-party login buttons — not part of the design system.
        kakao: "#FEE500",
        "google-border": "#DADCE0",
        "google-text": "#3C4043",
      },
      fontSize: figmaTokens.fontSize,
      borderRadius: figmaTokens.borderRadius,
    },
  },
  plugins: [],
};
