(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;
  const {openTilemapEditorTab} = require("./editor/editor");

  /**
   * Unsandboxed blocks for Godot-style tilemap data management.
   */
  class UnsandboxedTilemapBlocks {
    static extensionId = "usbTilemap";

    constructor() {
      this.vm = Scratch.vm;
      this.runtime = this.vm.runtime;
      this._tilemaps = new Map();
      this._tilemapRevisionByName = new Map();
      this._tilesets = new Map();
      this._tilesetsRevision = 1;
      this._tileWorlds = new Map();
      this._activeTilemapName = "main";
      this._editorTabBootstrapTimer = null;
      this._editorTabBootstrapAttempts = 0;
      this._editorTabWatchdogTimer = null;
      this._createTilemap(this._activeTilemapName, 32, 32);

      this._scheduleEditorTabBootstrap();
      this._startEditorTabWatchdog();

      if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) {
            this._tryOpenEditorTab();
          }
        });
      }

      if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
        window.addEventListener("focus", () => {
          this._tryOpenEditorTab();
        });
      }

      if (this.runtime && typeof this.runtime.on === "function") {
        this.runtime.on("AFTER_EXECUTE", () => {
          this._tickTileWorlds();
        });

        this.runtime.on("PROJECT_LOADED", () => {
          this._scheduleEditorTabBootstrap();
          this._startEditorTabWatchdog();
        });
      }
    }

    _toFiniteNumber(value, fallback = 0) {
      const number = Cast.toNumber(value);
      return Number.isFinite(number) ? number : fallback;
    }

    _clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    _toCellCoordinate(value, fallback = 0) {
      return Math.trunc(this._toFiniteNumber(value, fallback));
    }

    _toTileSize(value, fallback = 32) {
      return Math.max(1, Math.round(Math.abs(this._toFiniteNumber(value, fallback))));
    }

    _toMapName(value, fallback = "main") {
      const text = Cast.toString(value).trim();
      if (text !== "") {
        return text;
      }
      if (this._activeTilemapName) {
        return this._activeTilemapName;
      }
      return fallback;
    }

    _toLayerName(value) {
      const text = Cast.toString(value).trim();
      return text === "" ? "0" : text;
    }

    _floorDiv(value, divisor) {
      if (!Number.isFinite(divisor) || divisor === 0) {
        return 0;
      }
      return Math.floor(value / divisor);
    }

    _cellKey(x, y) {
      return `${x},${y}`;
    }

    _cellFromKey(key) {
      const split = Cast.toString(key).split(",");
      return [
        this._toCellCoordinate(split[0], 0),
        this._toCellCoordinate(split[1], 0)
      ];
    }

    _createTilemap(name, tileWidth = 32, tileHeight = 32) {
      const mapName = this._toMapName(name);
      const tilemap = {
        tileWidth: this._toTileSize(tileWidth, 32),
        tileHeight: this._toTileSize(tileHeight, 32),
        layers: new Map()
      };

      tilemap.layers.set("0", new Map());
      this._tilemaps.set(mapName, tilemap);
      this._touchTilemap(mapName);
      return tilemap;
    }

    _getTilemap(name, createIfMissing = false) {
      const mapName = this._toMapName(name);
      if (!this._tilemaps.has(mapName) && createIfMissing) {
        this._createTilemap(mapName, 32, 32);
      }
      return this._tilemaps.get(mapName) || null;
    }

    _getLayer(tilemap, layerName, createIfMissing = false) {
      if (!tilemap) {
        return null;
      }

      const normalizedLayer = this._toLayerName(layerName);
      if (!tilemap.layers.has(normalizedLayer) && createIfMissing) {
        tilemap.layers.set(normalizedLayer, new Map());
      }
      return tilemap.layers.get(normalizedLayer) || null;
    }

    _setCell(mapNameInput, layerNameInput, xInput, yInput, tileInput) {
      const mapName = this._toMapName(mapNameInput);
      const tilemap = this._getTilemap(mapName, true);
      const layer = this._getLayer(tilemap, layerNameInput, true);
      const x = this._toCellCoordinate(xInput, 0);
      const y = this._toCellCoordinate(yInput, 0);
      const tile = Cast.toString(tileInput);
      const key = this._cellKey(x, y);

      if (tile === "") {
        layer.delete(key);
        this._touchTilemap(mapName);
        return mapName;
      }

      layer.set(key, tile);
      this._touchTilemap(mapName);
      return mapName;
    }

    _toWorldName(value, fallback = "world") {
      const text = Cast.toString(value).trim();
      return text === "" ? fallback : text;
    }

    _toTilesetName(value, fallback = "default") {
      const text = Cast.toString(value).trim();
      return text === "" ? fallback : text;
    }

    _touchTilemap(mapNameInput) {
      const mapName = this._toMapName(mapNameInput);
      const next = (this._tilemapRevisionByName.get(mapName) || 0) + 1;
      this._tilemapRevisionByName.set(mapName, next);
      this._markTileWorldsDirty();
    }

    _removeTilemapRevision(mapNameInput) {
      const mapName = this._toMapName(mapNameInput);
      this._tilemapRevisionByName.delete(mapName);
      this._markTileWorldsDirty();
    }

    _onTilemapsMutated() {
      const nextRevisions = new Map();
      for (const mapName of this._tilemaps.keys()) {
        nextRevisions.set(mapName, (this._tilemapRevisionByName.get(mapName) || 0) + 1);
      }
      this._tilemapRevisionByName = nextRevisions;
      this._markTileWorldsDirty();
    }

    _touchTilesets() {
      this._tilesetsRevision++;
      this._markTileWorldsDirty();
    }

    _markTileWorldsDirty() {
      for (const world of this._tileWorlds.values()) {
        world.dirty = true;
      }
    }

    _syncActiveTilemap() {
      if (this._tilemaps.has(this._activeTilemapName)) {
        return;
      }

      const firstTilemap = this._tilemaps.keys().next();
      if (!firstTilemap.done) {
        this._activeTilemapName = firstTilemap.value;
        return;
      }

      this._activeTilemapName = "main";
      this._createTilemap(this._activeTilemapName, 32, 32);
    }

    _getTilemapMenu() {
      const items = [];
      for (const mapName of this._tilemaps.keys()) {
        items.push({
          text: mapName,
          value: mapName
        });
      }

      if (items.length === 0) {
        items.push({
          text: "main",
          value: "main"
        });
      }

      return items;
    }

    _getLayerMenu() {
      const tilemap = this._getTilemap(this._activeTilemapName, false);
      if (!tilemap || tilemap.layers.size === 0) {
        return [
          {
            text: "0",
            value: "0"
          }
        ];
      }

      const layerNames = Array.from(tilemap.layers.keys());
      layerNames.sort();
      return layerNames.map(layerName => ({
        text: layerName,
        value: layerName
      }));
    }

    _getEditorTabApi() {
      const gui = Scratch && Scratch.gui;
      if (!gui) return null;
      const api = gui.editorTabs || gui.extensionEditorTabs || null;
      if (typeof api.open !== "function") return null;
      if (typeof api.close !== "function") return null;
      if (typeof api.getBodyElement !== "function") return null;
      return api;
    }

    _getEditorTabId() {
      return `${UnsandboxedTilemapBlocks.extensionId}-tilemap-editor`;
    }

    _isEditorTabMounted() {
      const api = this._getEditorTabApi();
      if (!api) {
        return false;
      }

      const body = api.getBodyElement(this._getEditorTabId());
      return !!(body && body.getAttribute("data-usb-tilemap-mounted") === "1");
    }

    _tryOpenEditorTab() {
      if (typeof document === "undefined") {
        return true;
      }

      if (this._isEditorTabMounted()) {
        return true;
      }

      const api = this._getEditorTabApi();
      if (!api) {
        return false;
      }

      this._openEditor(this._activeTilemapName || "main", false);
      return this._isEditorTabMounted();
    }

    _scheduleEditorTabBootstrap() {
      if (typeof document === "undefined") {
        return;
      }

      if (this._editorTabBootstrapTimer) {
        clearInterval(this._editorTabBootstrapTimer);
        this._editorTabBootstrapTimer = null;
      }

      const maxAttempts = 80;
      this._editorTabBootstrapAttempts = 0;

      const step = () => {
        this._editorTabBootstrapAttempts += 1;
        const done = this._tryOpenEditorTab() || this._editorTabBootstrapAttempts >= maxAttempts;
        if (done && this._editorTabBootstrapTimer) {
          clearInterval(this._editorTabBootstrapTimer);
          this._editorTabBootstrapTimer = null;
        }
        return done;
      };

      if (step()) {
        return;
      }

      this._editorTabBootstrapTimer = setInterval(step, 150);
    }

    _startEditorTabWatchdog() {
      if (typeof document === "undefined") {
        return;
      }

      if (this._editorTabWatchdogTimer) {
        clearInterval(this._editorTabWatchdogTimer);
        this._editorTabWatchdogTimer = null;
      }

      this._editorTabWatchdogTimer = setInterval(() => {
        if (this._editorTabBootstrapTimer) {
          return;
        }
        this._tryOpenEditorTab();
      }, 1200);
    }

    _openEditor(mapName, activate = true) {
      openTilemapEditorTab(this, {
        mapName,
        activate,
        Cast,
        Scratch,
        extensionId: UnsandboxedTilemapBlocks.extensionId,
        onMapsChanged: () => {
          this._onTilemapsMutated();
        }
      });
    }

    _getEditingTarget() {
      if (this.vm && this.vm.editingTarget) {
        return this.vm.editingTarget;
      }
      return null;
    }

    _getCostumeMenu() {
      const target = this._getEditingTarget();
      const items = [
        {
          text: translate("current costume"),
          value: "_current_"
        }
      ];

      if (!target || typeof target.getCostumes !== "function") {
        return items;
      }

      const costumes = target.getCostumes();
      for (const costume of costumes) {
        const name = Cast.toString(costume.name).trim();
        if (name === "") continue;
        items.push({
          text: name,
          value: name
        });
      }

      return items;
    }

    _getTileWorldMenu() {
      const items = [];
      for (const worldName of this._tileWorlds.keys()) {
        items.push({
          text: worldName,
          value: worldName
        });
      }
      if (items.length === 0) {
        items.push({
          text: "world",
          value: "world"
        });
      }
      return items;
    }

    _getTilesetMenu() {
      const items = [];
      for (const tilesetName of this._tilesets.keys()) {
        items.push({
          text: tilesetName,
          value: tilesetName
        });
      }
      if (items.length === 0) {
        items.push({
          text: "default",
          value: "default"
        });
      }
      return items;
    }

    _resolveCostume(costumeArg, util) {
      const target = (util && util.target) || this._getEditingTarget();
      if (!target || typeof target.getCostumes !== "function") {
        return null;
      }

      const costumes = target.getCostumes();
      if (!Array.isArray(costumes) || costumes.length === 0) {
        return null;
      }

      const raw = Cast.toString(costumeArg).trim();
      if (raw === "" || raw === "_current_") {
        const currentIndex = this._toCellCoordinate(target.currentCostume, 0);
        const clampedIndex = Math.max(0, Math.min(costumes.length - 1, currentIndex));
        return costumes[clampedIndex];
      }

      if (typeof target.getCostumeIndexByName === "function") {
        const byName = target.getCostumeIndexByName(raw);
        if (byName >= 0 && byName < costumes.length) {
          return costumes[byName];
        }
      }

      const numeric = Number(raw);
      if (Number.isFinite(numeric)) {
        const wrapped = ((Math.floor(numeric) - 1) % costumes.length + costumes.length) % costumes.length;
        return costumes[wrapped];
      }

      return null;
    }

    _ensureTileWorldDrawable(world) {
      const renderer = this.runtime && this.runtime.renderer;
      if (!renderer || !this._canUseRendererTileSkin(renderer)) {
        return false;
      }

      const stageWidth = Math.round(this.runtime.stageWidth || 480);
      const stageHeight = Math.round(this.runtime.stageHeight || 360);

      if (!Number.isInteger(world.skinId) || !renderer._allSkins[world.skinId]) {
        world.skinId = renderer.createTileSkin({
          tileWidth: 1,
          tileHeight: 1,
          tilesWide: stageWidth,
          tilesTall: stageHeight,
          rotationCenter: [stageWidth / 2, stageHeight / 2],
          layers: {}
        });
        world.dirty = true;
      }

      if (!Number.isInteger(world.drawableId) || !renderer._allDrawables[world.drawableId]) {
        world.drawableId = renderer.createDrawable("sprite");
        if (typeof renderer.markDrawableAsNoninteractive === "function") {
          renderer.markDrawableAsNoninteractive(world.drawableId);
        }
        renderer.updateDrawableSkinId(world.drawableId, world.skinId);
        renderer.updateDrawableDirectionScale(world.drawableId, 90, [100, 100]);
        world.dirty = true;
      }

      renderer.updateDrawableVisible(world.drawableId, world.visible !== false);
      return true;
    }

    _canUseRendererTileSkin(renderer) {
      return !!(renderer &&
        typeof renderer.createTileSkin === "function" &&
        typeof renderer.updateTileSkin === "function");
    }

    _buildTileSkinLayers(tilemap, minCellX, maxCellX, minCellY, maxCellY) {
      const layers = {};
      const layerNames = this._sortLayerNames(tilemap);

      for (const layerName of layerNames) {
        const layer = tilemap.layers.get(layerName);
        if (!layer) continue;

        const cells = [];
        for (let cellY = maxCellY; cellY >= minCellY; cellY--) {
          for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
            const key = this._cellKey(cellX, cellY);
            const tileId = layer.get(key);
            if (!tileId) continue;
            cells.push({
              x: cellX,
              y: cellY,
              tileId: Cast.toString(tileId)
            });
          }
        }
        layers[layerName] = cells;
      }

      return layers;
    }

    _buildTileSkinTileset(tileset) {
      const out = {};
      if (!tileset || !tileset.tiles) {
        return out;
      }

      for (const [tileId, tileCanvas] of tileset.tiles) {
        out[Cast.toString(tileId)] = tileCanvas;
      }

      return out;
    }

    _hasTileSkinTilesetPayload(tilesetPayload) {
      return !!(tilesetPayload && typeof tilesetPayload === "object" && Object.keys(tilesetPayload).length > 0);
    }

    _buildTileSkinOverlay(world) {
      const overlay = {
        showGrid: world.showGrid === true,
        gridOpacity: this._clamp(this._toFiniteNumber(world.gridOpacity, 0.28), 0.08, 0.8),
        hoverCell: null,
        previewCells: [],
        previewErase: world.dragErase === true
      };

      if (Number.isFinite(world.hoverMapX) && Number.isFinite(world.hoverMapY)) {
        overlay.hoverCell = {
          x: this._toCellCoordinate(world.hoverMapX, 0),
          y: this._toCellCoordinate(world.hoverMapY, 0)
        };
      }

      if (world.dragTool === "line" || world.dragTool === "rect") {
        const previewCells = world.dragTool === "line" ?
          this._collectPreviewLineCells(world.dragAnchorCell, world.dragPreviewCell || world.dragAnchorCell) :
          this._collectPreviewRectCells(world.dragAnchorCell, world.dragPreviewCell || world.dragAnchorCell);

        overlay.previewCells = previewCells.map(cell => ({
          x: this._toCellCoordinate(cell.mapX, 0),
          y: this._toCellCoordinate(cell.mapY, 0)
        }));
      }

      return overlay;
    }

    _renderTileWorldTileSkin(world, tilemap, cameraX, cameraY, stageWidth, stageHeight, cameraZoom) {
      const renderer = this.runtime && this.runtime.renderer;
      if (!renderer || !Number.isInteger(world.skinId)) {
        return;
      }

      const tileWidth = Math.max(1, tilemap.tileWidth);
      const tileHeight = Math.max(1, tilemap.tileHeight);
      const zoom = Math.max(0.01, this._toFiniteNumber(cameraZoom, 1));
      const viewWorldHalfWidth = (stageWidth / 2) / zoom;
      const viewWorldHalfHeight = (stageHeight / 2) / zoom;
      const viewLeft = cameraX - viewWorldHalfWidth;
      const viewTop = cameraY + viewWorldHalfHeight;
      const visibleLeft = cameraX - viewWorldHalfWidth;
      const visibleRight = cameraX + viewWorldHalfWidth;
      const visibleBottom = cameraY - viewWorldHalfHeight;
      const visibleTop = cameraY + viewWorldHalfHeight;

      const minCellX = Math.floor(visibleLeft / tileWidth) - 2;
      const maxCellX = Math.ceil(visibleRight / tileWidth) + 2;
      const minCellY = Math.floor(visibleBottom / tileHeight) - 2;
      const maxCellY = Math.ceil(visibleTop / tileHeight) + 2;

      const tilesWide = Math.max(1, (maxCellX - minCellX) + 1);
      const tilesTall = Math.max(1, (maxCellY - minCellY) + 1);
      const tileScreenWidth = Math.max(1, Math.round(tileWidth * zoom));
      const tileScreenHeight = Math.max(1, Math.round(tileHeight * zoom));

      const offsetX = ((minCellX * tileWidth) - viewLeft) * zoom;
      const offsetY = (viewTop - ((maxCellY + 1) * tileHeight)) * zoom;

      const tileset = this._tilesets.get(world.tilesetName) || null;
      const layers = this._buildTileSkinLayers(tilemap, minCellX, maxCellX, minCellY, maxCellY);

      const tilesetPayload = this._buildTileSkinTileset(tileset);
      const updatePayload = {
        tileWidth: tileScreenWidth,
        tileHeight: tileScreenHeight,
        tilesWide,
        tilesTall,
        originX: minCellX,
        originY: minCellY,
        offsetX,
        offsetY,
        rotationCenter: [stageWidth / 2, stageHeight / 2],
        layers,
        overlay: this._buildTileSkinOverlay(world)
      };

      // Do not send empty tileset objects; TileSkin treats that as a full clear.
      if (this._hasTileSkinTilesetPayload(tilesetPayload)) {
        updatePayload.tileset = tilesetPayload;
      }

      renderer.updateTileSkin(world.skinId, updatePayload);
    }

    _applyTileWorldOrder(world) {
      const renderer = this.runtime && this.runtime.renderer;
      if (!renderer || !Number.isInteger(world.drawableId) || typeof renderer.setDrawableOrder !== "function") {
        return;
      }

      let desiredOrder = 1;
      if (world.layerMode === "front") {
        desiredOrder = Infinity;
      } else if (world.layerMode === "back") {
        desiredOrder = 1;
      } else if (Number.isFinite(world.order)) {
        desiredOrder = Math.max(1, Math.floor(world.order));
      }

      if (world.lastAppliedOrder === desiredOrder) {
        return;
      }

      renderer.setDrawableOrder(world.drawableId, desiredOrder, "sprite");
      world.lastAppliedOrder = desiredOrder;
    }

    _getCameraXY() {
      const renderer = this.runtime && this.runtime.renderer;
      const runtimeCamera = this.runtime && this.runtime.camera ? this.runtime.camera : null;
      const rendererCamera = renderer && renderer.cameraState ? renderer.cameraState : null;

      const x = runtimeCamera && Number.isFinite(runtimeCamera.x) ? runtimeCamera.x :
        rendererCamera && Number.isFinite(rendererCamera.x) ? rendererCamera.x : 0;
      const y = runtimeCamera && Number.isFinite(runtimeCamera.y) ? runtimeCamera.y :
        rendererCamera && Number.isFinite(rendererCamera.y) ? rendererCamera.y : 0;

      return [x, y];
    }

    _sortLayerNames(tilemap) {
      const names = Array.from(tilemap.layers.keys());
      names.sort((a, b) => Cast.toString(a).localeCompare(Cast.toString(b), undefined, {numeric: true, sensitivity: "base"}));
      return names;
    }

    _collectPreviewLineCells(startCell, endCell) {
      if (!startCell || !endCell) {
        return [];
      }

      let x0 = this._toCellCoordinate(startCell.mapX, 0);
      let y0 = this._toCellCoordinate(startCell.mapY, 0);
      const x1 = this._toCellCoordinate(endCell.mapX, 0);
      const y1 = this._toCellCoordinate(endCell.mapY, 0);
      const dx = Math.abs(x1 - x0);
      const sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0);
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;

      const cells = [];
      while (true) {
        cells.push({mapX: x0, mapY: y0});
        if (x0 === x1 && y0 === y1) {
          break;
        }
        const e2 = err * 2;
        if (e2 >= dy) {
          err += dy;
          x0 += sx;
        }
        if (e2 <= dx) {
          err += dx;
          y0 += sy;
        }
      }

      return cells;
    }

    _collectPreviewRectCells(startCell, endCell) {
      if (!startCell || !endCell) {
        return [];
      }

      const minX = Math.min(this._toCellCoordinate(startCell.mapX, 0), this._toCellCoordinate(endCell.mapX, 0));
      const maxX = Math.max(this._toCellCoordinate(startCell.mapX, 0), this._toCellCoordinate(endCell.mapX, 0));
      const minY = Math.min(this._toCellCoordinate(startCell.mapY, 0), this._toCellCoordinate(endCell.mapY, 0));
      const maxY = Math.max(this._toCellCoordinate(startCell.mapY, 0), this._toCellCoordinate(endCell.mapY, 0));

      const cells = [];
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          cells.push({mapX: x, mapY: y});
        }
      }
      return cells;
    }

    _tickTileWorlds() {
      if (this._tileWorlds.size === 0) {
        return;
      }

      const renderer = this.runtime && this.runtime.renderer;
      if (!renderer) {
        return;
      }

      const stageWidth = Math.round(this.runtime.stageWidth || 480);
      const stageHeight = Math.round(this.runtime.stageHeight || 360);
      const [cameraX, cameraY] = this._getCameraXY();
      const cameraZoom = renderer && renderer.cameraState && Number.isFinite(renderer.cameraState.zoom) ?
        renderer.cameraState.zoom :
        1;

      for (const world of this._tileWorlds.values()) {
        if (!this._ensureTileWorldDrawable(world)) {
          continue;
        }

        renderer.updateDrawableVisible(world.drawableId, world.visible !== false);
        if (world.visible === false) {
          continue;
        }

        if (typeof renderer.updateDrawablePositionExact === "function") {
          renderer.updateDrawablePositionExact(world.drawableId, [cameraX, cameraY]);
        } else {
          renderer.updateDrawablePosition(world.drawableId, [cameraX, cameraY]);
        }

        const safeZoom = Math.max(0.01, this._toFiniteNumber(cameraZoom, 1));
        const inverseZoomScale = 100 / safeZoom;
        renderer.updateDrawableDirectionScale(world.drawableId, 90, [inverseZoomScale, inverseZoomScale]);

        this._applyTileWorldOrder(world);

        const mapRevision = this._tilemapRevisionByName.get(world.mapName) || 0;
        const needsRender = world.dirty ||
          world.lastCameraX !== cameraX ||
          world.lastCameraY !== cameraY ||
          world.lastCameraZoom !== safeZoom ||
          world.lastStageWidth !== stageWidth ||
          world.lastStageHeight !== stageHeight ||
          world.lastMapRevision !== mapRevision ||
          world.lastTilesetsRevision !== this._tilesetsRevision;

        if (!needsRender) {
          continue;
        }

        const tilemap = this._getTilemap(world.mapName, false);
        if (!tilemap) {
          // Fullscreen transitions can briefly race world-map availability; preserve last rendered skin.
          world.dirty = true;
          continue;
        }

        this._renderTileWorldTileSkin(world, tilemap, cameraX, cameraY, stageWidth, stageHeight, cameraZoom);

        world.lastCameraX = cameraX;
        world.lastCameraY = cameraY;
        world.lastCameraZoom = safeZoom;
        world.lastStageWidth = stageWidth;
        world.lastStageHeight = stageHeight;
        world.lastMapRevision = mapRevision;
        world.lastTilesetsRevision = this._tilesetsRevision;
        world.dirty = false;
      }
    }

    _deleteTileWorld(worldNameInput) {
      const name = this._toWorldName(worldNameInput, "world");
      const world = this._tileWorlds.get(name);
      if (!world) {
        return;
      }

      const renderer = this.runtime && this.runtime.renderer;
      if (renderer) {
        if (Number.isInteger(world.drawableId) && renderer._allDrawables && renderer._allDrawables[world.drawableId]) {
          renderer.destroyDrawable(world.drawableId, "sprite");
        }
        if (Number.isInteger(world.skinId) && renderer._allSkins && renderer._allSkins[world.skinId]) {
          renderer.destroySkin(world.skinId);
        }
      }

      this._tileWorlds.delete(name);
    }

    _getOrCreateTileWorld(worldNameInput) {
      const worldName = this._toWorldName(worldNameInput, "world");
      if (!this._tileWorlds.has(worldName)) {
        this._tileWorlds.set(worldName, {
          name: worldName,
          mapName: this._activeTilemapName,
          tilesetName: "",
          showGrid: false,
          gridOpacity: 0.28,
          hoverMapX: null,
          hoverMapY: null,
          dragTool: "",
          dragErase: false,
          dragAnchorCell: null,
          dragPreviewCell: null,
          layerMode: "middle",
          order: 1,
          visible: true,
          drawableId: null,
          skinId: null,
          dirty: true,
          lastCameraX: null,
          lastCameraY: null,
          lastCameraZoom: null,
          lastStageWidth: 0,
          lastStageHeight: 0,
          lastMapRevision: 0,
          lastTilesetsRevision: 0,
          lastAppliedOrder: null
        });
      }
      return this._tileWorlds.get(worldName);
    }

    _skinToCanvas(skin) {
      if (!skin || typeof document === "undefined") {
        return null;
      }

      if (skin._silhouette) {
        const silhouette = skin._silhouette;
        silhouette.unlazy();
        const width = silhouette._width;
        const height = silhouette._height;
        if (width > 0 && height > 0) {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx2d = canvas.getContext("2d");
          if (!ctx2d) {
            return null;
          }
          const raw = silhouette._colorData;
          const colorData = raw instanceof Uint8ClampedArray ? raw : new Uint8ClampedArray(raw);
          const imageData = new ImageData(colorData, width, height);
          ctx2d.putImageData(imageData, 0, 0);
          return canvas;
        }
      }

      const svgSkin = skin;
      if (svgSkin._svgImage && svgSkin._svgImage.width > 0 && svgSkin._svgImage.height > 0) {
        const width = Math.max(1, Math.round(svgSkin._svgImage.width));
        const height = Math.max(1, Math.round(svgSkin._svgImage.height));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx2d = canvas.getContext("2d");
        if (!ctx2d) {
          return null;
        }
        ctx2d.drawImage(svgSkin._svgImage, 0, 0, width, height);
        return canvas;
      }

      return null;
    }

    _isCanvasTileEmpty(tileCanvas) {
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
    }

    _createTilesetFromCanvas(tilesetNameInput, sourceCanvas, tileWidthInput, tileHeightInput) {
      if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height || typeof document === "undefined") {
        return false;
      }

      const tilesetName = this._toTilesetName(tilesetNameInput, "default");
      const tileWidth = this._toTileSize(tileWidthInput, 32);
      const tileHeight = this._toTileSize(tileHeightInput, 32);
      const columns = Math.floor(sourceCanvas.width / tileWidth);
      const rows = Math.floor(sourceCanvas.height / tileHeight);

      if (columns <= 0 || rows <= 0) {
        return false;
      }

      const tiles = new Map();
      let tileIndex = 1;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const tileCanvas = document.createElement("canvas");
          tileCanvas.width = tileWidth;
          tileCanvas.height = tileHeight;
          const tileCtx = tileCanvas.getContext("2d");
          if (!tileCtx) {
            continue;
          }

          tileCtx.clearRect(0, 0, tileWidth, tileHeight);
          tileCtx.drawImage(
            sourceCanvas,
            col * tileWidth,
            row * tileHeight,
            tileWidth,
            tileHeight,
            0,
            0,
            tileWidth,
            tileHeight
          );

          if (this._isCanvasTileEmpty(tileCanvas)) {
            continue;
          }

          const tileId = `${tileIndex}`;
          tiles.set(tileId, tileCanvas);
          tileIndex++;
        }
      }

      this._tilesets.set(tilesetName, {
        name: tilesetName,
        tileWidth,
        tileHeight,
        sourceWidth: sourceCanvas.width,
        sourceHeight: sourceCanvas.height,
        tiles
      });

      this._touchTilesets();
      return true;
    }

    _loadImageToCanvas(url) {
      if (typeof document === "undefined") {
        return Promise.resolve(null);
      }

      return new Promise(resolve => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          const width = Math.max(1, Math.round(image.naturalWidth || image.width));
          const height = Math.max(1, Math.round(image.naturalHeight || image.height));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx2d = canvas.getContext("2d");
          if (!ctx2d) {
            resolve(null);
            return;
          }
          ctx2d.drawImage(image, 0, 0, width, height);
          resolve(canvas);
        };
        image.onerror = () => resolve(null);
        image.src = url;
      });
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedTilemapBlocks.extensionId,
        name: translate("Tilemap"),
        color1: "#5f8f3f",
        blocks: [
          {
            opcode: "createTileWorld",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("create or update tile world [WORLD] map [MAP] tileset [TILESET]"),
            arguments: {
              WORLD: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "world",
                menu: "worldMenu"
              },
              MAP: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "main",
                menu: "mapMenu"
              },
              TILESET: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "default",
                menu: "tilesetMenu"
              }
            }
          },
          {
            opcode: "setTileWorldLayerMode",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set tile world [WORLD] layer [MODE]"),
            arguments: {
              WORLD: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "world",
                menu: "worldMenu"
              },
              MODE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "middle",
                menu: "layerMode"
              }
            }
          },
          {
            opcode: "deleteTileWorld",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("delete tile world [WORLD]"),
            arguments: {
              WORLD: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "world",
                menu: "worldMenu"
              }
            }
          },
          "---",
          {
            opcode: "createTilesetFromCostume",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("create tileset [TILESET] from costume [COSTUME] tile [TILE_W] x [TILE_H]"),
            arguments: {
              TILESET: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "default",
                menu: "tilesetMenu"
              },
              COSTUME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "_current_",
                menu: "costumeMenu"
              },
              TILE_W: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 32
              },
              TILE_H: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 32
              }
            }
          },
          {
            opcode: "createTilesetFromPng",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("create tileset [TILESET] from png [PNG] tile [TILE_W] x [TILE_H]"),
            arguments: {
              TILESET: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "default",
                menu: "tilesetMenu"
              },
              PNG: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: ""
              },
              TILE_W: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 32
              },
              TILE_H: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 32
              }
            }
          }
        ],
        menus: {
          worldMenu: {
            acceptReporters: true,
            items: "_getTileWorldMenu"
          },
          mapMenu: {
            acceptReporters: true,
            items: "_getTilemapMenu"
          },
          tilesetMenu: {
            acceptReporters: true,
            items: "_getTilesetMenu"
          },
          costumeMenu: {
            acceptReporters: true,
            items: "_getCostumeMenu"
          },
          layerMode: {
            acceptReporters: false,
            items: [
              {
                text: translate("between sprites"),
                value: "middle"
              },
              {
                text: translate("behind sprites"),
                value: "back"
              },
              {
                text: translate("in front of sprites"),
                value: "front"
              }
            ]
          }
        }
      };
    }

    openTilemapEditor() {
      this._openEditor(this._activeTilemapName || "main");
    }

    createTileWorld(args) {
      const world = this._getOrCreateTileWorld(args.WORLD);
      const mapName = this._toMapName(args.MAP);
      this._getTilemap(mapName, true);

      world.mapName = mapName;
      world.tilesetName = this._toTilesetName(args.TILESET, "");
      world.visible = true;
      world.dirty = true;

      this._ensureTileWorldDrawable(world);
      this._applyTileWorldOrder(world);
    }

    deleteTileWorld(args) {
      this._deleteTileWorld(args.WORLD);
    }

    setTileWorldMap(args) {
      const world = this._getOrCreateTileWorld(args.WORLD);
      const mapName = this._toMapName(args.MAP);
      this._getTilemap(mapName, true);
      world.mapName = mapName;
      world.dirty = true;
    }

    setTileWorldTileset(args) {
      const world = this._getOrCreateTileWorld(args.WORLD);
      world.tilesetName = this._toTilesetName(args.TILESET, "");
      world.dirty = true;
    }

    setTileWorldLayerMode(args) {
      const world = this._getOrCreateTileWorld(args.WORLD);
      const mode = Cast.toString(args.MODE).toLowerCase();
      if (mode === "front" || mode === "back" || mode === "middle") {
        world.layerMode = mode;
      }
      world.dirty = true;
      world.lastAppliedOrder = null;
    }

    setTileWorldOrder(args) {
      const world = this._getOrCreateTileWorld(args.WORLD);
      const order = this._toCellCoordinate(args.ORDER, 1);
      world.layerMode = "middle";
      world.order = Math.max(1, order);
      world.lastAppliedOrder = null;
      world.dirty = true;
    }

    setTileWorldVisible(args) {
      const world = this._getOrCreateTileWorld(args.WORLD);
      const visibleValue = Cast.toString(args.VISIBLE).toLowerCase();
      world.visible = !(visibleValue === "hide" || visibleValue === "false" || visibleValue === "0");
      world.dirty = true;
    }

    createTilesetFromCostume(args, util) {
      const costume = this._resolveCostume(args.COSTUME, util);
      if (!costume) {
        return;
      }

      const renderer = this.runtime && this.runtime.renderer;
      if (!renderer || !renderer._allSkins) {
        return;
      }

      const skin = renderer._allSkins[costume.skinId];
      const canvas = this._skinToCanvas(skin);
      if (!canvas) {
        return;
      }

      this._createTilesetFromCanvas(args.TILESET, canvas, args.TILE_W, args.TILE_H);
    }

    async createTilesetFromPng(args) {
      const png = Cast.toString(args.PNG).trim();
      if (png === "") {
        return;
      }

      const canvas = await this._loadImageToCanvas(png);
      if (!canvas) {
        return;
      }

      this._createTilesetFromCanvas(args.TILESET, canvas, args.TILE_W, args.TILE_H);
    }

    tilesetTileIds(args) {
      const name = this._toTilesetName(args.TILESET, "");
      const tileset = this._tilesets.get(name);
      if (!tileset || !tileset.tiles) {
        return [];
      }
      return Array.from(tileset.tiles.keys());
    }

    createTilemap(args) {
      const mapName = this._toMapName(args.MAP);
      this._createTilemap(mapName, args.TILE_W, args.TILE_H);
      this._activeTilemapName = mapName;
    }

    setActiveTilemap(args) {
      const mapName = this._toMapName(args.MAP);
      if (!this._tilemaps.has(mapName)) {
        this._createTilemap(mapName, 32, 32);
      }
      this._activeTilemapName = mapName;
    }

    deleteTilemap(args) {
      const mapName = this._toMapName(args.MAP);
      this._tilemaps.delete(mapName);
      this._removeTilemapRevision(mapName);
      this._syncActiveTilemap();

      for (const world of this._tileWorlds.values()) {
        if (world.mapName === mapName) {
          world.mapName = this._activeTilemapName;
          world.dirty = true;
        }
      }
    }

    clearTilemap(args) {
      const tilemap = this._getTilemap(args.MAP, false);
      if (!tilemap) {
        return;
      }

      for (const layer of tilemap.layers.values()) {
        layer.clear();
      }
      this._touchTilemap(args.MAP);
    }

    setTileSize(args) {
      const tilemap = this._getTilemap(args.MAP, true);
      tilemap.tileWidth = this._toTileSize(args.TILE_W, tilemap.tileWidth);
      tilemap.tileHeight = this._toTileSize(args.TILE_H, tilemap.tileHeight);
      this._touchTilemap(args.MAP);
    }

    setCell(args) {
      this._setCell(args.MAP, args.LAYER, args.X, args.Y, args.TILE);
    }

    eraseCell(args) {
      const tilemap = this._getTilemap(args.MAP, false);
      if (!tilemap) {
        return;
      }

      const layer = this._getLayer(tilemap, args.LAYER, false);
      if (!layer) {
        return;
      }

      const x = this._toCellCoordinate(args.X, 0);
      const y = this._toCellCoordinate(args.Y, 0);
      layer.delete(this._cellKey(x, y));
      this._touchTilemap(args.MAP);
    }

    fillRectangle(args) {
      const tilemap = this._getTilemap(args.MAP, true);
      const layer = this._getLayer(tilemap, args.LAYER, true);
      const startX = this._toCellCoordinate(args.X, 0);
      const startY = this._toCellCoordinate(args.Y, 0);
      const rawWidth = this._toCellCoordinate(args.W, 1);
      const rawHeight = this._toCellCoordinate(args.H, 1);

      if (rawWidth === 0 || rawHeight === 0) {
        return;
      }

      const tile = Cast.toString(args.TILE);
      const stepX = rawWidth < 0 ? -1 : 1;
      const stepY = rawHeight < 0 ? -1 : 1;
      const width = Math.abs(rawWidth);
      const height = Math.abs(rawHeight);

      for (let ix = 0; ix < width; ix++) {
        for (let iy = 0; iy < height; iy++) {
          const x = startX + (ix * stepX);
          const y = startY + (iy * stepY);
          const key = this._cellKey(x, y);
          if (tile === "") {
            layer.delete(key);
          } else {
            layer.set(key, tile);
          }
        }
      }
      this._touchTilemap(args.MAP);
    }

    getCell(args) {
      const tilemap = this._getTilemap(args.MAP, false);
      if (!tilemap) {
        return "";
      }

      const layer = this._getLayer(tilemap, args.LAYER, false);
      if (!layer) {
        return "";
      }

      const x = this._toCellCoordinate(args.X, 0);
      const y = this._toCellCoordinate(args.Y, 0);
      return layer.get(this._cellKey(x, y)) || "";
    }

    hasCell(args) {
      const tilemap = this._getTilemap(args.MAP, false);
      if (!tilemap) {
        return false;
      }

      const layer = this._getLayer(tilemap, args.LAYER, false);
      if (!layer) {
        return false;
      }

      const x = this._toCellCoordinate(args.X, 0);
      const y = this._toCellCoordinate(args.Y, 0);
      return layer.has(this._cellKey(x, y));
    }

    getUsedCells(args) {
      const tilemap = this._getTilemap(args.MAP, false);
      if (!tilemap) {
        return [];
      }

      const layer = this._getLayer(tilemap, args.LAYER, false);
      if (!layer) {
        return [];
      }

      const cells = [];
      for (const key of layer.keys()) {
        cells.push(this._cellFromKey(key));
      }
      return cells;
    }

    getLayerNames(args) {
      const tilemap = this._getTilemap(args.MAP, false);
      if (!tilemap) {
        return [];
      }
      return Array.from(tilemap.layers.keys());
    }

    localToMapX(args) {
      const tilemap = this._getTilemap(args.MAP, false);
      const tileWidth = tilemap ? tilemap.tileWidth : 32;
      const localX = this._toFiniteNumber(args.LOCAL_X, 0);
      return this._floorDiv(localX, tileWidth);
    }

    localToMapY(args) {
      const tilemap = this._getTilemap(args.MAP, false);
      const tileHeight = tilemap ? tilemap.tileHeight : 32;
      const localY = this._toFiniteNumber(args.LOCAL_Y, 0);
      return this._floorDiv(localY, tileHeight);
    }

    mapToLocalX(args) {
      const tilemap = this._getTilemap(args.MAP, false);
      const tileWidth = tilemap ? tilemap.tileWidth : 32;
      const mapX = this._toCellCoordinate(args.MAP_X, 0);
      return (mapX * tileWidth) + (tileWidth / 2);
    }

    mapToLocalY(args) {
      const tilemap = this._getTilemap(args.MAP, false);
      const tileHeight = tilemap ? tilemap.tileHeight : 32;
      const mapY = this._toCellCoordinate(args.MAP_Y, 0);
      return (mapY * tileHeight) + (tileHeight / 2);
    }

    getTileWidth(args) {
      const tilemap = this._getTilemap(args.MAP, false);
      return tilemap ? tilemap.tileWidth : 32;
    }

    getTileHeight(args) {
      const tilemap = this._getTilemap(args.MAP, false);
      return tilemap ? tilemap.tileHeight : 32;
    }

    serializeTilemap(args) {
      const tilemap = this._getTilemap(args.MAP, false);
      if (!tilemap) {
        return '{"tileWidth":32,"tileHeight":32,"layers":{}}';
      }

      const layers = {};
      for (const [layerName, cells] of tilemap.layers.entries()) {
        const serializedCells = [];
        for (const [cellKey, tile] of cells.entries()) {
          const [x, y] = this._cellFromKey(cellKey);
          serializedCells.push([x, y, tile]);
        }
        layers[layerName] = serializedCells;
      }

      return JSON.stringify({
        tileWidth: tilemap.tileWidth,
        tileHeight: tilemap.tileHeight,
        layers
      });
    }

    loadTilemapFromJson(args) {
      const mapName = this._toMapName(args.MAP);
      const rawJson = Cast.toString(args.JSON);
      if (rawJson === "") {
        return;
      }

      let parsed = null;
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        return;
      }

      if (!parsed || typeof parsed !== "object") {
        return;
      }

      const tilemap = {
        tileWidth: this._toTileSize(parsed.tileWidth, 32),
        tileHeight: this._toTileSize(parsed.tileHeight, 32),
        layers: new Map()
      };

      if (parsed.layers && typeof parsed.layers === "object") {
        for (const layerName of Object.keys(parsed.layers)) {
          const layerCells = parsed.layers[layerName];
          if (!Array.isArray(layerCells)) {
            continue;
          }

          const nextLayer = new Map();
          for (const cell of layerCells) {
            if (!Array.isArray(cell) || cell.length < 3) {
              continue;
            }

            const x = this._toCellCoordinate(cell[0], 0);
            const y = this._toCellCoordinate(cell[1], 0);
            const tile = Cast.toString(cell[2]);
            if (tile === "") {
              continue;
            }

            nextLayer.set(this._cellKey(x, y), tile);
          }

          tilemap.layers.set(this._toLayerName(layerName), nextLayer);
        }
      }

      if (tilemap.layers.size === 0) {
        tilemap.layers.set("0", new Map());
      }

      this._tilemaps.set(mapName, tilemap);
      this._activeTilemapName = mapName;
      this._touchTilemap(mapName);
    }
  }

  Scratch.extensions.register(new UnsandboxedTilemapBlocks());
})(Scratch);