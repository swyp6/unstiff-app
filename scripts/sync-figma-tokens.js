/**
 * Pulls the design foundation (Figma Variables: color palette, semantic colors,
 * typography scale, radius) and regenerates:
 *   - tailwind.tokens.js        (consumed by tailwind.config.js)
 *   - src/constants/tokens.ts   (consumed by app code for non-Tailwind styling)
 *
 * Two input modes:
 *   1. File export (default when present) — run the "SWYP Token Export" Figma
 *      plugin (see figma-plugin/token-export/) and save its download as
 *      scripts/figma-variables-export.json, then: npm run sync-figma-tokens
 *      Use this if your Figma plan doesn't expose the "File variables" REST
 *      scope (the plugin reads variables locally, no API scope needed).
 *   2. Figma REST API — if FIGMA_API_TOKEN + FIGMA_FILE_KEY are set in .env
 *      and no export file is present. Requires the "file_variables:read" scope
 *      on the token (https://www.figma.com/developers/api#access-tokens).
 * Pass --input <path> to point at an export file in a non-default location.
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_EXPORT_PATH = "scripts/figma-variables-export.json";

// Named typography scale -> which font-size/line-height token (t01..t10) it uses,
// and which weights exist for it. Figma Variables don't carry font family/weight
// (that lives in Text Styles), so this table encodes the foundation's naming
// convention directly; only the t01..t10 size/lineHeight values are pulled live.
const TYPOGRAPHY_SCALE = [
  { name: "display-1", sizeToken: "t10", weights: ["medium", "bold"] },
  { name: "title-1", sizeToken: "t09", weights: ["medium", "bold"] },
  { name: "title-2", sizeToken: "t08", weights: ["medium", "bold"] },
  { name: "title-3", sizeToken: "t07", weights: ["medium", "bold"] },
  { name: "heading-1", sizeToken: "t06", weights: ["medium", "bold"] },
  { name: "body-1", sizeToken: "t05", weights: ["regular", "medium", "bold"] },
  { name: "body-2", sizeToken: "t04", weights: ["regular", "medium", "bold"] },
  { name: "body-3", sizeToken: "t03", weights: ["regular", "medium", "bold"] },
  {
    name: "body-reading",
    sizeToken: "t05",
    lineHeightToken: "t06",
    weights: ["regular"],
  },
  {
    name: "caption-1",
    sizeToken: "t02",
    weights: ["regular", "medium", "bold"],
  },
  {
    name: "caption-2",
    sizeToken: "t01",
    weights: ["regular", "medium", "bold"],
  },
];

// Maps to the exact font family names `useFonts()` registers for the local
// Pretendard static font files (see src/app/_layout.tsx) — RN needs the
// weight baked into the family name, setting `fontWeight` alongside a
// specific weighted custom font is unreliable on Android, so weight is
// intentionally not a separate style property here.
const WEIGHT_SUFFIX = {
  regular: "Regular",
  medium: "Medium",
  bold: "Bold",
};
const FONT_FAMILY_PREFIX = "Pretendard";

// Known primitive color palette names vs. semantic ("color/...") names.
const PRIMITIVE_GROUPS = [
  "charcoal",
  "orange",
  "sky",
  "neutral",
  "red",
  "green",
  "yellow",
  "sprout",
  "black-alpha",
];

function toKebab(figmaVariableName) {
  return figmaVariableName.trim().split("/").join("-").toLowerCase();
}

function rgbaToHex({ r, g, b, a }) {
  const toHex = (n) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, "0");
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return a < 1 ? `${hex}${toHex(a)}` : hex;
}

function resolveValue(variables, collections, variable, seen = new Set()) {
  if (seen.has(variable.id)) {
    throw new Error(`Circular variable alias detected at "${variable.name}"`);
  }
  seen.add(variable.id);

  // Always use the variable's own collection's default mode — an alias may
  // point into a different collection, whose mode IDs aren't guaranteed to
  // line up with the referring collection's.
  const modeId = collections[variable.variableCollectionId].defaultModeId;
  const raw =
    variable.valuesByMode[modeId] ?? Object.values(variable.valuesByMode)[0];
  if (raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS") {
    const aliased = variables[raw.id];
    return resolveValue(variables, collections, aliased, seen);
  }
  return raw;
}

function buildTokens(apiResponse) {
  const variables = apiResponse.meta.variables;
  const collections = apiResponse.meta.variableCollections;

  const primitiveColors = {};
  const semanticColors = {};
  const fontSizeByToken = {};
  const lineHeightByToken = {};
  const radius = {};

  for (const variable of Object.values(variables)) {
    const key = toKebab(variable.name);
    const value = resolveValue(variables, collections, variable);

    if (variable.resolvedType === "COLOR") {
      const hex = rgbaToHex(value);
      const matchedGroup = PRIMITIVE_GROUPS.find((group) =>
        key.startsWith(`${group}-`),
      );
      if (matchedGroup) {
        const scale = key.slice(matchedGroup.length + 1);
        primitiveColors[matchedGroup] = primitiveColors[matchedGroup] ?? {};
        primitiveColors[matchedGroup][scale] = hex;
      } else {
        // e.g. "color-label-normal" -> "label-normal"
        semanticColors[key.replace(/^color-/, "")] = hex;
      }
    } else if (variable.resolvedType === "FLOAT") {
      if (key.startsWith("font-size-")) {
        fontSizeByToken[key.replace("font-size-", "")] = value;
      } else if (key.startsWith("line-height-")) {
        lineHeightByToken[key.replace("line-height-", "")] = value;
      } else if (key.startsWith("radius")) {
        radius[key.replace(/^radius-?/, "") || "default"] = value;
      }
    }
  }

  const fontSize = {};
  for (const token of Object.keys(fontSizeByToken)) {
    fontSize[token] = [
      `${fontSizeByToken[token]}px`,
      { lineHeight: `${lineHeightByToken[token]}px` },
    ];
  }

  const typography = {};
  for (const scale of TYPOGRAPHY_SCALE) {
    const lineHeightToken = scale.lineHeightToken ?? scale.sizeToken;
    const size = fontSizeByToken[scale.sizeToken];
    const lineHeight = lineHeightByToken[lineHeightToken];
    if (typeof size !== "number" || typeof lineHeight !== "number") {
      throw new Error(
        `Typography scale "${scale.name}" expects Figma variables ` +
          `font-size/${scale.sizeToken} and line-height/${lineHeightToken}, ` +
          "but one is missing. Check TYPOGRAPHY_SCALE in " +
          "scripts/sync-figma-tokens.js against the current Figma foundation.",
      );
    }
    for (const weight of scale.weights) {
      typography[`${scale.name}-${weight}`] = {
        fontFamily: `${FONT_FAMILY_PREFIX}-${WEIGHT_SUFFIX[weight]}`,
        fontSize: size,
        lineHeight,
      };
    }
  }

  return { primitiveColors, semanticColors, fontSize, radius, typography };
}

function renderTailwindTokens({
  primitiveColors,
  semanticColors,
  fontSize,
  radius,
}) {
  const colors = { ...primitiveColors, ...semanticColors };
  const borderRadius = Object.fromEntries(
    Object.entries(radius).map(([k, v]) => [k, `${v}px`]),
  );
  return (
    "// AUTO-GENERATED by `npm run sync-figma-tokens` — do not edit by hand.\n" +
    "// Source: Figma Variables (see scripts/sync-figma-tokens.js)\n" +
    `module.exports = ${JSON.stringify({ colors, fontSize, borderRadius }, null, 2)};\n`
  );
}

function renderAppTokens({
  primitiveColors,
  semanticColors,
  radius,
  typography,
}) {
  return (
    "// AUTO-GENERATED by `npm run sync-figma-tokens` — do not edit by hand.\n" +
    "// Source: Figma Variables (see scripts/sync-figma-tokens.js)\n\n" +
    `export const primitiveColors = ${JSON.stringify(primitiveColors, null, 2)} as const;\n\n` +
    `export const semanticColors = ${JSON.stringify(semanticColors, null, 2)} as const;\n\n` +
    `export const radius = ${JSON.stringify(radius, null, 2)} as const;\n\n` +
    `export type TypographyStyle = {\n` +
    `  fontFamily: string;\n` +
    `  fontSize: number;\n` +
    `  lineHeight: number;\n` +
    `};\n\n` +
    `export const typography = ${JSON.stringify(typography, null, 2)} as const satisfies Record<string, TypographyStyle>;\n`
  );
}

function getInputPathArg() {
  const flagIndex = process.argv.indexOf("--input");
  return flagIndex === -1 ? undefined : process.argv[flagIndex + 1];
}

async function fetchFromRestApi() {
  const FIGMA_API_TOKEN = process.env.FIGMA_API_TOKEN;
  const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY;

  if (!FIGMA_API_TOKEN || !FIGMA_FILE_KEY) {
    console.error(
      `No export file found at ${DEFAULT_EXPORT_PATH}, and FIGMA_API_TOKEN/FIGMA_FILE_KEY are not set.\n` +
        "Either run the SWYP Token Export Figma plugin and save its download to that path,\n" +
        "or set FIGMA_API_TOKEN/FIGMA_FILE_KEY in .env (see .env.example).",
    );
    process.exit(1);
  }

  const res = await fetch(
    `https://api.figma.com/v1/files/${FIGMA_FILE_KEY}/variables/local`,
    { headers: { "X-Figma-Token": FIGMA_API_TOKEN } },
  );

  if (!res.ok) {
    console.error(`Figma API error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  return res.json();
}

async function main() {
  const explicitInputPath = getInputPathArg();
  const inputPath = explicitInputPath ?? DEFAULT_EXPORT_PATH;
  const rootDir = process.cwd();
  const resolvedInputPath = path.join(rootDir, inputPath);

  let apiResponse;
  if (fs.existsSync(resolvedInputPath)) {
    console.log(`Reading Figma variables from ${inputPath}`);
    apiResponse = JSON.parse(fs.readFileSync(resolvedInputPath, "utf8"));
  } else if (explicitInputPath) {
    // An explicit --input that doesn't exist is a mistake (e.g. a typo'd
    // path) — fail loudly instead of silently falling back to a different
    // data source (the REST API), which could overwrite tokens with
    // unintended remote values.
    console.error(`--input file not found: ${inputPath}`);
    process.exit(1);
  } else {
    console.log("No export file found, falling back to the Figma REST API");
    apiResponse = await fetchFromRestApi();
  }

  const tokens = buildTokens(apiResponse);
  writeTokenFiles(tokens);
  console.log(
    "Synced Figma tokens -> tailwind.tokens.js, src/constants/tokens.ts",
  );
}

function writeTokenFiles(tokens) {
  const rootDir = process.cwd();
  fs.writeFileSync(
    path.join(rootDir, "tailwind.tokens.js"),
    renderTailwindTokens(tokens),
  );
  fs.writeFileSync(
    path.join(rootDir, "src/constants/tokens.ts"),
    renderAppTokens(tokens),
  );
}

module.exports = {
  buildTokens,
  renderTailwindTokens,
  renderAppTokens,
  writeTokenFiles,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
