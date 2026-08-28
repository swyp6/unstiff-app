# SWYP Token Export (local dev plugin)

Exports this file's local Variables (colors, typography scale, radius) as JSON, so `scripts/sync-figma-tokens.js` can regenerate the app's token files without needing the `file_variables:read` REST API scope (not available on our team's Figma plan).

## Install (once per person)

1. Figma desktop app → menu → **Plugins → Development → Import plugin from manifest…**
2. Select `figma-plugin/token-export/manifest.json` from this repo.

## Use

1. Open the Foundation page in the SWYP design Figma file.
2. Run the plugin: **Plugins → Development → SWYP Token Export**.
3. Click **토큰 JSON 내보내기** — downloads `figma-variables-export.json`.
4. Move that file to `swyp6-team8-app/scripts/figma-variables-export.json` (overwrite if it already exists).
5. Run `npm run sync-figma-tokens`.
