// Reads local Variables directly from the Figma file (Plugin API — no REST
// scope needed) and hands the raw data to ui.html to download as JSON.
// Output shape matches Figma's REST `variables/local` response so
// scripts/sync-figma-tokens.js can consume either one unchanged.
figma.showUI(__html__, { width: 320, height: 160 });

figma.ui.onmessage = async (msg) => {
  if (msg.type !== "export") return;

  const [variables, collections] = await Promise.all([
    figma.variables.getLocalVariablesAsync(),
    figma.variables.getLocalVariableCollectionsAsync(),
  ]);

  const variablesById = {};
  for (const v of variables) {
    variablesById[v.id] = {
      id: v.id,
      name: v.name,
      resolvedType: v.resolvedType,
      variableCollectionId: v.variableCollectionId,
      valuesByMode: v.valuesByMode,
    };
  }

  const variableCollectionsById = {};
  for (const c of collections) {
    variableCollectionsById[c.id] = {
      id: c.id,
      name: c.name,
      defaultModeId: c.defaultModeId,
    };
  }

  figma.ui.postMessage({
    type: "export-result",
    data: {
      meta: {
        variables: variablesById,
        variableCollections: variableCollectionsById,
      },
    },
  });
};
