module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    "styles/site.css": "styles/site.css",
  });

  // "수집·이용"처럼 가운뎃점(U+00B7)으로 이어진 어절은 한 줄에 둔다.
  // word-break: keep-all이 있어도 브라우저가 가운뎃점 앞뒤를 줄바꿈 기회로
  // 보기 때문에 "…수집" / "·이용…"으로 갈라진다. <body> 안의 텍스트만 span으로
  // 감싸고 글자는 바꾸지 않는다.
  eleventyConfig.addTransform("keepMiddleDotWords", function (content) {
    if (!(this.page.outputPath || "").endsWith(".html")) return content;
    const bodyStart = content.indexOf("<body");
    if (bodyStart === -1) return content;
    const head = content.slice(0, bodyStart);
    const body = content
      .slice(bodyStart)
      .replace(
        /(>|^)([^<]*)/g,
        (match, open, text) =>
          open +
          text.replace(
            /[^\s·<>&]+(?:·[^\s·<>&]+)+/g,
            (word) => `<span class="nowrap">${word}</span>`,
          ),
      );
    return head + body;
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    templateFormats: ["md"],
  };
};
