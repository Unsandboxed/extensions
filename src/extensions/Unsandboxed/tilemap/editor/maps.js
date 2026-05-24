const DEFAULT_VIEW_WIDTH = 24;
const DEFAULT_VIEW_HEIGHT = 16;
const MIN_VIEW_WIDTH = 6;
const MIN_VIEW_HEIGHT = 6;
const MAX_VIEW_WIDTH = 96;
const MAX_VIEW_HEIGHT = 96;
const GRID_CELL_SIZE = 30;
const BASE_PREVIEW_CANVAS_WIDTH = DEFAULT_VIEW_WIDTH * GRID_CELL_SIZE;
const BASE_PREVIEW_CANVAS_HEIGHT = DEFAULT_VIEW_HEIGHT * GRID_CELL_SIZE;
const MIN_PREVIEW_CELL_SIZE = 4;
const AUTO_SAVE_DEBOUNCE_MS = 220;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const cloneLayer = sourceLayer => {
  const out = new Map();
  for (const [key, value] of sourceLayer.entries()) {
    out.set(key, `${value}`);
  }
  return out;
};

const cloneTilemap = sourceTilemap => {
  const out = {
    tileWidth: Math.max(1, Math.round(sourceTilemap.tileWidth || 32)),
    tileHeight: Math.max(1, Math.round(sourceTilemap.tileHeight || 32)),
    layers: new Map()
  };

  for (const [layerName, layer] of sourceTilemap.layers.entries()) {
    out.layers.set(`${layerName}`, cloneLayer(layer));
  }

  if (out.layers.size === 0) {
    out.layers.set("0", new Map());
  }

  return out;
};

const cloneAllTilemaps = sourceTilemaps => {
  const out = new Map();
  for (const [mapName, tilemap] of sourceTilemaps.entries()) {
    out.set(`${mapName}`, cloneTilemap(tilemap));
  }
  return out;
};

const buildEmptyTilemap = (ctx, tileWidth, tileHeight) => ({
  tileWidth: ctx._toTileSize(tileWidth, 32),
  tileHeight: ctx._toTileSize(tileHeight, 32),
  layers: new Map([["0", new Map()]])
});

const collectTileIds = tilemap => {
  const ids = new Set();
  for (const layer of tilemap.layers.values()) {
    for (const tileId of layer.values()) {
      const text = `${tileId}`.trim();
      if (text !== "") {
        ids.add(text);
      }
    }
  }
  return Array.from(ids).sort((a, b) => a.localeCompare(b));
};

const getMapCellCount = tilemap => {
  let count = 0;
  for (const layer of tilemap.layers.values()) {
    count += layer.size;
  }
  return count;
};

const getLayerCellCount = layer => layer.size;

module.exports = {
  DEFAULT_VIEW_WIDTH,
  DEFAULT_VIEW_HEIGHT,
  MIN_VIEW_WIDTH,
  MIN_VIEW_HEIGHT,
  MAX_VIEW_WIDTH,
  MAX_VIEW_HEIGHT,
  GRID_CELL_SIZE,
  BASE_PREVIEW_CANVAS_WIDTH,
  BASE_PREVIEW_CANVAS_HEIGHT,
  MIN_PREVIEW_CELL_SIZE,
  AUTO_SAVE_DEBOUNCE_MS,
  clamp,
  cloneLayer,
  cloneTilemap,
  cloneAllTilemaps,
  buildEmptyTilemap,
  collectTileIds,
  getMapCellCount,
  getLayerCellCount
};
