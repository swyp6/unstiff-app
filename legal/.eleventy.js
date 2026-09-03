module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    "styles/site.css": "styles/site.css",
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
