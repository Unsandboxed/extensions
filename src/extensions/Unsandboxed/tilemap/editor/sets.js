const TILE_SWATCH_LIMIT = 120;
const TILESET_PREVIEW_LIMIT = 128;
const GROUP_TILE_PREFIX = "@group:";
const CONNECT_RULE_PREFIX = "@connect:";
const CONNECT_MASK_COUNT = 16;

const normalizeTileTag = value => `${value || ""}`
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "_");

const normalizeTileTags = values => {
  const source = Array.isArray(values) ? values : [];
  const out = [];
  const seen = new Set();

  for (const value of source) {
    const tag = normalizeTileTag(value);
    if (tag === "" || seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    out.push(tag);
  }

  return out;
};

const parseTileTagsInput = text => normalizeTileTags(
  `${text || ""}`
    .split(/[,;\n]/g)
    .map(part => part.trim())
);

const formatTileTags = tags => normalizeTileTags(tags).join(", ");

const hashString = text => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const tileColorFromId = tileId => {
  const hash = hashString(tileId);
  const hue = hash % 360;
  const sat = 58 + (hash % 24);
  const light = 44 + (hash % 16);
  return `hsl(${hue} ${sat}% ${light}%)`;
};

const isGroupTileId = tileId => `${tileId || ""}`.startsWith(GROUP_TILE_PREFIX);

const groupNameFromTileId = tileId => {
  const text = `${tileId || ""}`;
  return isGroupTileId(text) ? text.slice(GROUP_TILE_PREFIX.length) : text;
};

const makeGroupTileId = name => `${GROUP_TILE_PREFIX}${name}`;

const normalizeGroupName = name => {
  const text = `${name || ""}`.trim();
  return text.replace(/\s+/g, "_");
};

const makeConnectedRuleId = name => `${CONNECT_RULE_PREFIX}${name}`;

const connectedRuleNameFromId = ruleId => {
  const text = `${ruleId || ""}`;
  return text.startsWith(CONNECT_RULE_PREFIX) ? text.slice(CONNECT_RULE_PREFIX.length) : text;
};

const normalizeConnectedRuleName = name => {
  const text = `${name || ""}`.trim();
  return text.replace(/\s+/g, "_");
};

const normalizeRuleTileId = value => `${value || ""}`.trim();

const createEmptyConnectedVariants = () => Array.from({length: CONNECT_MASK_COUNT}, () => []);

const addUniqueVariant = (variants, tileId) => {
  const normalized = normalizeRuleTileId(tileId);
  if (normalized === "") {
    return;
  }
  if (!variants.includes(normalized)) {
    variants.push(normalized);
  }
};

const normalizeConnectedRuleArrays = (rawMaskToTileId, rawMaskVariantsByMask) => {
  const maskToTileId = new Array(CONNECT_MASK_COUNT).fill("");
  for (let i = 0; i < Math.min(CONNECT_MASK_COUNT, Array.isArray(rawMaskToTileId) ? rawMaskToTileId.length : 0); i++) {
    maskToTileId[i] = normalizeRuleTileId(rawMaskToTileId[i]);
  }

  const maskVariantsByMask = createEmptyConnectedVariants();
  for (let i = 0; i < CONNECT_MASK_COUNT; i++) {
    const rawVariants = Array.isArray(rawMaskVariantsByMask && rawMaskVariantsByMask[i]) ? rawMaskVariantsByMask[i] : [];
    for (const tileId of rawVariants) {
      addUniqueVariant(maskVariantsByMask[i], tileId);
    }

    if (maskToTileId[i] !== "") {
      addUniqueVariant(maskVariantsByMask[i], maskToTileId[i]);
    }

    if (maskToTileId[i] === "" && maskVariantsByMask[i].length > 0) {
      maskToTileId[i] = maskVariantsByMask[i][0];
    }
  }

  return {
    maskToTileId,
    maskVariantsByMask
  };
};

const popcount4 = value => {
  let bits = value & 15;
  let count = 0;
  while (bits > 0) {
    count += bits & 1;
    bits >>= 1;
  }
  return count;
};

const hammingMaskDistance = (a, b) => popcount4((a ^ b) & 15);

const missingMaskBits = (targetMask, candidateMask) => popcount4((targetMask & (~candidateMask)) & 15);

const extraMaskBits = (targetMask, candidateMask) => popcount4(((~targetMask) & candidateMask) & 15);

const chooseDeterministicVariant = (variants, seedText) => {
  if (!Array.isArray(variants) || variants.length === 0) {
    return "";
  }
  const index = hashString(seedText) % variants.length;
  return variants[index];
};

const getSelectionBounds = selected => {
  if (!Array.isArray(selected) || selected.length === 0) {
    return null;
  }

  const minCol = Math.min(...selected.map(cell => cell.col));
  const minRow = Math.min(...selected.map(cell => cell.row));
  const maxCol = Math.max(...selected.map(cell => cell.col));
  const maxRow = Math.max(...selected.map(cell => cell.row));

  return {
    minCol,
    minRow,
    maxCol,
    maxRow,
    width: (maxCol - minCol) + 1,
    height: (maxRow - minRow) + 1
  };
};

const isLikelyLegacyMaskTemplateSelection = selected => {
  const bounds = getSelectionBounds(selected);
  if (!bounds || selected.length !== 16 || bounds.width !== 4 || bounds.height !== 4) {
    return false;
  }

  const keySet = new Set(selected.map(cell => `${cell.col},${cell.row}`));
  for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
    for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
      if (!keySet.has(`${col},${row}`)) {
        return false;
      }
    }
  }

  return true;
};

const buildSpatialMaskVariantsFromSelection = selected => {
  const variants = createEmptyConnectedVariants();
  const bounds = getSelectionBounds(selected);
  if (!bounds) {
    return variants;
  }

  const pushMask = (mask, tileId) => {
    if (mask < 0 || mask >= CONNECT_MASK_COUNT) {
      return;
    }
    addUniqueVariant(variants[mask], tileId);
  };

  const {minCol, minRow, maxCol, maxRow, width, height} = bounds;

  for (const cell of selected) {
    const tileId = normalizeRuleTileId(cell.tileId);
    if (tileId === "") {
      continue;
    }

    if (width === 1 && height === 1) {
      pushMask(0, tileId);
      pushMask(15, tileId);
      continue;
    }

    if (width === 1) {
      if (cell.row === minRow) {
        pushMask(4, tileId);
      } else if (cell.row === maxRow) {
        pushMask(1, tileId);
      } else {
        pushMask(5, tileId);
      }
      continue;
    }

    if (height === 1) {
      if (cell.col === minCol) {
        pushMask(2, tileId);
      } else if (cell.col === maxCol) {
        pushMask(8, tileId);
      } else {
        pushMask(10, tileId);
      }
      continue;
    }

    const isTop = cell.row === minRow;
    const isBottom = cell.row === maxRow;
    const isLeft = cell.col === minCol;
    const isRight = cell.col === maxCol;

    if (isTop && isLeft) {
      pushMask(6, tileId);
      continue;
    }
    if (isTop && isRight) {
      pushMask(12, tileId);
      continue;
    }
    if (isBottom && isRight) {
      pushMask(9, tileId);
      continue;
    }
    if (isBottom && isLeft) {
      pushMask(3, tileId);
      continue;
    }
    if (isTop) {
      pushMask(14, tileId);
      continue;
    }
    if (isRight) {
      pushMask(13, tileId);
      continue;
    }
    if (isBottom) {
      pushMask(11, tileId);
      continue;
    }
    if (isLeft) {
      pushMask(7, tileId);
      continue;
    }

    pushMask(15, tileId);
  }

  return variants;
};

const cloneConnectedRule = sourceRule => {
  const normalized = normalizeConnectedRuleArrays(
    sourceRule && sourceRule.maskToTileId,
    sourceRule && sourceRule.maskVariantsByMask
  );

  return {
    id: `${(sourceRule && sourceRule.id) || ""}`,
    name: `${(sourceRule && sourceRule.name) || ""}`,
    maskToTileId: normalized.maskToTileId,
    maskVariantsByMask: normalized.maskVariantsByMask
  };
};

const cloneGroupDefinition = sourceGroup => {
  const sourceCells = Array.isArray(sourceGroup && sourceGroup.cells) ? sourceGroup.cells : [];
  return {
    id: `${(sourceGroup && sourceGroup.id) || ""}`,
    name: `${(sourceGroup && sourceGroup.name) || ""}`,
    width: Math.max(1, Math.round((sourceGroup && sourceGroup.width) || 1)),
    height: Math.max(1, Math.round((sourceGroup && sourceGroup.height) || 1)),
    cells: sourceCells.map(cell => ({
      dx: Math.trunc((cell && cell.dx) || 0),
      dy: Math.trunc((cell && cell.dy) || 0),
      tileId: `${(cell && cell.tileId) || ""}`
    })),
    previewCanvas: (sourceGroup && sourceGroup.previewCanvas) || null
  };
};

const cloneTileset = sourceTileset => {
  const outTiles = new Map();
  if (sourceTileset && sourceTileset.tiles instanceof Map) {
    for (const [tileId, tileCanvas] of sourceTileset.tiles.entries()) {
      outTiles.set(`${tileId}`, tileCanvas);
    }
  }

  const outTileMetaById = new Map();
  if (sourceTileset && sourceTileset.tileMetaById instanceof Map) {
    for (const [tileId, meta] of sourceTileset.tileMetaById.entries()) {
      outTileMetaById.set(`${tileId}`, {
        col: Math.trunc((meta && meta.col) || 0),
        row: Math.trunc((meta && meta.row) || 0),
        isEmpty: !!(meta && meta.isEmpty),
        tags: normalizeTileTags(meta && meta.tags)
      });
    }
  }

  const outCoordToTileId = new Map();
  if (sourceTileset && sourceTileset.coordToTileId instanceof Map) {
    for (const [coordKey, tileId] of sourceTileset.coordToTileId.entries()) {
      outCoordToTileId.set(`${coordKey}`, `${tileId}`);
    }
  }

  const outGroups = new Map();
  if (sourceTileset && sourceTileset.groups instanceof Map) {
    for (const [groupId, group] of sourceTileset.groups.entries()) {
      outGroups.set(`${groupId}`, cloneGroupDefinition(group));
    }
  }

  const outConnectedRules = new Map();
  if (sourceTileset && sourceTileset.connectedRules instanceof Map) {
    for (const [ruleId, rule] of sourceTileset.connectedRules.entries()) {
      outConnectedRules.set(`${ruleId}`, cloneConnectedRule(rule));
    }
  }

  return {
    name: `${(sourceTileset && sourceTileset.name) || ""}`,
    tileWidth: Math.max(1, Math.round((sourceTileset && sourceTileset.tileWidth) || 32)),
    tileHeight: Math.max(1, Math.round((sourceTileset && sourceTileset.tileHeight) || 32)),
    sourceWidth: Math.max(0, Math.round((sourceTileset && sourceTileset.sourceWidth) || 0)),
    sourceHeight: Math.max(0, Math.round((sourceTileset && sourceTileset.sourceHeight) || 0)),
    atlasColumns: Math.max(0, Math.round((sourceTileset && sourceTileset.atlasColumns) || 0)),
    atlasRows: Math.max(0, Math.round((sourceTileset && sourceTileset.atlasRows) || 0)),
    atlasCanvas: (sourceTileset && sourceTileset.atlasCanvas) || null,
    tiles: outTiles,
    tileMetaById: outTileMetaById,
    coordToTileId: outCoordToTileId,
    groups: outGroups,
    connectedRules: outConnectedRules
  };
};

const cloneAllTilesets = sourceTilesets => {
  const out = new Map();
  if (!sourceTilesets || typeof sourceTilesets.entries !== "function") {
    return out;
  }

  for (const [tilesetName, tileset] of sourceTilesets.entries()) {
    const clone = cloneTileset(tileset);
    clone.name = `${tilesetName}`;
    out.set(`${tilesetName}`, clone);
  }

  return out;
};

const isCanvasTileEmpty = tileCanvas => {
  const ctx2d = tileCanvas.getContext("2d");
  if (!ctx2d) {
    return true;
  }

  const imageData = ctx2d.getImageData(0, 0, tileCanvas.width, tileCanvas.height);
  const pixels = imageData.data;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] > 0) {
      return false;
    }
  }

  return true;
};

const createTilesetFromCanvas = (sourceCanvas, tileWidth, tileHeight, options = {}) => {
  if (typeof document === "undefined") {
    return null;
  }

  if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height) {
    return null;
  }

  const splitMode = `${options && options.splitMode ? options.splitMode : "tile-size"}`;
  const requestedColumns = Math.max(1, Math.round((options && options.columns) || 1));
  const requestedRows = Math.max(1, Math.round((options && options.rows) || 1));

  let safeTileWidth = Math.max(1, Math.round(tileWidth || 32));
  let safeTileHeight = Math.max(1, Math.round(tileHeight || 32));
  let columns = Math.floor(sourceCanvas.width / safeTileWidth);
  let rows = Math.floor(sourceCanvas.height / safeTileHeight);

  if (splitMode === "grid") {
    columns = requestedColumns;
    rows = requestedRows;
    safeTileWidth = Math.max(1, Math.floor(sourceCanvas.width / columns));
    safeTileHeight = Math.max(1, Math.floor(sourceCanvas.height / rows));
  }

  if (columns <= 0 || rows <= 0) {
    return null;
  }

  const tiles = new Map();
  const tileMetaById = new Map();
  const coordToTileId = new Map();
  let tileIndex = 1;

  const atlasCanvas = document.createElement("canvas");
  atlasCanvas.width = sourceCanvas.width;
  atlasCanvas.height = sourceCanvas.height;
  const atlasCtx = atlasCanvas.getContext("2d");
  if (atlasCtx) {
    atlasCtx.clearRect(0, 0, atlasCanvas.width, atlasCanvas.height);
    atlasCtx.drawImage(sourceCanvas, 0, 0, atlasCanvas.width, atlasCanvas.height);
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const tileCanvas = document.createElement("canvas");
      tileCanvas.width = safeTileWidth;
      tileCanvas.height = safeTileHeight;

      const tileCtx = tileCanvas.getContext("2d");
      if (!tileCtx) {
        continue;
      }

      tileCtx.clearRect(0, 0, safeTileWidth, safeTileHeight);
      tileCtx.drawImage(
        sourceCanvas,
        col * safeTileWidth,
        row * safeTileHeight,
        safeTileWidth,
        safeTileHeight,
        0,
        0,
        safeTileWidth,
        safeTileHeight
      );

      const isEmpty = isCanvasTileEmpty(tileCanvas);
      if (isEmpty) {
        continue;
      }

      const tileId = `${tileIndex}`;

      tiles.set(tileId, tileCanvas);
      tileMetaById.set(tileId, {
        col,
        row,
        isEmpty: false,
        tags: []
      });
      coordToTileId.set(`${col},${row}`, tileId);
      tileIndex += 1;
    }
  }

  return {
    tileWidth: safeTileWidth,
    tileHeight: safeTileHeight,
    sourceWidth: sourceCanvas.width,
    sourceHeight: sourceCanvas.height,
    atlasColumns: columns,
    atlasRows: rows,
    atlasCanvas,
    tiles,
    tileMetaById,
    coordToTileId,
    groups: new Map(),
    connectedRules: new Map()
  };
};

module.exports = {
  TILE_SWATCH_LIMIT,
  TILESET_PREVIEW_LIMIT,
  GROUP_TILE_PREFIX,
  CONNECT_RULE_PREFIX,
  CONNECT_MASK_COUNT,
  hashString,
  tileColorFromId,
  isGroupTileId,
  groupNameFromTileId,
  makeGroupTileId,
  normalizeGroupName,
  makeConnectedRuleId,
  connectedRuleNameFromId,
  normalizeConnectedRuleName,
  normalizeRuleTileId,
  createEmptyConnectedVariants,
  normalizeConnectedRuleArrays,
  hammingMaskDistance,
  missingMaskBits,
  extraMaskBits,
  chooseDeterministicVariant,
  getSelectionBounds,
  isLikelyLegacyMaskTemplateSelection,
  buildSpatialMaskVariantsFromSelection,
  normalizeTileTags,
  parseTileTagsInput,
  formatTileTags,
  cloneConnectedRule,
  cloneGroupDefinition,
  cloneTileset,
  cloneAllTilesets,
  isCanvasTileEmpty,
  createTilesetFromCanvas
};
