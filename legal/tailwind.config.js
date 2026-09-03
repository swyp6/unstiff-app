const tokens = require("../tailwind.tokens.js");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./_includes/**/*.njk", "./*.md"],
  theme: {
    extend: {
      borderRadius: tokens.borderRadius,
      colors: tokens.colors,
      fontFamily: {
        sans: ["Inter", "Noto Sans KR", "sans-serif"],
      },
      fontSize: tokens.fontSize,
    },
  },
  plugins: [],
};
