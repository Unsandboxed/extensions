const {
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
} = require("./maps");

const {
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
} = require("./sets");

const editorCssModule = require("./editor.css");
const editorCssText = typeof editorCssModule === "string" ?
  editorCssModule :
  (editorCssModule && typeof editorCssModule.default === "string" ? editorCssModule.default : "");

const openTilemapEditorTab = (ctx, options) => {
  const {
    mapName,
    Cast,
    Scratch,
    extensionId,
    onMapsChanged,
    activate
  } = options;

  if (typeof document === "undefined") return;

  const editorTabsApi = ctx._getEditorTabApi ? ctx._getEditorTabApi() : null;
  if (!editorTabsApi) {
    return;
  }

  const tabId = `${extensionId}-tilemap-editor`;
  editorTabsApi.open({
    id: tabId,
    title: "Tilemaps",
    activate: activate !== false,
    html: "<div data-tilemap-editor-root='1'></div>"
  });

  const modal = editorTabsApi.getBodyElement(tabId);
  if (!modal) return;

  if (modal.getAttribute("data-usb-tilemap-mounted") === "1") {
    return;
  }
  modal.setAttribute("data-usb-tilemap-mounted", "1");

  const color = (value, fallback) => value && value.length ? value : fallback;

  const readThemePalette = () => {
    const nextThemeMetrics = typeof editorTabsApi.getThemeMetrics === "function" ? editorTabsApi.getThemeMetrics() : null;
    const nextColors = nextThemeMetrics && nextThemeMetrics.colors ? nextThemeMetrics.colors : {};
    return {
      themeMetrics: nextThemeMetrics,
      modalBackground: color(nextColors.modalBackground, "#ffffff"),
      modalForeground: color(nextColors.modalForeground, "#1f2937"),
      panelBackground: color(nextColors.uiSecondary, nextThemeMetrics && nextThemeMetrics.isDark ? "#1f2937" : "#f8fafc"),
      panelBorder: color(nextColors.blackTransparent, "rgba(0,0,0,0.16)"),
      muted: color(nextColors.textPrimaryTransparent, nextThemeMetrics && nextThemeMetrics.isDark ? "rgba(229,231,235,0.7)" : "rgba(31,41,55,0.68)"),
      accent: color(nextColors.warningPrimary, "#3f7f38"),
      accentSecondary: color(nextColors.successPrimary, "#0f766e"),
      danger: color(nextColors.errorPrimary, "#b91c1c")
    };
  };

  let themeMetrics = null;
  let modalBackground = "#ffffff";
  let modalForeground = "#1f2937";
  let panelBackground = "#f8fafc";
  let panelBorder = "rgba(0,0,0,0.16)";
  let muted = "rgba(31,41,55,0.68)";
  let accent = "#3f7f38";
  let accentSecondary = "#0f766e";
  let danger = "#b91c1c";

  const applyThemePalette = palette => {
    if (!palette) {
      return;
    }
    themeMetrics = palette.themeMetrics;
    modalBackground = palette.modalBackground;
    modalForeground = palette.modalForeground;
    panelBackground = palette.panelBackground;
    panelBorder = palette.panelBorder;
    muted = palette.muted;
    accent = palette.accent;
    accentSecondary = palette.accentSecondary;
    danger = palette.danger;
  };

  applyThemePalette(readThemePalette());

  modal.style.padding = "0";
  modal.style.background = modalBackground;
  modal.style.color = modalForeground;
  modal.style.fontFamily = '"Segoe UI", Tahoma, sans-serif';
  modal.style.overflow = "hidden";
  modal.style.height = "100%";

  modal.innerHTML = `
    <style>${editorCssText}</style>
    <div class="usb-tilemap-editor">
      <div class="usb-tilemap-tabs">
        <button type="button" class="usb-tilemap-tab" data-sidebar-tab="maps">Maps</button>
        <button type="button" class="usb-tilemap-tab" data-sidebar-tab="sets">Sets</button>
      </div>
      <div class="usb-tilemap-subtabs" data-mode-panel="sets">
        <button type="button" class="usb-tilemap-subtab" data-sets-subtab="catalog">Catalog</button>
        <button type="button" class="usb-tilemap-subtab" data-sets-subtab="compose">Compose</button>
        <button type="button" class="usb-tilemap-subtab" data-sets-subtab="rules">Rules</button>
        <button type="button" class="usb-tilemap-subtab" data-sets-subtab="tile">Tile</button>
      </div>
      <section class="usb-tilemap-topbar" data-mode-panel="maps">
        <div class="usb-tilemap-group">
          <label>Map
            <select data-map-select="1"></select>
          </label>
          <button data-map-new="1" class="usb-tilemap-btn usb-tilemap-btn-secondary">New</button>
          <button data-map-duplicate="1" class="usb-tilemap-btn">Duplicate</button>
          <button data-map-delete="1" class="usb-tilemap-btn usb-tilemap-btn-danger">Delete</button>
        </div>
        <div class="usb-tilemap-group usb-tilemap-top-status">
          <span data-status-main="1"></span>
          <span data-status-hover="1"></span>
        </div>
      </section>
      <div class="usb-tilemap-layout">
        <aside class="usb-tilemap-sidebar">
          <section class="usb-tilemap-card" data-sidebar-panel="maps" data-maps-card="layers">
            <h3>Layers</h3>
            <label>Active layer
              <select data-layer-select="1"></select>
            </label>
            <div class="usb-tilemap-row">
              <button data-layer-add="1" class="usb-tilemap-btn usb-tilemap-btn-secondary">Add Layer</button>
              <button data-layer-remove="1" class="usb-tilemap-btn usb-tilemap-btn-danger">Remove Layer</button>
            </div>
            <button data-layer-clear="1" class="usb-tilemap-btn">Clear Layer</button>
          </section>
          <section class="usb-tilemap-card" data-sidebar-panel="maps" data-maps-card="brush">
            <h3>Brush</h3>
            <div class="usb-tilemap-brushes">
              <button data-brush="paint" class="usb-tilemap-brush-btn">Paint</button>
              <button data-brush="line" class="usb-tilemap-brush-btn">Line</button>
              <button data-brush="rect" class="usb-tilemap-brush-btn">Rect</button>
              <button data-brush="bucket" class="usb-tilemap-brush-btn">Bucket</button>
              <button data-brush="picker" class="usb-tilemap-brush-btn">Picker</button>
            </div>
            <div class="usb-tilemap-row">
              <label class="usb-tilemap-inline-check"><input data-eraser-toggle="1" type="checkbox"> Eraser</label>
              <label class="usb-tilemap-inline-check"><input data-fill-contiguous="1" type="checkbox" checked> Contiguous</label>
            </div>
            <div class="usb-tilemap-row">
              <label class="usb-tilemap-inline-check"><input data-randomize="1" type="checkbox" checked> Random tile</label>
              <label>Scattering %
                <input data-scattering="1" type="number" min="0" max="100" step="1" value="0">
              </label>
            </div>
            <label>Tile ID
              <input data-tile-id="1" type="text" value="grass">
            </label>
            <button data-tile-apply="1" class="usb-tilemap-btn">Set Current Tile</button>
            <label>Connected Rule
              <select data-connected-rule-select="1"></select>
            </label>
            <div data-tile-palette="1" class="usb-tilemap-palette"></div>
          </section>
          <section class="usb-tilemap-card" data-sidebar-panel="sets" data-sets-subsection="catalog">
            <h3>Tileset</h3>
            <p class="usb-tilemap-help">Create/select a tileset and choose how incoming art is split.</p>
            <label>Active tileset
              <select data-tileset-select="1"></select>
            </label>
            <div class="usb-tilemap-row">
              <button data-tileset-new="1" class="usb-tilemap-btn usb-tilemap-btn-secondary">New Empty</button>
              <button data-tileset-delete="1" class="usb-tilemap-btn usb-tilemap-btn-danger">Delete</button>
            </div>
            <div class="usb-tilemap-row">
              <label>Tile W
                <input data-tileset-tile-width="1" type="number" min="1" step="1" value="32">
              </label>
              <label>Tile H
                <input data-tileset-tile-height="1" type="number" min="1" step="1" value="32">
              </label>
            </div>
            <label>Split Mode
              <select data-tileset-split-mode="1">
                <option value="tile-size">By Tile Size</option>
                <option value="grid">By Grid (Cols x Rows)</option>
              </select>
            </label>
            <div class="usb-tilemap-row">
              <label>Columns
                <input data-tileset-split-columns="1" type="number" min="1" step="1" value="8">
              </label>
              <label>Rows
                <input data-tileset-split-rows="1" type="number" min="1" step="1" value="8">
              </label>
            </div>
            <label>Costume
              <select data-tileset-costume="1"></select>
            </label>
            <button data-tileset-import-costume="1" class="usb-tilemap-btn">Import From Costume</button>
            <input data-tileset-file="1" type="file" accept="image/*,.png" style="display:none">
            <button data-tileset-import-file="1" class="usb-tilemap-btn">Import From File</button>
          </section>

          <section class="usb-tilemap-card" data-sidebar-panel="sets" data-sets-subsection="compose">
            <h3>Groups</h3>
            <p class="usb-tilemap-help">Use Shift-drag in the tileset preview to rectangle-select tiles and create reusable groups.</p>
            <label>Group Name
              <input data-tileset-group-name="1" type="text" value="group1" placeholder="tree_3x3">
            </label>
            <div class="usb-tilemap-row">
              <button data-tileset-group-create="1" class="usb-tilemap-btn usb-tilemap-btn-secondary">Create Group From Shift-Selection</button>
              <button data-tileset-group-clear="1" class="usb-tilemap-btn">Clear Selection</button>
            </div>
          </section>

          <section class="usb-tilemap-card" data-sidebar-panel="sets" data-sets-subsection="rules">
            <h3>Connectivity</h3>
            <p class="usb-tilemap-help">Build connectivity from tags. Use tag mask hints like mask_0 ... mask_15 on tiles for precise variants.</p>
            <label>Connected Rule Name
              <input data-connected-rule-name="1" type="text" value="grass_auto" placeholder="grass_auto">
            </label>
            <label>Center Tag
              <select data-rules-center-tag="1"></select>
            </label>
            <div class="usb-tilemap-rules-grid-inputs">
              <input data-rules-neighbor-tag="nw" type="text" placeholder="NW tag (optional)">
              <input data-rules-neighbor-tag="n" type="text" placeholder="N tag (optional)">
              <input data-rules-neighbor-tag="ne" type="text" placeholder="NE tag (optional)">
              <input data-rules-neighbor-tag="w" type="text" placeholder="W tag (optional)">
              <div class="usb-tilemap-rules-center">Center</div>
              <input data-rules-neighbor-tag="e" type="text" placeholder="E tag (optional)">
              <input data-rules-neighbor-tag="sw" type="text" placeholder="SW tag (optional)">
              <input data-rules-neighbor-tag="s" type="text" placeholder="S tag (optional)">
              <input data-rules-neighbor-tag="se" type="text" placeholder="SE tag (optional)">
            </div>
            <div class="usb-tilemap-row">
              <button data-connected-rule-create="1" class="usb-tilemap-btn usb-tilemap-btn-secondary">Create From Shift-Selection</button>
              <button data-rules-apply-tag="1" class="usb-tilemap-btn">Create/Update From Tags</button>
            </div>
            <div class="usb-tilemap-row">
              <button data-connected-rule-delete="1" class="usb-tilemap-btn">Delete Connected Rule</button>
            </div>
            <h3>Used Tags In Map</h3>
            <p class="usb-tilemap-help">Click a tag to insert/remove it from the focused Rules field.</p>
            <div data-rules-used-tags="1" class="usb-tilemap-rules-used-tags"></div>
          </section>

          <section class="usb-tilemap-card" data-sidebar-panel="sets" data-sets-subsection="tile">
            <h3>Selected Tile</h3>
            <p class="usb-tilemap-help">Rename or remove the currently selected tile/group.</p>
            <label>Tags
              <input data-selected-tile-tags="1" type="text" placeholder="grass, walkable, outdoor">
            </label>
            <button data-selected-tile-tags-apply="1" class="usb-tilemap-btn">Apply Tags</button>
            <div class="usb-tilemap-row">
              <button data-tileset-rename-tile="1" class="usb-tilemap-btn">Rename Selected Tile</button>
              <button data-tileset-delete-tile="1" class="usb-tilemap-btn usb-tilemap-btn-danger">Delete Selected Tile</button>
            </div>
          </section>
        </aside>
        <section class="usb-tilemap-main usb-tilemap-main-subpanel" data-main-panel="sets" data-main-sets-subsection="catalog">
          <h3>Catalog</h3>
          <div class="usb-tilemap-sets-hint">Manage imported tilesets. Select one to make it active.</div>
          <div data-tileset-catalog-list="1" class="usb-tilemap-tileset-catalog usb-tilemap-tileset-catalog-main"></div>
        </section>
        <section class="usb-tilemap-main usb-tilemap-main-subpanel" data-main-panel="sets" data-main-sets-subsection="compose">
          <h3>Compose</h3>
          <div class="usb-tilemap-status">
            <span data-sets-status-main="1"></span>
            <span data-sets-status-selected="1"></span>
          </div>
          <div class="usb-tilemap-sets-hint">Click to select a tile. Shift-drag for rectangle selection when composing groups/rules.</div>
          <div class="usb-tilemap-canvas-wrap">
            <canvas data-tileset-preview-canvas="1" class="usb-tilemap-canvas" width="720" height="480"></canvas>
          </div>
        </section>
        <section class="usb-tilemap-main usb-tilemap-main-subpanel" data-main-panel="sets" data-main-sets-subsection="rules">
          <h3>Rules</h3>
          <div class="usb-tilemap-sets-hint">Center + neighbors preview for tag-driven connectivity behavior.</div>
          <div data-rules-preview="1" class="usb-tilemap-rules-preview usb-tilemap-rules-preview-main"></div>
        </section>
        <section class="usb-tilemap-main usb-tilemap-main-subpanel" data-main-panel="sets" data-main-sets-subsection="tile">
          <h3>Tile</h3>
          <div data-tileset-status="1" class="usb-tilemap-tileset-status"></div>
          <div data-tileset-grid="1" class="usb-tilemap-tileset-grid usb-tilemap-tileset-grid-main"></div>
        </section>
      </div>
      <div class="usb-tilemap-actions">
        <button data-cancel="1" class="usb-tilemap-btn">Close</button>
        <button data-save="1" class="usb-tilemap-btn usb-tilemap-btn-primary">Save Now</button>
      </div>
    </div>
  `;

  const liveThemeStyle = document.createElement("style");
  liveThemeStyle.setAttribute("data-usb-live-theme", "1");
  modal.appendChild(liveThemeStyle);

  const buildLiveThemeCss = () => `
    .usb-tilemap-editor {
      --usb-modal-background: ${modalBackground};
      --usb-modal-foreground: ${modalForeground};
      --usb-panel-background: ${panelBackground};
      --usb-panel-border: ${panelBorder};
      --usb-muted: ${muted};
      --usb-accent: ${accent};
      --usb-accent-secondary: ${accentSecondary};
      --usb-danger: ${danger};
    }
  `;

  let lastThemeSignature = "";
  const refreshLiveTheme = force => {
    const nextPalette = readThemePalette();
    const nextSignature = [
      nextPalette.modalBackground,
      nextPalette.modalForeground,
      nextPalette.panelBackground,
      nextPalette.panelBorder,
      nextPalette.muted,
      nextPalette.accent,
      nextPalette.accentSecondary,
      nextPalette.danger,
      nextPalette.themeMetrics && nextPalette.themeMetrics.isDark ? "dark" : "light"
    ].join("|");

    if (!force && nextSignature === lastThemeSignature) {
      return false;
    }

    applyThemePalette(nextPalette);
    modal.style.background = modalBackground;
    modal.style.color = modalForeground;
    liveThemeStyle.textContent = buildLiveThemeCss();
    lastThemeSignature = nextSignature;
    return true;
  };

  refreshLiveTheme(true);

  const mapSelect = modal.querySelector("[data-map-select='1']");
  const tileWidthInput = modal.querySelector("[data-map-tile-width='1']");
  const tileHeightInput = modal.querySelector("[data-map-tile-height='1']");
  const layerSelect = modal.querySelector("[data-layer-select='1']");
  const tileIdInput = modal.querySelector("[data-tile-id='1']");
  const eraserToggleInput = modal.querySelector("[data-eraser-toggle='1']");
  const fillContiguousInput = modal.querySelector("[data-fill-contiguous='1']");
  const randomizeInput = modal.querySelector("[data-randomize='1']");
  const scatteringInput = modal.querySelector("[data-scattering='1']");
  const connectedRuleSelect = modal.querySelector("[data-connected-rule-select='1']");
  const tilePalette = modal.querySelector("[data-tile-palette='1']");
  const tilesetSelect = modal.querySelector("[data-tileset-select='1']");
  const tilesetTileWidthInput = modal.querySelector("[data-tileset-tile-width='1']");
  const tilesetTileHeightInput = modal.querySelector("[data-tileset-tile-height='1']");
  const tilesetSplitModeInput = modal.querySelector("[data-tileset-split-mode='1']");
  const tilesetSplitColumnsInput = modal.querySelector("[data-tileset-split-columns='1']");
  const tilesetSplitRowsInput = modal.querySelector("[data-tileset-split-rows='1']");
  const tilesetCostumeSelect = modal.querySelector("[data-tileset-costume='1']");
  const tilesetFileInput = modal.querySelector("[data-tileset-file='1']");
  const tilesetCatalogList = modal.querySelector("[data-tileset-catalog-list='1']");
  const tilesetGroupNameInput = modal.querySelector("[data-tileset-group-name='1']");
  const tilesetGroupCreateBtn = modal.querySelector("[data-tileset-group-create='1']");
  const tilesetGroupClearBtn = modal.querySelector("[data-tileset-group-clear='1']");
  const connectedRuleNameInput = modal.querySelector("[data-connected-rule-name='1']");
  const rulesCenterTagSelect = modal.querySelector("[data-rules-center-tag='1']");
  const rulesNeighborTagInputs = Array.from(modal.querySelectorAll("[data-rules-neighbor-tag]"));
  const rulesUsedTags = modal.querySelector("[data-rules-used-tags='1']");
  const rulesPreview = modal.querySelector("[data-rules-preview='1']");
  const rulesApplyTagBtn = modal.querySelector("[data-rules-apply-tag='1']");
  const connectedRuleCreateBtn = modal.querySelector("[data-connected-rule-create='1']");
  const connectedRuleDeleteBtn = modal.querySelector("[data-connected-rule-delete='1']");
  const selectedTileTagsInput = modal.querySelector("[data-selected-tile-tags='1']");
  const selectedTileTagsApplyBtn = modal.querySelector("[data-selected-tile-tags-apply='1']");
  const tilesetRenameTileBtn = modal.querySelector("[data-tileset-rename-tile='1']");
  const tilesetDeleteTileBtn = modal.querySelector("[data-tileset-delete-tile='1']");
  const tilesetStatus = modal.querySelector("[data-tileset-status='1']");
  const tilesetGrid = modal.querySelector("[data-tileset-grid='1']");
  const statusMain = modal.querySelector("[data-status-main='1']");
  const statusHover = modal.querySelector("[data-status-hover='1']");
  const setsStatusMain = modal.querySelector("[data-sets-status-main='1']");
  const setsStatusSelected = modal.querySelector("[data-sets-status-selected='1']");
  const tilesetPreviewCanvas = modal.querySelector("[data-tileset-preview-canvas='1']");
  const editorRoot = modal.querySelector(".usb-tilemap-editor");
  const sidebarTabButtons = Array.from(modal.querySelectorAll("[data-sidebar-tab]"));
  const setsSubtabButtons = Array.from(modal.querySelectorAll("[data-sets-subtab]"));
  const sidebarPanels = Array.from(modal.querySelectorAll("[data-sidebar-panel]"));
  const modePanels = Array.from(modal.querySelectorAll("[data-mode-panel]"));
  const mainPanels = Array.from(modal.querySelectorAll("[data-main-panel]"));

  if (!mapSelect || !layerSelect || !tileIdInput || !eraserToggleInput || !fillContiguousInput || !randomizeInput || !scatteringInput || !connectedRuleSelect || !tilesetSelect || !tilesetTileWidthInput || !tilesetTileHeightInput || !tilesetSplitModeInput || !tilesetSplitColumnsInput || !tilesetSplitRowsInput || !tilesetCostumeSelect || !tilesetFileInput || !tilesetCatalogList || !tilesetGroupNameInput || !tilesetGroupCreateBtn || !tilesetGroupClearBtn || !connectedRuleNameInput || !rulesCenterTagSelect || !rulesUsedTags || !rulesPreview || !rulesApplyTagBtn || !connectedRuleCreateBtn || !connectedRuleDeleteBtn || !selectedTileTagsInput || !selectedTileTagsApplyBtn || !tilesetRenameTileBtn || !tilesetDeleteTileBtn || !tilesetStatus || !tilesetGrid || !statusMain || !statusHover || !setsStatusMain || !setsStatusSelected || !tilesetPreviewCanvas || !editorRoot || sidebarTabButtons.length < 2 || sidebarPanels.length < 2 || mainPanels.length < 1) {
    return;
  }

  const tilesetPreviewCtx = tilesetPreviewCanvas.getContext("2d");
  if (!tilesetPreviewCtx) {
    return;
  }

  const draftMaps = cloneAllTilemaps(ctx._tilemaps);
  const draftTilesets = cloneAllTilesets(ctx._tilesets);
  if (draftMaps.size === 0) {
    draftMaps.set("main", buildEmptyTilemap(ctx, 32, 32));
  }

  let activeMapName = Cast.toString(mapName || ctx._activeTilemapName || "main").trim();
  if (!draftMaps.has(activeMapName)) {
    const firstMap = draftMaps.keys().next();
    activeMapName = firstMap.done ? "main" : firstMap.value;
  }

  let activeLayerName = "0";
  let activeTilesetName = "";
  let activeConnectedRuleId = "";
  let selectedCostumeValue = "_current_";
  let tilesetStatusMessage = "";
  let isTilesetImportBusy = false;
  let selectedTileId = Cast.toString(tileIdInput.value || "grass").trim() || "grass";
  let brushMode = "paint";
  let isEraserMode = false;
  let dragAnchorCell = null;
  let dragTool = "";
  let dragErase = false;
  let dragPreviewCell = null;
  let autoSaveTimer = null;
  let lastAutoSaveAt = 0;
  let isClosing = false;
  let adaptivePreview = {
    cellSize: GRID_CELL_SIZE,
    viewWidth: DEFAULT_VIEW_WIDTH,
    viewHeight: DEFAULT_VIEW_HEIGHT,
    canvasWidth: BASE_PREVIEW_CANVAS_WIDTH,
    canvasHeight: BASE_PREVIEW_CANVAS_HEIGHT
  };
  let hoverCell = null;
  let hoverCellKey = "";
  let isPointerDown = false;
  let pointerCaptureTarget = null;
  let lastPointerDownAt = 0;
  let lastPaintKey = "";
  let gridDrawScheduled = false;
  let pendingPaletteRefreshAfterPaint = false;
  let sidebarMode = "maps";
  let setsSubsection = "catalog";
  let tilesetPreviewCells = [];
  let atlasSelectedCellKeys = new Set();
  let atlasShiftDrag = null;
  let atlasDragSelectionRect = null;
  let activeRuleField = "center";
  let activeRuleNeighborDirection = "";
  let nextGroupIndex = 1;

  const CARDINAL_MASK_BY_DIRECTION = {
    n: 1,
    e: 2,
    s: 4,
    w: 8
  };

  const RULE_DIRECTIONS = ["nw", "n", "ne", "w", "e", "sw", "s", "se"];

  const editorPreviewWorldName = `__${extensionId}_editor_preview__`;

  const brushButtons = Array.from(modal.querySelectorAll("[data-brush]"));
  let isStageInputAttached = false;
  let removeStageInputListeners = () => {};

  const refreshSidebarTabs = () => {
    editorRoot.setAttribute("data-sidebar-mode", sidebarMode);
    editorRoot.setAttribute("data-sets-subsection", setsSubsection);

    for (const button of sidebarTabButtons) {
      const tab = Cast.toString(button.getAttribute("data-sidebar-tab") || "maps").toLowerCase();
      button.setAttribute("data-active", tab === sidebarMode ? "true" : "false");
    }

    for (const panel of sidebarPanels) {
      const panelMode = Cast.toString(panel.getAttribute("data-sidebar-panel") || "maps").toLowerCase();
      if (panelMode !== sidebarMode) {
        panel.hidden = true;
        continue;
      }

      if (sidebarMode === "sets") {
        const panelSubsection = Cast.toString(panel.getAttribute("data-sets-subsection") || "catalog").toLowerCase();
        panel.hidden = panelSubsection !== setsSubsection;
      } else {
        panel.hidden = false;
      }
    }

    for (const panel of modePanels) {
      const panelMode = Cast.toString(panel.getAttribute("data-mode-panel") || "maps").toLowerCase();
      panel.hidden = panelMode !== sidebarMode;
    }

    for (const panel of mainPanels) {
      const panelMode = Cast.toString(panel.getAttribute("data-main-panel") || "maps").toLowerCase();
      if (panelMode !== sidebarMode) {
        panel.hidden = true;
        continue;
      }

      if (sidebarMode === "sets") {
        const panelSubsection = Cast.toString(panel.getAttribute("data-main-sets-subsection") || "catalog").toLowerCase();
        panel.hidden = panelSubsection !== setsSubsection;
      } else {
        panel.hidden = false;
      }
    }

    for (const button of setsSubtabButtons) {
      const tab = Cast.toString(button.getAttribute("data-sets-subtab") || "catalog").toLowerCase();
      button.setAttribute("data-active", tab === setsSubsection ? "true" : "false");
    }
  };

  const setSidebarMode = mode => {
    sidebarMode = Cast.toString(mode).toLowerCase() === "sets" ? "sets" : "maps";
    refreshSidebarTabs();

    if (sidebarMode === "sets") {
      refreshTilesetStatus();
      refreshSetsActionState();
      drawTilesetPreview();
      return;
    }

    drawGrid();
  };

  const setSetsSubsection = subsection => {
    const normalized = Cast.toString(subsection).toLowerCase();
    if (normalized === "compose" || normalized === "rules" || normalized === "tile") {
      setsSubsection = normalized;
    } else {
      setsSubsection = "catalog";
    }
    refreshSidebarTabs();

    if (sidebarMode === "sets") {
      refreshTilesetStatus();
      refreshRulesTagEditor();
      refreshSetsActionState();
      drawTilesetPreview();
    }
  };

  const scheduleDrawGrid = () => {
    if (gridDrawScheduled) {
      return;
    }

    gridDrawScheduled = true;
    const run = () => {
      gridDrawScheduled = false;
      drawGrid();
    };

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(run);
      return;
    }

    setTimeout(run, 0);
  };

  const getAdaptivePreviewMetrics = () => {
    const tilemap = getActiveMap();
    const tileWidth = Math.max(1, Math.round((tilemap && tilemap.tileWidth) || 32));
    const tileHeight = Math.max(1, Math.round((tilemap && tilemap.tileHeight) || 32));
    const stageWidth = Math.max(1, Math.round((ctx.runtime && ctx.runtime.stageWidth) || 480));
    const stageHeight = Math.max(1, Math.round((ctx.runtime && ctx.runtime.stageHeight) || 360));
    const viewWidth = clamp(Math.ceil(stageWidth / tileWidth) + 2, MIN_VIEW_WIDTH, MAX_VIEW_WIDTH);
    const viewHeight = clamp(Math.ceil(stageHeight / tileHeight) + 2, MIN_VIEW_HEIGHT, MAX_VIEW_HEIGHT);
    return {
      cellSize: GRID_CELL_SIZE,
      viewWidth,
      viewHeight,
      canvasWidth: stageWidth,
      canvasHeight: stageHeight
    };
  };

  const syncEditorPreviewWorld = () => {
    // Keep runtime map/tileset data pointed at the draft state so stage painting previews immediately.
    if (ctx._tilemaps !== draftMaps) {
      ctx._tilemaps = draftMaps;
    }
    if (ctx._tilesets !== draftTilesets) {
      ctx._tilesets = draftTilesets;
    }

    const resolvePreviewTilesetName = () => {
      const preferred = Cast.toString(activeTilesetName || "").trim();
      if (preferred !== "") {
        return preferred;
      }

      if (ctx._tileWorlds instanceof Map) {
        for (const existingWorld of ctx._tileWorlds.values()) {
          if (!existingWorld) {
            continue;
          }
          const sameMap = Cast.toString(existingWorld.mapName || "") === activeMapName;
          const tilesetName = Cast.toString(existingWorld.tilesetName || "").trim();
          if (sameMap && tilesetName !== "") {
            return tilesetName;
          }
        }
      }

      const firstTileset = draftTilesets.keys().next();
      return firstTileset.done ? "" : firstTileset.value;
    };

    const editorOverlayEnabled = sidebarMode === "maps" && isEditorTabActive();

    const applyEditorOverlayToWorld = world => {
      if (!world) {
        return;
      }

      const sameMap = Cast.toString(world.mapName || "") === activeMapName;
      const showOverlay = editorOverlayEnabled && sameMap;

      world.showGrid = showOverlay;
      world.gridOpacity = showOverlay ? 0.42 : 0.28;
      world.hoverMapX = showOverlay && hoverCell ? hoverCell.mapX : null;
      world.hoverMapY = showOverlay && hoverCell ? hoverCell.mapY : null;
      world.dragTool = showOverlay && isPointerDown ? dragTool : "";
      world.dragErase = showOverlay && isPointerDown ? !!dragErase : false;
      world.dragAnchorCell = showOverlay && isPointerDown && dragAnchorCell ? {
        mapX: dragAnchorCell.mapX,
        mapY: dragAnchorCell.mapY
      } : null;
      world.dragPreviewCell = showOverlay && isPointerDown && dragPreviewCell ? {
        mapX: dragPreviewCell.mapX,
        mapY: dragPreviewCell.mapY
      } : null;
      world.dirty = true;
    };

    if (typeof ctx._getOrCreateTileWorld !== "function") {
      return;
    }

    const world = ctx._getOrCreateTileWorld(editorPreviewWorldName);
    if (!world) {
      return;
    }

    world.mapName = activeMapName;
    world.tilesetName = resolvePreviewTilesetName();
    world.visible = true;
    world.layerMode = "front";
    world.order = 1;
    applyEditorOverlayToWorld(world);

    if (typeof ctx._ensureTileWorldDrawable === "function") {
      ctx._ensureTileWorldDrawable(world);
    }
    if (typeof ctx._applyTileWorldOrder === "function") {
      ctx._applyTileWorldOrder(world);
    }

    if (ctx._tileWorlds instanceof Map) {
      for (const existingWorld of ctx._tileWorlds.values()) {
        if (!existingWorld || existingWorld === world) {
          continue;
        }
        applyEditorOverlayToWorld(existingWorld);
      }
    }
  };

  const requestStagePreviewRefresh = () => {
    syncEditorPreviewWorld();
    if (typeof ctx._tickTileWorlds === "function") {
      ctx._tickTileWorlds();
    }
    if (ctx.runtime && typeof ctx.runtime.requestRedraw === "function") {
      ctx.runtime.requestRedraw();
    }
  };

  const commitDraftToRuntime = () => {
    const committed = new Map();
    for (const [name, tilemap] of draftMaps.entries()) {
      committed.set(name, cloneTilemap(tilemap));
    }

    const committedTilesets = new Map();
    for (const [name, tileset] of draftTilesets.entries()) {
      const clone = cloneTileset(tileset);
      clone.name = name;
      committedTilesets.set(name, clone);
    }

    ctx._tilemaps = committed;
    ctx._tilesets = committedTilesets;
    ctx._activeTilemapName = activeMapName;
    if (typeof ctx._syncActiveTilemap === "function") {
      ctx._syncActiveTilemap();
    }
    if (typeof ctx._touchTilesets === "function") {
      ctx._touchTilesets();
    }
    if (typeof onMapsChanged === "function") {
      onMapsChanged();
    }

    requestStagePreviewRefresh();
    lastAutoSaveAt = Date.now();
  };

  const flushAutoSave = () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    if (isClosing) {
      return;
    }
    commitDraftToRuntime();
  };

  const scheduleAutoSave = () => {
    if (isClosing) {
      return;
    }
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null;
      if (isClosing) {
        return;
      }
      commitDraftToRuntime();
    }, AUTO_SAVE_DEBOUNCE_MS);
  };

  const markDraftDirty = () => {
    scheduleAutoSave();
  };

  const getActiveMap = () => {
    if (!draftMaps.has(activeMapName)) {
      const firstMap = draftMaps.keys().next();
      if (!firstMap.done) {
        activeMapName = firstMap.value;
      }
    }
    return draftMaps.get(activeMapName) || null;
  };

  const ensureActiveLayer = () => {
    const tilemap = getActiveMap();
    if (!tilemap) {
      activeLayerName = "0";
      return;
    }

    if (!tilemap.layers.has(activeLayerName)) {
      const firstLayer = tilemap.layers.keys().next();
      activeLayerName = firstLayer.done ? "0" : firstLayer.value;
    }

    if (!tilemap.layers.has(activeLayerName)) {
      tilemap.layers.set(activeLayerName, new Map());
    }
  };

  const getActiveLayer = (createIfMissing = true) => {
    const tilemap = getActiveMap();
    if (!tilemap) return null;

    if (!tilemap.layers.has(activeLayerName) && createIfMissing) {
      tilemap.layers.set(activeLayerName, new Map());
    }

    return tilemap.layers.get(activeLayerName) || null;
  };

  const normalizeTilesetName = value => Cast.toString(value || "").trim();

  const tilesetNamesSorted = () => Array.from(draftTilesets.keys()).sort((a, b) => a.localeCompare(b));

  const ensureActiveTileset = () => {
    if (activeTilesetName === "") {
      return;
    }

    if (draftTilesets.has(activeTilesetName)) {
      return;
    }

    const first = tilesetNamesSorted()[0];
    activeTilesetName = first || "";
  };

  const getActiveTileset = () => {
    ensureActiveTileset();
    return activeTilesetName === "" ? null : (draftTilesets.get(activeTilesetName) || null);
  };

  const getActiveTilesetGroup = groupTileId => {
    const tileset = getActiveTileset();
    if (!tileset || !(tileset.groups instanceof Map)) {
      return null;
    }

    const key = `${groupTileId || ""}`;
    return tileset.groups.get(key) || null;
  };

  const getActiveTilesetTileMeta = tileId => {
    const tileset = getActiveTileset();
    if (!tileset || !(tileset.tileMetaById instanceof Map)) {
      return null;
    }
    const key = `${tileId || ""}`;
    const meta = tileset.tileMetaById.get(key) || null;
    if (!meta) {
      return null;
    }

    meta.tags = normalizeTileTags(meta.tags);
    tileset.tileMetaById.set(key, meta);
    return meta;
  };

  const refreshSelectedTileTagEditor = () => {
    const tileset = getActiveTileset();
    const tileId = Cast.toString(selectedTileId || "").trim();
    const isNormalTile = !!(tileset && tileset.tiles instanceof Map && tileId !== "" && tileset.tiles.has(tileId) && !isGroupTileId(tileId));

    selectedTileTagsInput.disabled = !isNormalTile;
    selectedTileTagsApplyBtn.disabled = !isNormalTile;

    if (!isNormalTile) {
      selectedTileTagsInput.value = "";
      selectedTileTagsInput.placeholder = isGroupTileId(tileId) ? "Groups do not have tags" : "Select a tile first";
      return;
    }

    const meta = getActiveTilesetTileMeta(tileId);
    selectedTileTagsInput.value = formatTileTags(meta && meta.tags);
    selectedTileTagsInput.placeholder = "grass, walkable, outdoor";
  };

  const buildGroupPreviewCanvas = (group, tileset) => {
    if (!group || !tileset || !(tileset.tiles instanceof Map) || typeof document === "undefined") {
      return null;
    }

    const safeTileWidth = Math.max(1, Math.round(tileset.tileWidth || 32));
    const safeTileHeight = Math.max(1, Math.round(tileset.tileHeight || 32));
    const groupWidth = Math.max(1, Math.round(group.width || 1));
    const groupHeight = Math.max(1, Math.round(group.height || 1));

    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = groupWidth * safeTileWidth;
    previewCanvas.height = groupHeight * safeTileHeight;

    const previewCtx = previewCanvas.getContext("2d");
    if (!previewCtx) {
      return null;
    }

    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    for (const cell of Array.isArray(group.cells) ? group.cells : []) {
      const dx = Math.trunc((cell && cell.dx) || 0);
      const dy = Math.trunc((cell && cell.dy) || 0);
      const tileId = `${(cell && cell.tileId) || ""}`;
      if (tileId === "") {
        continue;
      }

      const tileCanvas = tileset.tiles.get(tileId);
      if (!tileCanvas) {
        continue;
      }

      previewCtx.drawImage(tileCanvas, dx * safeTileWidth, dy * safeTileHeight, safeTileWidth, safeTileHeight);
    }

    return previewCanvas;
  };

  const getActiveTilesetTile = tileId => {
    const normalized = `${tileId || ""}`;
    const tileset = getActiveTileset();
    if (!tileset || !(tileset.tiles instanceof Map)) {
      return null;
    }

    if (isGroupTileId(normalized)) {
      const group = getActiveTilesetGroup(normalized);
      if (!group) {
        return null;
      }

      if (!group.previewCanvas) {
        group.previewCanvas = buildGroupPreviewCanvas(group, tileset);
      }
      return group.previewCanvas || null;
    }

    return tileset.tiles.get(normalized) || null;
  };

  const clearAtlasSelection = () => {
    atlasSelectedCellKeys = new Set();
    atlasDragSelectionRect = null;
  };

  const readSplitOptions = () => {
    const splitMode = Cast.toString(tilesetSplitModeInput.value || "tile-size").trim() === "grid" ? "grid" : "tile-size";
    const columns = Math.max(1, Math.round(Cast.toNumber(tilesetSplitColumnsInput.value || 1)));
    const rows = Math.max(1, Math.round(Cast.toNumber(tilesetSplitRowsInput.value || 1)));
    return {
      splitMode,
      columns,
      rows
    };
  };

  const refreshSplitInputs = () => {
    const split = readSplitOptions();
    tilesetSplitModeInput.value = split.splitMode;
    tilesetSplitColumnsInput.value = `${split.columns}`;
    tilesetSplitRowsInput.value = `${split.rows}`;

    const useGrid = split.splitMode === "grid";
    tilesetSplitColumnsInput.disabled = !useGrid;
    tilesetSplitRowsInput.disabled = !useGrid;
  };

  const refreshCatalogList = () => {
    tilesetCatalogList.innerHTML = "";
    const names = tilesetNamesSorted();
    if (names.length === 0) {
      const info = document.createElement("div");
      info.className = "usb-tilemap-help";
      info.textContent = "No imported tilesets yet.";
      tilesetCatalogList.appendChild(info);
      return;
    }

    for (const name of names) {
      const tileset = draftTilesets.get(name);
      if (!tileset) {
        continue;
      }

      const tileCount = tileset.tiles instanceof Map ? tileset.tiles.size : 0;
      const splitMode = Cast.toString((tileset && tileset.importSplitMode) || "tile-size");
      const splitText = splitMode === "grid" ? "Grid" : "Tile Size";

      const row = document.createElement("button");
      row.type = "button";
      row.className = "usb-tilemap-catalog-item";
      row.setAttribute("data-active", name === activeTilesetName ? "true" : "false");
      row.innerHTML = `
        <span class="usb-tilemap-catalog-name">${name}</span>
        <span class="usb-tilemap-catalog-meta">${tileset.atlasColumns || 0}x${tileset.atlasRows || 0} atlas | ${tileCount} tiles | ${splitText}</span>
      `;
      row.addEventListener("click", () => {
        activeTilesetName = name;
        tilesetStatusMessage = "";
        clearAtlasSelection();
        updateGroupNameSuggestion();
        refreshConnectedRuleSelect();
        refreshTilesetSizeInputs();
        refreshTilesetGrid();
        refreshPalette();
        syncEditorPreviewWorld();
        drawGrid();
      });
      row.addEventListener("dblclick", () => {
        setSetsSubsection("compose");
      });
      tilesetCatalogList.appendChild(row);
    }
  };

  const setButtonState = (button, enabled, titleWhenDisabled = "") => {
    if (!button) {
      return;
    }
    button.disabled = !enabled;
    button.title = enabled ? "" : titleWhenDisabled;
  };

  const refreshSetsActionState = () => {
    const tileset = getActiveTileset();
    const hasTileset = !!tileset;
    const selectionCount = atlasSelectedCellKeys.size;
    const hasSelection = selectionCount > 0;
    const hasCenterTag = normalizeTileTags([rulesCenterTagSelect.value])[0] !== "";
    const selectedNormalTile = !!(tileset && tileset.tiles instanceof Map && selectedTileId !== "" && tileset.tiles.has(selectedTileId) && !isGroupTileId(selectedTileId));

    setButtonState(tilesetGroupCreateBtn, hasTileset && hasSelection, "Shift-drag tiles in Compose first.");
    setButtonState(tilesetGroupClearBtn, hasSelection, "No active selection.");
    setButtonState(connectedRuleCreateBtn, hasTileset && hasSelection, "Shift-drag tiles in Compose first.");
    setButtonState(rulesApplyTagBtn, hasTileset && hasCenterTag, "Select a center tag first.");
    setButtonState(connectedRuleDeleteBtn, hasTileset && activeConnectedRuleId !== "", "Select a connected rule first.");
    setButtonState(tilesetRenameTileBtn, selectedNormalTile, "Select a non-group tile first.");
    setButtonState(tilesetDeleteTileBtn, selectedNormalTile, "Select a non-group tile first.");

    const groupLabelBase = "Create Group From Shift-Selection";
    const ruleLabelBase = "Create From Shift-Selection";
    tilesetGroupCreateBtn.textContent = hasSelection ? `${groupLabelBase} (${selectionCount})` : groupLabelBase;
    connectedRuleCreateBtn.textContent = hasSelection ? `${ruleLabelBase} (${selectionCount})` : ruleLabelBase;
  };

  const collectTilesetTags = tileset => {
    const seen = new Set();
    if (!tileset || !(tileset.tileMetaById instanceof Map)) {
      return [];
    }

    for (const meta of tileset.tileMetaById.values()) {
      const tags = normalizeTileTags(meta && meta.tags);
      for (const tag of tags) {
        seen.add(tag);
      }
    }

    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  };

  const collectMapUsedTags = () => {
    const tileset = getActiveTileset();
    const tilemap = getActiveMap();
    const usedTileIds = new Set();
    const usedTags = new Set();

    if (!tileset || !(tileset.tileMetaById instanceof Map) || !tilemap || !(tilemap.layers instanceof Map)) {
      return [];
    }

    const queueTileId = tileId => {
      const normalized = Cast.toString(tileId || "").trim();
      if (normalized === "") {
        return;
      }

      if (isGroupTileId(normalized)) {
        const group = getActiveTilesetGroup(normalized);
        if (group && Array.isArray(group.cells)) {
          for (const cell of group.cells) {
            queueTileId(cell && cell.tileId);
          }
        }
        return;
      }

      usedTileIds.add(normalized);
    };

    for (const layer of tilemap.layers.values()) {
      if (!(layer instanceof Map)) {
        continue;
      }
      for (const tileId of layer.values()) {
        queueTileId(tileId);
      }
    }

    for (const tileId of usedTileIds) {
      const meta = tileset.tileMetaById.get(tileId);
      if (!meta || meta.isEmpty) {
        continue;
      }
      const tags = normalizeTileTags(meta.tags);
      for (const tag of tags) {
        usedTags.add(tag);
      }
    }

    return Array.from(usedTags).sort((a, b) => a.localeCompare(b));
  };

  const getActiveRuleNeighborInput = () => {
    if (activeRuleField !== "neighbor" || activeRuleNeighborDirection === "") {
      return null;
    }
    return rulesNeighborTagInputs.find(input =>
      Cast.toString(input.getAttribute("data-rules-neighbor-tag") || "").toLowerCase() === activeRuleNeighborDirection
    ) || null;
  };

  const isTagActiveForFocusedRuleField = tag => {
    const normalized = normalizeTileTags([tag])[0] || "";
    if (normalized === "") {
      return false;
    }

    if (activeRuleField === "center") {
      return normalizeTileTags([rulesCenterTagSelect.value])[0] === normalized;
    }

    const input = getActiveRuleNeighborInput();
    if (!input) {
      return false;
    }

    return parseTileTagsInput(input.value).includes(normalized);
  };

  const renderRulesUsedTags = () => {
    const tags = collectMapUsedTags();
    rulesUsedTags.innerHTML = "";

    if (tags.length === 0) {
      const info = document.createElement("div");
      info.className = "usb-tilemap-help";
      info.textContent = "No tags are currently used by placed tiles in this map.";
      rulesUsedTags.appendChild(info);
      return;
    }

    for (const tag of tags) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "usb-tilemap-tag-chip";
      chip.textContent = tag;
      chip.setAttribute("data-active", isTagActiveForFocusedRuleField(tag) ? "true" : "false");
      chip.addEventListener("mousedown", event => {
        event.preventDefault();
      });
      chip.addEventListener("click", () => {
        applyUsedTagToFocusedRuleField(tag);
      });
      rulesUsedTags.appendChild(chip);
    }
  };

  const markActiveRuleInput = () => {
    const centerActive = activeRuleField === "center";
    rulesCenterTagSelect.setAttribute("data-active", centerActive ? "true" : "false");
    for (const input of rulesNeighborTagInputs) {
      const direction = Cast.toString(input.getAttribute("data-rules-neighbor-tag") || "").toLowerCase();
      input.setAttribute("data-active", activeRuleField === "neighbor" && direction === activeRuleNeighborDirection ? "true" : "false");
    }
    renderRulesUsedTags();
  };

  const applyUsedTagToFocusedRuleField = tag => {
    const normalized = normalizeTileTags([tag])[0] || "";
    if (normalized === "") {
      return;
    }

    if (activeRuleField === "neighbor") {
      const input = getActiveRuleNeighborInput();
      if (!input) {
        return;
      }
      const tags = parseTileTagsInput(input.value);
      const index = tags.indexOf(normalized);
      if (index >= 0) {
        tags.splice(index, 1);
      } else {
        tags.push(normalized);
      }
      input.value = formatTileTags(tags);
    } else {
      if (!Array.from(rulesCenterTagSelect.options).some(option => option.value === normalized)) {
        const option = document.createElement("option");
        option.value = normalized;
        option.textContent = normalized;
        rulesCenterTagSelect.appendChild(option);
      }
      rulesCenterTagSelect.value = normalizeTileTags([rulesCenterTagSelect.value])[0] === normalized ? "" : normalized;
    }

    renderRulesPreview(Cast.toString(rulesCenterTagSelect.value || ""));
    refreshSetsActionState();
    renderRulesUsedTags();
  };

  const getRulesNeighborTagMap = () => {
    const out = {};
    for (const input of rulesNeighborTagInputs) {
      const direction = Cast.toString(input.getAttribute("data-rules-neighbor-tag") || "").toLowerCase();
      if (!RULE_DIRECTIONS.includes(direction)) {
        continue;
      }
      out[direction] = normalizeTileTags([input.value])[0] || "";
    }
    return out;
  };

  const renderRulesPreview = centerTag => {
    const tags = getRulesNeighborTagMap();
    const valueFor = dir => {
      if (dir === "center") {
        return centerTag || "(center)";
      }
      return tags[dir] || "*";
    };

    rulesPreview.innerHTML = `
      <div class="usb-tilemap-rules-preview-grid">
        <div>${valueFor("nw")}</div><div>${valueFor("n")}</div><div>${valueFor("ne")}</div>
        <div>${valueFor("w")}</div><div class="usb-tilemap-rules-preview-center">${valueFor("center")}</div><div>${valueFor("e")}</div>
        <div>${valueFor("sw")}</div><div>${valueFor("s")}</div><div>${valueFor("se")}</div>
      </div>
    `;
  };

  const refreshRulesTagEditor = () => {
    const tileset = getActiveTileset();
    const tags = collectTilesetTags(tileset);
    const previous = Cast.toString(rulesCenterTagSelect.value || "");

    rulesCenterTagSelect.innerHTML = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = tags.length > 0 ? "(choose tag)" : "(no tags yet)";
    rulesCenterTagSelect.appendChild(emptyOption);

    for (const tag of tags) {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = tag;
      rulesCenterTagSelect.appendChild(option);
    }

    rulesCenterTagSelect.value = tags.includes(previous) ? previous : "";
    rulesCenterTagSelect.disabled = tags.length === 0;
    renderRulesPreview(Cast.toString(rulesCenterTagSelect.value || ""));
    renderRulesUsedTags();
    refreshSetsActionState();
  };

  const getAtlasRectSelection = (startCol, startRow, endCol, endRow, mode, baseSelection) => {
    const next = new Set(baseSelection || []);
    const tileset = getActiveTileset();
    if (!tileset || !(tileset.coordToTileId instanceof Map)) {
      return next;
    }

    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const atlasKey = `${col},${row}`;
        const tileId = tileset.coordToTileId.get(atlasKey);
        if (!tileId) {
          continue;
        }
        const meta = getActiveTilesetTileMeta(tileId);
        if (meta && meta.isEmpty) {
          continue;
        }
        if (mode === "remove") {
          next.delete(atlasKey);
        } else {
          next.add(atlasKey);
        }
      }
    }

    return next;
  };

  const updateGroupNameSuggestion = () => {
    const tileset = getActiveTileset();
    if (!tileset) {
      nextGroupIndex = 1;
      tilesetGroupNameInput.value = "group1";
      return;
    }

    if (!(tileset.groups instanceof Map)) {
      tileset.groups = new Map();
    }

    let candidate = nextGroupIndex;
    while (tileset.groups.has(makeGroupTileId(`group${candidate}`))) {
      candidate += 1;
    }

    nextGroupIndex = candidate;
    const current = Cast.toString(tilesetGroupNameInput.value).trim();
    if (current === "" || /^group\d+$/i.test(current)) {
      tilesetGroupNameInput.value = `group${nextGroupIndex}`;
    }
  };

  const getActiveConnectedRules = () => {
    const tileset = getActiveTileset();
    if (!tileset) {
      return null;
    }

    if (!(tileset.connectedRules instanceof Map)) {
      tileset.connectedRules = new Map();
    }
    return tileset.connectedRules;
  };

  const refreshConnectedRuleSelect = () => {
    const previous = activeConnectedRuleId;
    connectedRuleSelect.innerHTML = "";

    const offOption = document.createElement("option");
    offOption.value = "";
    offOption.textContent = "(off)";
    connectedRuleSelect.appendChild(offOption);

    const rules = getActiveConnectedRules();
    const ruleIds = rules ? Array.from(rules.keys()).sort((a, b) => connectedRuleNameFromId(a).localeCompare(connectedRuleNameFromId(b))) : [];
    for (const ruleId of ruleIds) {
      const option = document.createElement("option");
      option.value = ruleId;
      option.textContent = connectedRuleNameFromId(ruleId);
      connectedRuleSelect.appendChild(option);
    }

    if (previous !== "" && ruleIds.includes(previous)) {
      activeConnectedRuleId = previous;
    } else {
      activeConnectedRuleId = "";
    }

    connectedRuleSelect.value = activeConnectedRuleId;

    const currentRuleName = connectedRuleNameInput.value.trim();
    if (activeConnectedRuleId !== "" && (currentRuleName === "" || /^\w+_auto$/i.test(currentRuleName))) {
      connectedRuleNameInput.value = connectedRuleNameFromId(activeConnectedRuleId);
    }
  };

  const getActiveConnectedRule = () => {
    const rules = getActiveConnectedRules();
    if (!rules || activeConnectedRuleId === "") {
      return null;
    }

    return rules.get(activeConnectedRuleId) || null;
  };

  const buildConnectedRuleContext = () => {
    const rule = getActiveConnectedRule();
    if (!rule) {
      return null;
    }

    const normalized = normalizeConnectedRuleArrays(rule.maskToTileId, rule.maskVariantsByMask);
    rule.maskToTileId = normalized.maskToTileId;
    rule.maskVariantsByMask = normalized.maskVariantsByMask;

    const maskToTileId = normalized.maskToTileId;
    const maskVariantsByMask = normalized.maskVariantsByMask;

    let fallbackTileId = "";
    if (maskVariantsByMask[15] && maskVariantsByMask[15].length > 0) {
      fallbackTileId = maskVariantsByMask[15][0];
    }
    if (fallbackTileId === "") {
      for (let neighborCount = 4; neighborCount >= 0; neighborCount--) {
        for (let mask = 0; mask < CONNECT_MASK_COUNT; mask++) {
          if (popcount4(mask) !== neighborCount) {
            continue;
          }
          if (maskVariantsByMask[mask].length > 0) {
            fallbackTileId = maskVariantsByMask[mask][0];
            break;
          }
        }
        if (fallbackTileId !== "") {
          break;
        }
      }
    }

    if (fallbackTileId === "") {
      return null;
    }

    const familyTileIds = new Set();
    const candidateMasks = [];
    for (let mask = 0; mask < CONNECT_MASK_COUNT; mask++) {
      const variants = maskVariantsByMask[mask];
      if (!variants || variants.length === 0) {
        continue;
      }
      candidateMasks.push(mask);
      for (const tileId of variants) {
        familyTileIds.add(tileId);
      }
    }

    if (familyTileIds.size === 0) {
      return null;
    }

    const resolveVariantTileId = (mask, x, y) => {
      const normalizedMask = mask & 15;
      const exactVariants = maskVariantsByMask[normalizedMask] || [];
      if (exactVariants.length > 0) {
        return chooseDeterministicVariant(exactVariants, `${rule.id}:${normalizedMask}:${x},${y}`) || fallbackTileId;
      }

      if (candidateMasks.length > 0) {
        let bestMask = -1;
        let bestRank = null;
        let bestTieHash = Infinity;
        for (const candidateMask of candidateMasks) {
          const targetPop = popcount4(normalizedMask);
          const candidatePop = popcount4(candidateMask);
          const distance = hammingMaskDistance(normalizedMask, candidateMask);
          const missing = missingMaskBits(normalizedMask, candidateMask);
          const extra = extraMaskBits(normalizedMask, candidateMask);
          const connectivityDelta = Math.abs(targetPop - candidatePop);
          const rank = [distance, missing, extra, connectivityDelta, -candidatePop];
          const tieHash = hashString(`${rule.id}:${normalizedMask}:fallback:${candidateMask}`);

          let isBetter = false;
          if (!bestRank) {
            isBetter = true;
          } else {
            for (let i = 0; i < rank.length; i++) {
              if (rank[i] < bestRank[i]) {
                isBetter = true;
                break;
              }
              if (rank[i] > bestRank[i]) {
                break;
              }
            }
          }

          if (isBetter || (bestRank && rank.every((value, i) => value === bestRank[i]) && tieHash < bestTieHash)) {
            bestMask = candidateMask;
            bestRank = rank;
            bestTieHash = tieHash;
            continue;
          }
        }

        if (bestMask >= 0) {
          const bestVariants = maskVariantsByMask[bestMask] || [];
          const picked = chooseDeterministicVariant(bestVariants, `${rule.id}:nearest:${normalizedMask}:${x},${y}`);
          if (picked !== "") {
            return picked;
          }
        }
      }

      return fallbackTileId;
    };

    return {
      rule,
      maskToTileId,
      maskVariantsByMask,
      familyTileIds,
      fallbackTileId,
      resolveVariantTileId
    };
  };

  const applyConnectedVariantsAround = (layer, centerX, centerY, context) => {
    if (!layer || !context) {
      return;
    }

    const offsets = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];

    const isFamilyTile = tileId => context.familyTileIds.has(Cast.toString(tileId || "").trim());

    const computeMask = (x, y) => {
      let mask = 0;
      if (isFamilyTile(layer.get(toCellKey(x, y - 1)))) mask |= 1;
      if (isFamilyTile(layer.get(toCellKey(x + 1, y)))) mask |= 2;
      if (isFamilyTile(layer.get(toCellKey(x, y + 1)))) mask |= 4;
      if (isFamilyTile(layer.get(toCellKey(x - 1, y)))) mask |= 8;
      return mask;
    };

    for (const [dx, dy] of offsets) {
      const x = centerX + dx;
      const y = centerY + dy;
      const key = toCellKey(x, y);
      const currentTileId = Cast.toString(layer.get(key) || "").trim();
      if (!isFamilyTile(currentTileId)) {
        continue;
      }

      const mask = computeMask(x, y);
      const variantTileId = context.resolveVariantTileId(mask, x, y);
      if (variantTileId !== "") {
        layer.set(key, variantTileId);
      }
    }
  };

  const createConnectedRuleFromAtlasSelection = () => {
    const rules = getActiveConnectedRules();
    if (!rules) {
      return;
    }

    const selected = getAtlasSelectedCellsForGroup();
    if (selected.length === 0) {
      window.alert("Shift-click one or more non-empty atlas cells first.");
      return;
    }

    const normalizedName = normalizeConnectedRuleName(connectedRuleNameInput.value);
    if (normalizedName === "") {
      window.alert("Connected rule name cannot be empty.");
      return;
    }

    const ruleId = makeConnectedRuleId(normalizedName);
    if (rules.has(ruleId)) {
      const overwrite = window.confirm(`Connected rule \"${normalizedName}\" already exists. Replace it?`);
      if (!overwrite) {
        return;
      }
    }

    const sorted = selected.slice().sort((a, b) => {
      if (a.row !== b.row) {
        return a.row - b.row;
      }
      return a.col - b.col;
    });

    const maskToTileId = new Array(CONNECT_MASK_COUNT).fill("");
    const fallbackTileId = normalizeRuleTileId((sorted.find(cell => normalizeRuleTileId(cell.tileId) !== "") || {}).tileId);
    if (fallbackTileId === "") {
      window.alert("Selection did not contain any usable tiles.");
      return;
    }

    let maskVariantsByMask = createEmptyConnectedVariants();
    if (isLikelyLegacyMaskTemplateSelection(sorted)) {
      for (let i = 0; i < Math.min(CONNECT_MASK_COUNT, sorted.length); i++) {
        const tileId = normalizeRuleTileId(sorted[i].tileId);
        if (tileId === "") {
          continue;
        }
        maskToTileId[i] = tileId;
        addUniqueVariant(maskVariantsByMask[i], tileId);
      }
    } else {
      maskVariantsByMask = buildSpatialMaskVariantsFromSelection(sorted);

      // For irregular selections, only trust spatial mask inference.
      for (let i = 0; i < CONNECT_MASK_COUNT; i++) {
        const variants = Array.isArray(maskVariantsByMask[i]) ? maskVariantsByMask[i] : [];
        if (variants.length > 0) {
          maskToTileId[i] = normalizeRuleTileId(variants[0]);
        }
      }

      if (maskToTileId.every(tileId => tileId === "")) {
        maskToTileId[0] = fallbackTileId;
        addUniqueVariant(maskVariantsByMask[0], fallbackTileId);
      }
    }

    const normalizedRule = normalizeConnectedRuleArrays(maskToTileId, maskVariantsByMask);

    rules.set(ruleId, {
      id: ruleId,
      name: normalizedName,
      maskToTileId: normalizedRule.maskToTileId,
      maskVariantsByMask: normalizedRule.maskVariantsByMask
    });

    activeConnectedRuleId = ruleId;
    clearAtlasSelection();
    tilesetStatusMessage = `Created connected rule ${normalizedName}`;
    markDraftDirty();
    refreshConnectedRuleSelect();
    refreshTilesetStatus();
    drawTilesetPreview();
  };

  const deleteActiveConnectedRule = () => {
    const rules = getActiveConnectedRules();
    if (!rules || activeConnectedRuleId === "" || !rules.has(activeConnectedRuleId)) {
      return;
    }

    const ruleName = connectedRuleNameFromId(activeConnectedRuleId);
    const ok = window.confirm(`Delete connected rule \"${ruleName}\"?`);
    if (!ok) {
      return;
    }

    rules.delete(activeConnectedRuleId);
    activeConnectedRuleId = "";
    tilesetStatusMessage = `Deleted connected rule ${ruleName}`;
    markDraftDirty();
    refreshConnectedRuleSelect();
    refreshTilesetStatus();
  };

  const createOrUpdateConnectedRuleFromTags = () => {
    const tileset = getActiveTileset();
    const rules = getActiveConnectedRules();
    if (!tileset || !(tileset.tiles instanceof Map) || !rules) {
      return;
    }

    const normalizedName = normalizeConnectedRuleName(connectedRuleNameInput.value);
    if (normalizedName === "") {
      window.alert("Connected rule name cannot be empty.");
      return;
    }

    const centerTag = normalizeTileTags([rulesCenterTagSelect.value])[0] || "";
    if (centerTag === "") {
      window.alert("Choose a center tag first.");
      return;
    }

    const neighborTags = getRulesNeighborTagMap();
    const ruleId = makeConnectedRuleId(normalizedName);

    const byMask = createEmptyConnectedVariants();
    let matchedCount = 0;
    for (const [tileId, tileCanvas] of tileset.tiles.entries()) {
      if (!tileCanvas) {
        continue;
      }
      const meta = getActiveTilesetTileMeta(tileId);
      if (!meta || meta.isEmpty) {
        continue;
      }

      const tags = normalizeTileTags(meta.tags);
      if (!tags.includes(centerTag)) {
        continue;
      }

      matchedCount += 1;
      let addedToMask = false;
      for (const tag of tags) {
        const match = /^mask_(\d{1,2})$/i.exec(tag);
        if (!match) {
          continue;
        }
        const mask = clamp(Math.round(Cast.toNumber(match[1])), 0, CONNECT_MASK_COUNT - 1);
        byMask[mask].push(tileId);
        addedToMask = true;
      }

      if (!addedToMask) {
        byMask[15].push(tileId);
      }
    }

    if (matchedCount === 0) {
      window.alert(`No tiles in this tileset have tag \"${centerTag}\".`);
      return;
    }

    const requiredDirections = ["n", "e", "s", "w"].filter(dir => neighborTags[dir]);
    if (requiredDirections.length > 0) {
      for (let mask = 0; mask < CONNECT_MASK_COUNT; mask++) {
        for (const dir of requiredDirections) {
          if ((mask & CARDINAL_MASK_BY_DIRECTION[dir]) === 0) {
            byMask[mask] = [];
            break;
          }
        }
      }
    }

    const maskToTileId = byMask.map(variants => (Array.isArray(variants) && variants.length > 0 ? normalizeRuleTileId(variants[0]) : ""));
    const normalizedRule = normalizeConnectedRuleArrays(maskToTileId, byMask);

    rules.set(ruleId, {
      id: ruleId,
      name: normalizedName,
      centerTag,
      neighborTags,
      maskToTileId: normalizedRule.maskToTileId,
      maskVariantsByMask: normalizedRule.maskVariantsByMask
    });

    activeConnectedRuleId = ruleId;
    tilesetStatusMessage = `Updated rule ${normalizedName} from tags (${matchedCount} tiles)`;
    markDraftDirty();
    refreshConnectedRuleSelect();
    refreshTilesetStatus();
    drawTilesetPreview();
  };

  const getTilesetTileSizeFallback = () => {
    const tilemap = getActiveMap();
    return {
      tileWidth: tilemap ? tilemap.tileWidth : 32,
      tileHeight: tilemap ? tilemap.tileHeight : 32
    };
  };

  const refreshTilesetStatus = () => {
    const tileset = getActiveTileset();
    if (!tileset) {
      const noTilesetMessage = tilesetStatusMessage || "No tileset selected";
      tilesetStatus.textContent = noTilesetMessage;
      setsStatusMain.textContent = noTilesetMessage;
      setsStatusSelected.textContent = "Create/import a tileset, then click tiles in the workspace.";
      refreshSelectedTileTagEditor();
      refreshCatalogList();
      refreshRulesTagEditor();
      refreshSetsActionState();
      return;
    }

    const tileCount = tileset.tiles instanceof Map ? tileset.tiles.size : 0;
    const groupCount = tileset.groups instanceof Map ? tileset.groups.size : 0;
    const connectedRuleCount = tileset.connectedRules instanceof Map ? tileset.connectedRules.size : 0;
    const selectionCount = atlasSelectedCellKeys.size;
    const base = `Tileset ${activeTilesetName} | Tile ${tileset.tileWidth}x${tileset.tileHeight} | Tiles ${tileCount} | Groups ${groupCount} | Rules ${connectedRuleCount}`;
    tilesetStatus.textContent = tilesetStatusMessage ? `${base} | ${tilesetStatusMessage}` : base;

    const selectedExists = selectedTileId !== "" && (
      (tileset.tiles instanceof Map && tileset.tiles.has(selectedTileId)) ||
      (tileset.groups instanceof Map && tileset.groups.has(selectedTileId))
    );
    setsStatusMain.textContent = base;
    if (selectedExists) {
      const selectedText = isGroupTileId(selectedTileId) ? `Selected group: ${groupNameFromTileId(selectedTileId)}` : `Selected tile: ${selectedTileId}`;
      const selectionText = selectionCount > 0 ? ` | Shift-selection: ${selectionCount}` : "";
      setsStatusSelected.textContent = `${selectedText}${selectionText}`;
      refreshSelectedTileTagEditor();
      refreshCatalogList();
      refreshRulesTagEditor();
      refreshSetsActionState();
      return;
    }

    if (tileCount > 0) {
      setsStatusSelected.textContent = selectionCount > 0 ? `Selected tile: (none) | Shift-selection: ${selectionCount}` : "Selected tile: (none). Click a tile in the workspace to select it.";
      refreshSelectedTileTagEditor();
      refreshCatalogList();
      refreshRulesTagEditor();
      refreshSetsActionState();
      return;
    }

    setsStatusSelected.textContent = "No tiles available in this tileset yet.";
    refreshSelectedTileTagEditor();
    refreshCatalogList();
    refreshRulesTagEditor();
    refreshSetsActionState();
  };

  const drawTilesetPreview = () => {
    const ctx2d = tilesetPreviewCtx;
    const padding = 14;
    const fallbackPreviewWidth = 720;
    const fallbackCellSize = 58;

    tilesetPreviewCells = [];

    const tileset = getActiveTileset();
    if (!tileset || !(tileset.tiles instanceof Map)) {
      if (tilesetPreviewCanvas.width !== fallbackPreviewWidth) {
        tilesetPreviewCanvas.width = fallbackPreviewWidth;
      }
      if (tilesetPreviewCanvas.height !== 360) {
        tilesetPreviewCanvas.height = 360;
      }
      tilesetPreviewCanvas.style.width = `${tilesetPreviewCanvas.width}px`;
      tilesetPreviewCanvas.style.height = `${tilesetPreviewCanvas.height}px`;

      ctx2d.clearRect(0, 0, tilesetPreviewCanvas.width, tilesetPreviewCanvas.height);
      ctx2d.fillStyle = themeMetrics && themeMetrics.isDark ? "#171d28" : "#f8fafc";
      ctx2d.fillRect(0, 0, tilesetPreviewCanvas.width, tilesetPreviewCanvas.height);
      ctx2d.fillStyle = muted;
      ctx2d.font = "600 13px Segoe UI";
      ctx2d.fillText("Select or create a tileset to preview it.", 18, 30);
      return;
    }

    const hasAtlas = !!tileset.atlasCanvas && tileset.coordToTileId instanceof Map && tileset.atlasColumns > 0 && tileset.atlasRows > 0;
    if (hasAtlas) {
      const safeTileWidth = Math.max(1, Math.round(tileset.tileWidth || 32));
      const safeTileHeight = Math.max(1, Math.round(tileset.tileHeight || 32));
      const cellSize = Math.max(24, Math.min(64, Math.round(Math.max(safeTileWidth, safeTileHeight) * 1.5)));
      const previewWidth = Math.max(720, (tileset.atlasColumns * cellSize) + (padding * 2));
      const previewHeight = Math.max(360, (tileset.atlasRows * cellSize) + (padding * 2));

      if (tilesetPreviewCanvas.width !== previewWidth) {
        tilesetPreviewCanvas.width = previewWidth;
      }
      if (tilesetPreviewCanvas.height !== previewHeight) {
        tilesetPreviewCanvas.height = previewHeight;
      }
      tilesetPreviewCanvas.style.width = `${tilesetPreviewCanvas.width}px`;
      tilesetPreviewCanvas.style.height = `${tilesetPreviewCanvas.height}px`;

      ctx2d.clearRect(0, 0, tilesetPreviewCanvas.width, tilesetPreviewCanvas.height);
      ctx2d.fillStyle = themeMetrics && themeMetrics.isDark ? "#171d28" : "#f8fafc";
      ctx2d.fillRect(0, 0, tilesetPreviewCanvas.width, tilesetPreviewCanvas.height);

      if (tileset.atlasCanvas) {
        ctx2d.globalAlpha = 0.22;
        ctx2d.imageSmoothingEnabled = false;
        ctx2d.drawImage(
          tileset.atlasCanvas,
          0,
          0,
          tileset.atlasCanvas.width,
          tileset.atlasCanvas.height,
          padding,
          padding,
          tileset.atlasColumns * cellSize,
          tileset.atlasRows * cellSize
        );
        ctx2d.globalAlpha = 1;
      }

      for (let row = 0; row < tileset.atlasRows; row++) {
        for (let col = 0; col < tileset.atlasColumns; col++) {
          const atlasKey = `${col},${row}`;
          const tileId = tileset.coordToTileId.get(atlasKey) || "";
          const tileCanvas = tileId === "" ? null : (tileset.tiles.get(tileId) || null);
          const meta = tileId === "" ? null : getActiveTilesetTileMeta(tileId);
          const isWhitespaceCell = tileId === "" || !!(meta && meta.isEmpty);

          const x = padding + (col * cellSize);
          const y = padding + (row * cellSize);
          const selectedByShift = atlasSelectedCellKeys.has(atlasKey);
          const selectedByCurrent = tileId !== "" && tileId === selectedTileId;

          ctx2d.fillStyle = themeMetrics && themeMetrics.isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)";
          ctx2d.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

          if (tileCanvas) {
            ctx2d.imageSmoothingEnabled = false;
            ctx2d.drawImage(tileCanvas, x + 2, y + 2, cellSize - 4, cellSize - 4);
          }

          if (isWhitespaceCell) {
            ctx2d.strokeStyle = themeMetrics && themeMetrics.isDark ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.25)";
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(x + 4, y + 4);
            ctx2d.lineTo(x + cellSize - 4, y + cellSize - 4);
            ctx2d.moveTo(x + cellSize - 4, y + 4);
            ctx2d.lineTo(x + 4, y + cellSize - 4);
            ctx2d.stroke();
          }

          ctx2d.strokeStyle = selectedByCurrent ? accent : (selectedByShift ? accentSecondary : (themeMetrics && themeMetrics.isDark ? "rgba(255,255,255,0.12)" : "rgba(31,41,55,0.18)"));
          ctx2d.lineWidth = selectedByCurrent ? 2 : (selectedByShift ? 2 : 1);
          ctx2d.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

          tilesetPreviewCells.push({
            tileId,
            atlasKey,
            col,
            row,
            x,
            y,
            width: cellSize,
            height: cellSize,
            isEmpty: isWhitespaceCell
          });
        }
      }

      if (atlasDragSelectionRect) {
        const minCol = Math.min(atlasDragSelectionRect.startCol, atlasDragSelectionRect.endCol);
        const maxCol = Math.max(atlasDragSelectionRect.startCol, atlasDragSelectionRect.endCol);
        const minRow = Math.min(atlasDragSelectionRect.startRow, atlasDragSelectionRect.endRow);
        const maxRow = Math.max(atlasDragSelectionRect.startRow, atlasDragSelectionRect.endRow);
        const x = padding + (minCol * cellSize);
        const y = padding + (minRow * cellSize);
        const w = ((maxCol - minCol) + 1) * cellSize;
        const h = ((maxRow - minRow) + 1) * cellSize;

        ctx2d.fillStyle = "rgba(15,118,110,0.16)";
        ctx2d.fillRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2));
        ctx2d.strokeStyle = accentSecondary;
        ctx2d.lineWidth = 2;
        ctx2d.strokeRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2));
      }

      return;
    }

    const tileIds = Array.from(tileset.tiles.keys()).sort((a, b) => a.localeCompare(b));
    const cols = Math.max(1, Math.floor((fallbackPreviewWidth - (padding * 2)) / fallbackCellSize));
    const rows = Math.max(1, Math.ceil(tileIds.length / cols));
    const previewHeight = Math.max(360, (rows * fallbackCellSize) + (padding * 2));

    if (tilesetPreviewCanvas.width !== fallbackPreviewWidth) {
      tilesetPreviewCanvas.width = fallbackPreviewWidth;
    }
    if (tilesetPreviewCanvas.height !== previewHeight) {
      tilesetPreviewCanvas.height = previewHeight;
    }
    tilesetPreviewCanvas.style.width = `${tilesetPreviewCanvas.width}px`;
    tilesetPreviewCanvas.style.height = `${tilesetPreviewCanvas.height}px`;

    ctx2d.clearRect(0, 0, tilesetPreviewCanvas.width, tilesetPreviewCanvas.height);
    ctx2d.fillStyle = themeMetrics && themeMetrics.isDark ? "#171d28" : "#f8fafc";
    ctx2d.fillRect(0, 0, tilesetPreviewCanvas.width, tilesetPreviewCanvas.height);

    if (tileIds.length === 0) {
      ctx2d.fillStyle = muted;
      ctx2d.font = "600 13px Segoe UI";
      ctx2d.fillText("This tileset has no tiles yet.", 18, 30);
      return;
    }

    for (let i = 0; i < tileIds.length; i++) {
      const tileId = tileIds[i];
      const tileCanvas = tileset.tiles.get(tileId);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padding + (col * fallbackCellSize);
      const y = padding + (row * fallbackCellSize);

      const isSelected = tileId === selectedTileId;
      ctx2d.fillStyle = themeMetrics && themeMetrics.isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)";
      ctx2d.fillRect(x, y, fallbackCellSize - 6, fallbackCellSize - 6);

      ctx2d.strokeStyle = isSelected ? accent : (themeMetrics && themeMetrics.isDark ? "rgba(255,255,255,0.2)" : "rgba(31,41,55,0.25)");
      ctx2d.lineWidth = isSelected ? 2 : 1;
      ctx2d.strokeRect(x + 0.5, y + 0.5, fallbackCellSize - 7, fallbackCellSize - 7);

      if (tileCanvas) {
        const drawSize = fallbackCellSize - 26;
        ctx2d.drawImage(tileCanvas, x + 8, y + 8, drawSize, drawSize);
      }

      ctx2d.fillStyle = modalForeground;
      ctx2d.font = "600 10px Segoe UI";
      ctx2d.textAlign = "left";
      ctx2d.textBaseline = "alphabetic";
      ctx2d.fillText(tileId.slice(0, 10), x + 6, y + (fallbackCellSize - 10), fallbackCellSize - 12);

      tilesetPreviewCells.push({
        tileId,
        atlasKey: "",
        col,
        row,
        x,
        y,
        width: fallbackCellSize - 6,
        height: fallbackCellSize - 6,
        isEmpty: false
      });
    }
  };

  const resolveTilesetPreviewCellFromEvent = event => {
    const rect = tilesetPreviewCanvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;

    for (const cell of tilesetPreviewCells) {
      const withinX = px >= cell.x && px <= (cell.x + cell.width);
      const withinY = py >= cell.y && py <= (cell.y + cell.height);
      if (withinX && withinY) {
        return cell;
      }
    }

    return null;
  };

  const refreshTilesetSelect = () => {
    const previous = activeTilesetName;
    tilesetSelect.innerHTML = "";

    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = "(none)";
    tilesetSelect.appendChild(noneOption);

    const names = tilesetNamesSorted();
    for (const name of names) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      tilesetSelect.appendChild(option);
    }

    if (previous === "") {
      activeTilesetName = "";
    } else if (names.includes(previous)) {
      activeTilesetName = previous;
    } else {
      activeTilesetName = names[0] || "";
    }

    tilesetSelect.value = activeTilesetName;

    const selectedTileset = getActiveTileset();
    if (selectedTileset) {
      tilesetSplitModeInput.value = Cast.toString(selectedTileset.importSplitMode || "tile-size") === "grid" ? "grid" : "tile-size";
      tilesetSplitColumnsInput.value = `${Math.max(1, Math.round((selectedTileset.importSplitColumns || selectedTileset.atlasColumns || 1)))}`;
      tilesetSplitRowsInput.value = `${Math.max(1, Math.round((selectedTileset.importSplitRows || selectedTileset.atlasRows || 1)))}`;
    }
    refreshSplitInputs();

    clearAtlasSelection();
    updateGroupNameSuggestion();
    refreshConnectedRuleSelect();
    refreshCatalogList();
    refreshRulesTagEditor();
    refreshTilesetStatus();
  };

  const refreshTilesetSizeInputs = () => {
    const tileset = getActiveTileset();
    if (tileset) {
      tilesetTileWidthInput.value = `${tileset.tileWidth}`;
      tilesetTileHeightInput.value = `${tileset.tileHeight}`;
      return;
    }

    const fallback = getTilesetTileSizeFallback();
    tilesetTileWidthInput.value = `${fallback.tileWidth}`;
    tilesetTileHeightInput.value = `${fallback.tileHeight}`;
  };

  const refreshCostumeSelect = () => {
    tilesetCostumeSelect.innerHTML = "";

    const items = typeof ctx._getCostumeMenu === "function" ? ctx._getCostumeMenu() : [{text: "current costume", value: "_current_"}];
    for (const item of items) {
      const option = document.createElement("option");
      option.value = Cast.toString(item.value);
      option.textContent = Cast.toString(item.text);
      tilesetCostumeSelect.appendChild(option);
    }

    const availableValues = items.map(item => Cast.toString(item.value));
    if (!availableValues.includes(selectedCostumeValue)) {
      selectedCostumeValue = availableValues.includes("_current_") ? "_current_" : (availableValues[0] || "");
    }
    tilesetCostumeSelect.value = selectedCostumeValue;
  };

  const refreshTilesetGrid = () => {
    tilesetGrid.innerHTML = "";
    const tileset = getActiveTileset();
    if (!tileset || !(tileset.tiles instanceof Map) || tileset.tiles.size === 0) {
      const info = document.createElement("div");
      info.textContent = "No tiles in tileset";
      info.style.fontSize = "11px";
      info.style.color = muted;
      tilesetGrid.appendChild(info);
      refreshTilesetStatus();
      drawTilesetPreview();
      return;
    }

    const groupIds = tileset.groups instanceof Map ? Array.from(tileset.groups.keys()).sort((a, b) => a.localeCompare(b)) : [];
    const baseTileIds = Array.from(tileset.tiles.keys())
      .filter(tileId => {
        const meta = getActiveTilesetTileMeta(tileId);
        return !(meta && meta.isEmpty);
      })
      .sort((a, b) => a.localeCompare(b));

    const tileIds = groupIds.concat(baseTileIds).slice(0, TILESET_PREVIEW_LIMIT);
    for (const tileId of tileIds) {
      const tileCanvas = getActiveTilesetTile(tileId);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "usb-tilemap-tileset-item";
      button.setAttribute("data-active", tileId === selectedTileId ? "true" : "false");

      const preview = document.createElement("canvas");
      preview.width = Math.max(1, tileset.tileWidth || 1);
      preview.height = Math.max(1, tileset.tileHeight || 1);
      const previewCtx = preview.getContext("2d");
      if (previewCtx) {
        previewCtx.clearRect(0, 0, preview.width, preview.height);
        if (tileCanvas) {
          previewCtx.drawImage(tileCanvas, 0, 0, preview.width, preview.height);
        }
      }

      const label = document.createElement("span");
      label.className = "usb-tilemap-tileset-label";
      label.textContent = isGroupTileId(tileId) ? `grp:${groupNameFromTileId(tileId)}` : tileId;

      button.appendChild(preview);
      button.appendChild(label);
      button.addEventListener("click", () => {
        selectedTileId = tileId;
        tileIdInput.value = selectedTileId;
        refreshTilesetGrid();
        refreshPalette();
        drawTilesetPreview();
      });
      tilesetGrid.appendChild(button);
    }

    refreshTilesetStatus();
    drawTilesetPreview();
  };

  const collectPaletteTileIds = () => {
    const tilemap = getActiveMap();
    const out = new Set(tilemap ? collectTileIds(tilemap) : []);

    const tileset = getActiveTileset();
    if (tileset && tileset.tiles instanceof Map) {
      for (const tileId of tileset.tiles.keys()) {
        const meta = getActiveTilesetTileMeta(tileId);
        if (meta && meta.isEmpty) {
          continue;
        }
        out.add(tileId);
      }

      if (tileset.groups instanceof Map) {
        for (const groupId of tileset.groups.keys()) {
          out.add(groupId);
        }
      }
    }

    if (selectedTileId) {
      out.add(selectedTileId);
    }

    return Array.from(out).sort((a, b) => {
      const aIsGroup = isGroupTileId(a);
      const bIsGroup = isGroupTileId(b);
      if (aIsGroup !== bIsGroup) {
        return aIsGroup ? -1 : 1;
      }
      return a.localeCompare(b);
    });
  };

  const resolveTilesetTargetName = () => {
    if (activeTilesetName !== "") {
      return activeTilesetName;
    }

    const enteredName = window.prompt("Tileset name", "default");
    if (enteredName === null) {
      return "";
    }

    const normalized = normalizeTilesetName(enteredName);
    if (normalized === "") {
      window.alert("Tileset name cannot be empty.");
      return "";
    }

    return normalized;
  };

  const upsertTilesetFromCanvas = (tilesetNameInput, sourceCanvas) => {
    const tilesetName = normalizeTilesetName(tilesetNameInput);
    if (tilesetName === "") {
      return false;
    }

    const tileWidth = ctx._toTileSize(tilesetTileWidthInput.value, 32);
    const tileHeight = ctx._toTileSize(tilesetTileHeightInput.value, 32);
    const splitOptions = readSplitOptions();
    const sliced = createTilesetFromCanvas(sourceCanvas, tileWidth, tileHeight, splitOptions);
    if (!sliced) {
      return false;
    }

    draftTilesets.set(tilesetName, {
      name: tilesetName,
      tileWidth: sliced.tileWidth,
      tileHeight: sliced.tileHeight,
      sourceWidth: sliced.sourceWidth,
      sourceHeight: sliced.sourceHeight,
      atlasColumns: sliced.atlasColumns,
      atlasRows: sliced.atlasRows,
      atlasCanvas: sliced.atlasCanvas,
      importSplitMode: splitOptions.splitMode,
      importSplitColumns: splitOptions.columns,
      importSplitRows: splitOptions.rows,
      tiles: sliced.tiles,
      tileMetaById: sliced.tileMetaById,
      coordToTileId: sliced.coordToTileId,
      groups: new Map(),
      connectedRules: new Map()
    });

    const importedTileset = draftTilesets.get(tilesetName);
    const firstVisibleTileId = importedTileset && importedTileset.tiles instanceof Map ?
      Array.from(importedTileset.tiles.keys()).find(tileId => {
        const meta = importedTileset.tileMetaById instanceof Map ? importedTileset.tileMetaById.get(tileId) : null;
        return !(meta && meta.isEmpty);
      }) : "";

    selectedTileId = firstVisibleTileId || "";
    tileIdInput.value = selectedTileId;
    activeTilesetName = tilesetName;
    clearAtlasSelection();

    const nonEmptyCount = sliced.tileMetaById instanceof Map ?
      Array.from(sliced.tileMetaById.values()).filter(meta => !(meta && meta.isEmpty)).length :
      sliced.tiles.size;
    tilesetStatusMessage = `Imported atlas ${sliced.atlasColumns}x${sliced.atlasRows} (${nonEmptyCount} non-empty)`;

    markDraftDirty();
    refreshTilesetSelect();
    refreshTilesetSizeInputs();
    refreshTilesetGrid();
    refreshPalette();
    syncEditorPreviewWorld();
    drawGrid();
    return true;
  };

  const getAtlasSelectedCellsForGroup = () => {
    const tileset = getActiveTileset();
    if (!tileset || !(tileset.coordToTileId instanceof Map) || !(tileset.tileMetaById instanceof Map)) {
      return [];
    }

    const selected = [];
    for (const atlasKey of atlasSelectedCellKeys) {
      const tileId = tileset.coordToTileId.get(atlasKey);
      if (!tileId) {
        continue;
      }

      const meta = tileset.tileMetaById.get(tileId);
      if (!meta || meta.isEmpty) {
        continue;
      }

      selected.push({
        atlasKey,
        tileId,
        col: meta.col,
        row: meta.row
      });
    }

    return selected;
  };

  const createGroupFromAtlasSelection = () => {
    const tileset = getActiveTileset();
    if (!tileset || !(tileset.groups instanceof Map)) {
      return;
    }

    const selected = getAtlasSelectedCellsForGroup();
    if (selected.length === 0) {
      window.alert("Shift-click one or more non-empty atlas cells first.");
      return;
    }

    const rawName = normalizeGroupName(tilesetGroupNameInput.value);
    if (rawName === "") {
      window.alert("Group name cannot be empty.");
      return;
    }

    const groupId = makeGroupTileId(rawName);
    if (tileset.groups.has(groupId)) {
      const overwrite = window.confirm(`Group "${rawName}" already exists. Replace it?`);
      if (!overwrite) {
        return;
      }
    }

    const minCol = Math.min(...selected.map(cell => cell.col));
    const minRow = Math.min(...selected.map(cell => cell.row));
    const maxCol = Math.max(...selected.map(cell => cell.col));
    const maxRow = Math.max(...selected.map(cell => cell.row));

    const cells = selected.map(cell => ({
      dx: cell.col - minCol,
      dy: cell.row - minRow,
      tileId: cell.tileId
    }));

    const group = {
      id: groupId,
      name: rawName,
      width: (maxCol - minCol) + 1,
      height: (maxRow - minRow) + 1,
      cells,
      previewCanvas: null
    };
    group.previewCanvas = buildGroupPreviewCanvas(group, tileset);

    tileset.groups.set(groupId, group);
    clearAtlasSelection();
    selectedTileId = groupId;
    tileIdInput.value = selectedTileId;
    tilesetStatusMessage = `Created group ${rawName} (${cells.length} tiles)`;

    nextGroupIndex += 1;
    markDraftDirty();
    updateGroupNameSuggestion();
    refreshTilesetGrid();
    refreshPalette();
    drawGrid();
  };

  const setTilesetImportBusy = isBusy => {
    isTilesetImportBusy = isBusy;

    const importCostumeBtn = modal.querySelector("[data-tileset-import-costume='1']");
    const importFileBtn = modal.querySelector("[data-tileset-import-file='1']");
    if (importCostumeBtn) {
      importCostumeBtn.disabled = isBusy;
    }
    if (importFileBtn) {
      importFileBtn.disabled = isBusy;
    }
    tilesetFileInput.disabled = isBusy;
    tilesetSplitModeInput.disabled = isBusy;
    tilesetSplitColumnsInput.disabled = isBusy || Cast.toString(tilesetSplitModeInput.value || "") !== "grid";
    tilesetSplitRowsInput.disabled = isBusy || Cast.toString(tilesetSplitModeInput.value || "") !== "grid";
  };

  const mapNamesSorted = () => Array.from(draftMaps.keys()).sort((a, b) => a.localeCompare(b));

  const refreshMapSelect = () => {
    const previous = activeMapName;
    mapSelect.innerHTML = "";

    const names = mapNamesSorted();
    for (const name of names) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      mapSelect.appendChild(option);
    }

    if (names.length === 0) {
      activeMapName = "main";
      draftMaps.set(activeMapName, buildEmptyTilemap(ctx, 32, 32));
      return refreshMapSelect();
    }

    if (names.includes(previous)) {
      activeMapName = previous;
    } else {
      activeMapName = names[0];
    }

    mapSelect.value = activeMapName;
  };

  const refreshLayerSelect = () => {
    const tilemap = getActiveMap();
    if (!tilemap) return;

    ensureActiveLayer();

    const previous = activeLayerName;
    layerSelect.innerHTML = "";

    const layerNames = Array.from(tilemap.layers.keys()).sort((a, b) => a.localeCompare(b));
    for (const layerName of layerNames) {
      const option = document.createElement("option");
      option.value = layerName;
      option.textContent = layerName;
      layerSelect.appendChild(option);
    }

    if (layerNames.includes(previous)) {
      activeLayerName = previous;
    } else {
      activeLayerName = layerNames[0] || "0";
    }

    layerSelect.value = activeLayerName;
  };

  const refreshTileSizeInputs = () => {
    const tilemap = getActiveMap();
    if (!tilemap || !tileWidthInput || !tileHeightInput) return;

    tileWidthInput.value = `${tilemap.tileWidth}`;
    tileHeightInput.value = `${tilemap.tileHeight}`;
  };

  const refreshBrushButtons = () => {
    for (const button of brushButtons) {
      const mode = button.getAttribute("data-brush");
      button.setAttribute("data-active", mode === brushMode ? "true" : "false");
    }
    if (eraserToggleInput) {
      eraserToggleInput.checked = isEraserMode;
    }
  };

  const getPaintCandidateTileIds = () => {
    const out = [];
    const seen = new Set();

    const tileset = getActiveTileset();
    if (tileset && tileset.coordToTileId instanceof Map && tileset.tileMetaById instanceof Map && atlasSelectedCellKeys.size > 0) {
      for (const atlasKey of atlasSelectedCellKeys) {
        const tileId = Cast.toString(tileset.coordToTileId.get(atlasKey) || "").trim();
        if (tileId === "") {
          continue;
        }
        const meta = tileset.tileMetaById.get(tileId);
        if (meta && meta.isEmpty) {
          continue;
        }
        if (!seen.has(tileId)) {
          seen.add(tileId);
          out.push(tileId);
        }
      }
    }

    const normalizedSelected = Cast.toString(selectedTileId || "").trim();
    if (out.length === 0 && normalizedSelected !== "") {
      out.push(normalizedSelected);
    }

    return out;
  };

  const maybeSkipByScattering = () => {
    const scattering = clamp(Math.round(Cast.toNumber(scatteringInput.value)), 0, 100);
    if (scattering <= 0) {
      return false;
    }
    return Math.random() * 100 < scattering;
  };

  const chooseTileForPaint = candidates => {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return "";
    }
    if (!randomizeInput.checked || candidates.length === 1) {
      return candidates[0];
    }
    const index = Math.floor(Math.random() * candidates.length);
    return candidates[index];
  };

  const refreshPalette = () => {
    tilePalette.innerHTML = "";
    const tileIds = collectPaletteTileIds();
    const limited = tileIds.slice(0, TILE_SWATCH_LIMIT);

    if (limited.length === 0) {
      const info = document.createElement("div");
      info.textContent = "No tiles yet";
      info.style.fontSize = "11px";
      info.style.color = muted;
      tilePalette.appendChild(info);
      return;
    }

    for (const tileId of limited) {
      const chip = document.createElement("button");
      chip.className = "usb-tilemap-chip";
      chip.type = "button";
      chip.setAttribute("data-active", tileId === selectedTileId ? "true" : "false");

      const swatch = document.createElement("span");
      swatch.className = "usb-tilemap-chip-swatch";

      const tileCanvas = getActiveTilesetTile(tileId);
      if (tileCanvas) {
        const previewCanvas = document.createElement("canvas");
        previewCanvas.width = 40;
        previewCanvas.height = 40;
        previewCanvas.style.width = "40px";
        previewCanvas.style.height = "40px";
        previewCanvas.style.borderRadius = "6px";
        previewCanvas.style.border = "1px solid rgba(0,0,0,0.25)";
        previewCanvas.style.imageRendering = "pixelated";
        const previewCtx = previewCanvas.getContext("2d");
        if (previewCtx) {
          previewCtx.clearRect(0, 0, 40, 40);
          previewCtx.drawImage(tileCanvas, 0, 0, 40, 40);
        }
        chip.appendChild(previewCanvas);
      } else {
        swatch.style.background = tileColorFromId(tileId);
        chip.appendChild(swatch);
      }

      const label = document.createElement("span");
      label.textContent = isGroupTileId(tileId) ? `grp:${groupNameFromTileId(tileId)}` : tileId;
      chip.appendChild(label);

      chip.addEventListener("click", () => {
        selectedTileId = tileId;
        tileIdInput.value = selectedTileId;
        refreshTilesetGrid();
        refreshPalette();
      });
      tilePalette.appendChild(chip);
    }
  };

  const toCellKey = (x, y) => ctx._cellKey(x, y);

  const getCellAt = (x, y) => {
    const layer = getActiveLayer(false);
    if (!layer) return "";
    return layer.get(toCellKey(x, y)) || "";
  };

  const setCellAt = (x, y, tileId) => {
    const layer = getActiveLayer(true);
    if (!layer) return;

    const key = toCellKey(x, y);
    const normalized = Cast.toString(tileId).trim();
    if (normalized === "") {
      layer.delete(key);
      markDraftDirty();
      return;
    }

    if (isGroupTileId(normalized)) {
      const group = getActiveTilesetGroup(normalized);
      if (group && Array.isArray(group.cells) && group.cells.length > 0) {
        for (const cell of group.cells) {
          const dx = Math.trunc((cell && cell.dx) || 0);
          const dy = Math.trunc((cell && cell.dy) || 0);
          const groupTileId = Cast.toString((cell && cell.tileId) || "").trim();
          if (groupTileId === "") {
            continue;
          }
          layer.set(toCellKey(x + dx, y + dy), groupTileId);
        }
        markDraftDirty();
        return;
      }
    }

    layer.set(key, normalized);
    markDraftDirty();
  };

  const collectLineCells = (startCell, endCell) => {
    if (!startCell || !endCell) {
      return [];
    }

    let x0 = Math.trunc(startCell.mapX);
    let y0 = Math.trunc(startCell.mapY);
    const x1 = Math.trunc(endCell.mapX);
    const y1 = Math.trunc(endCell.mapY);
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
  };

  const collectRectCells = (startCell, endCell) => {
    if (!startCell || !endCell) {
      return [];
    }

    const minX = Math.min(startCell.mapX, endCell.mapX);
    const maxX = Math.max(startCell.mapX, endCell.mapX);
    const minY = Math.min(startCell.mapY, endCell.mapY);
    const maxY = Math.max(startCell.mapY, endCell.mapY);
    const cells = [];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        cells.push({mapX: x, mapY: y});
      }
    }
    return cells;
  };

  const collectBucketCells = startCell => {
    if (!startCell) {
      return [];
    }

    const layer = getActiveLayer(true);
    if (!layer) {
      return [];
    }

    const contiguous = !!fillContiguousInput.checked;
    const readTile = (x, y) => Cast.toString(layer.get(toCellKey(x, y)) || "").trim();
    const startTileId = readTile(startCell.mapX, startCell.mapY);

    if (contiguous) {
      const limitX = Math.max(8, adaptivePreview.viewWidth * 2);
      const limitY = Math.max(8, adaptivePreview.viewHeight * 2);
      const minX = startCell.mapX - limitX;
      const maxX = startCell.mapX + limitX;
      const minY = startCell.mapY - limitY;
      const maxY = startCell.mapY + limitY;
      const maxCells = 12000;

      const queue = [[startCell.mapX, startCell.mapY]];
      const visited = new Set();
      const out = [];
      while (queue.length > 0 && out.length < maxCells) {
        const [x, y] = queue.shift();
        const key = toCellKey(x, y);
        if (visited.has(key)) {
          continue;
        }
        visited.add(key);

        if (x < minX || x > maxX || y < minY || y > maxY) {
          continue;
        }
        if (readTile(x, y) !== startTileId) {
          continue;
        }

        out.push({mapX: x, mapY: y});
        queue.push([x + 1, y]);
        queue.push([x - 1, y]);
        queue.push([x, y + 1]);
        queue.push([x, y - 1]);
      }
      return out;
    }

    if (startTileId !== "") {
      const out = [];
      for (const [key, tileId] of layer.entries()) {
        if (Cast.toString(tileId).trim() !== startTileId) {
          continue;
        }
        const [x, y] = ctx._cellFromKey ? ctx._cellFromKey(key) : key.split(",").map(v => Math.trunc(Cast.toNumber(v)));
        out.push({mapX: x, mapY: y});
      }
      return out;
    }

    const usedCells = Array.from(layer.keys()).map(key => {
      if (ctx._cellFromKey) {
        const [x, y] = ctx._cellFromKey(key);
        return {x, y};
      }
      const split = key.split(",");
      return {x: Math.trunc(Cast.toNumber(split[0])), y: Math.trunc(Cast.toNumber(split[1]))};
    });

    let minX = startCell.mapX - Math.floor(adaptivePreview.viewWidth / 2);
    let maxX = startCell.mapX + Math.floor(adaptivePreview.viewWidth / 2);
    let minY = startCell.mapY - Math.floor(adaptivePreview.viewHeight / 2);
    let maxY = startCell.mapY + Math.floor(adaptivePreview.viewHeight / 2);

    for (const cell of usedCells) {
      minX = Math.min(minX, cell.x);
      maxX = Math.max(maxX, cell.x);
      minY = Math.min(minY, cell.y);
      maxY = Math.max(maxY, cell.y);
    }

    const maxArea = 25000;
    let width = (maxX - minX) + 1;
    let height = (maxY - minY) + 1;
    if ((width * height) > maxArea) {
      minX = startCell.mapX - adaptivePreview.viewWidth;
      maxX = startCell.mapX + adaptivePreview.viewWidth;
      minY = startCell.mapY - adaptivePreview.viewHeight;
      maxY = startCell.mapY + adaptivePreview.viewHeight;
      width = (maxX - minX) + 1;
      height = (maxY - minY) + 1;
      if ((width * height) > maxArea) {
        return [];
      }
    }

    const out = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (readTile(x, y) === "") {
          out.push({mapX: x, mapY: y});
        }
      }
    }
    return out;
  };

  const updateStatus = () => {
    const tilemap = getActiveMap();
    const layer = getActiveLayer(false);
    if (!tilemap) return;

    const mapCellCount = getMapCellCount(tilemap);
    const layerCellCount = layer ? getLayerCellCount(layer) : 0;
    const tilesetLabel = activeTilesetName === "" ? "(none)" : activeTilesetName;
    const savedText = lastAutoSaveAt > 0 ? ` | Last autosave ${new Date(lastAutoSaveAt).toLocaleTimeString()}` : "";
    const eraserText = isEraserMode ? "Eraser:on" : "Eraser:off";
    const contiguousText = fillContiguousInput.checked ? "Contiguous:on" : "Contiguous:off";
    const randomizeText = randomizeInput.checked ? "Random:on" : "Random:off";
    const scatteringText = `Scatter:${clamp(Math.round(Cast.toNumber(scatteringInput.value)), 0, 100)}%`;
    const dragText = isPointerDown && (dragTool === "line" || dragTool === "rect") ? ` Drag:${dragTool}` : "";
    const activeTileLabel = Cast.toString(selectedTileId || "").trim() || "(none)";
    statusMain.textContent = `${activeMapName} | ${tilemap.tileWidth}x${tilemap.tileHeight} | Cells ${mapCellCount} | Layer ${activeLayerName}:${layerCellCount} | Tile ${activeTileLabel} | ${brushMode}${dragText} ${eraserText} ${contiguousText} ${randomizeText} ${scatteringText}${savedText}`;

    if (!hoverCell) {
      statusHover.textContent = "";
      return;
    }

    const hoverTile = getCellAt(hoverCell.mapX, hoverCell.mapY);
    const hoverText = hoverTile === "" ? "(empty)" : hoverTile;
    statusHover.textContent = `x:${hoverCell.mapX} y:${hoverCell.mapY} -> ${hoverText}`;
  };

  const drawGrid = () => {
    adaptivePreview = getAdaptivePreviewMetrics();
    if (!isStageInputAttached) {
      attachStageInputListeners();
    }
    updateStatus();
    requestStagePreviewRefresh();
  };

  const isEditorTabVisible = () => {
    if (!modal || !modal.isConnected) {
      return false;
    }
    if (typeof modal.getClientRects === "function" && modal.getClientRects().length === 0) {
      return false;
    }
    if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
      const style = window.getComputedStyle(modal);
      if (style && (style.display === "none" || style.visibility === "hidden")) {
        return false;
      }
    }
    return true;
  };

  const isEditorTabActive = () => {
    const visible = isEditorTabVisible();
    if (!visible) {
      return false;
    }

    if (typeof editorTabsApi.isActive === "function") {
      return editorTabsApi.isActive(tabId) === true;
    }

    return visible;
  };

  const consumeStagePointerEvent = event => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
  };

  const resolveCellFromStageEvent = event => {
    const renderer = ctx.runtime && ctx.runtime.renderer;
    if (!renderer) {
      return null;
    }

    const tilemap = getActiveMap();
    if (!tilemap) {
      return null;
    }

    const stageCanvas = getStageCanvas();
    if (!stageCanvas) {
      return null;
    }

    const rect = stageCanvas.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const clientX = event.clientX - rect.left;
    const clientY = event.clientY - rect.top;

    let scratchX = 0;
    let scratchY = 0;

    if (typeof renderer.clientSpaceToScratchPoint === "function") {
      const point = renderer.clientSpaceToScratchPoint(clientX, clientY);
      if (!Array.isArray(point) || point.length < 2) {
        return null;
      }
      scratchX = point[0];
      scratchY = point[1];
    } else {
      const stageWidth = Math.max(1, Math.round((ctx.runtime && ctx.runtime.stageWidth) || 480));
      const stageHeight = Math.max(1, Math.round((ctx.runtime && ctx.runtime.stageHeight) || 360));
      const normalizedX = clientX / rect.width;
      const normalizedY = clientY / rect.height;
      scratchX = (normalizedX * stageWidth) - (stageWidth / 2);
      scratchY = (stageHeight / 2) - (normalizedY * stageHeight);

      if (typeof ctx._getCameraXY === "function") {
        const camera = ctx._getCameraXY();
        const cameraX = Array.isArray(camera) ? Cast.toNumber(camera[0]) : 0;
        const cameraY = Array.isArray(camera) ? Cast.toNumber(camera[1]) : 0;
        if (Number.isFinite(cameraX)) {
          scratchX += cameraX;
        }
        if (Number.isFinite(cameraY)) {
          scratchY += cameraY;
        }
      }
    }

    const tileWidth = Math.max(1, Math.round(tilemap.tileWidth || 32));
    const tileHeight = Math.max(1, Math.round(tilemap.tileHeight || 32));
    const mapX = Math.floor(scratchX / tileWidth);
    const mapY = Math.floor(scratchY / tileHeight);

    return {
      col: mapX,
      row: mapY,
      mapX,
      mapY,
      scratchX,
      scratchY
    };
  };

  const getEffectiveToolFromEvent = event => {
    if (event && event.altKey) {
      return "picker";
    }
    if (brushMode === "paint" && event && event.ctrlKey) {
      return event.shiftKey ? "rect" : "picker";
    }
    return brushMode;
  };

  const applyCells = (cells, tool, eraseMode) => {
    if (!Array.isArray(cells) || cells.length === 0) {
      return;
    }

    if (tool === "picker") {
      for (const cell of cells) {
        const value = getCellAt(cell.mapX, cell.mapY);
        if (value !== "") {
          selectedTileId = value;
          tileIdInput.value = selectedTileId;
          refreshTilesetGrid();
          refreshPalette();
          break;
        }
      }
      scheduleDrawGrid();
      return;
    }

    const connectedContext = buildConnectedRuleContext();
    const useConnectedBrush = !eraseMode && !!connectedContext && activeConnectedRuleId !== "" && !isGroupTileId(selectedTileId);
    const layer = getActiveLayer(true);
    const candidates = getPaintCandidateTileIds();

    let changed = false;
    for (const cell of cells) {
      const key = toCellKey(cell.mapX, cell.mapY);
      if (key === lastPaintKey) {
        continue;
      }

      if (!eraseMode && maybeSkipByScattering()) {
        continue;
      }

      if (eraseMode) {
        setCellAt(cell.mapX, cell.mapY, "");
        changed = true;
        if (connectedContext) {
          applyConnectedVariantsAround(layer, cell.mapX, cell.mapY, connectedContext);
        }
      } else if (useConnectedBrush && layer) {
        const currentTileId = Cast.toString(layer.get(key) || "").trim();
        if (!connectedContext.familyTileIds.has(currentTileId)) {
          layer.set(key, connectedContext.fallbackTileId);
        }
        applyConnectedVariantsAround(layer, cell.mapX, cell.mapY, connectedContext);
        changed = true;
      } else {
        const tileId = chooseTileForPaint(candidates);
        if (tileId === "") {
          continue;
        }
        setCellAt(cell.mapX, cell.mapY, tileId);
        changed = true;
      }

      lastPaintKey = key;
    }

    if (useConnectedBrush && changed) {
      markDraftDirty();
    }

    if (changed) {
      pendingPaletteRefreshAfterPaint = true;
      scheduleDrawGrid();
    }
  };

  const applyToolOperation = (startCell, endCell, tool, eraseMode) => {
    if (!startCell) {
      return;
    }

    if (tool === "bucket") {
      applyCells(collectBucketCells(startCell), tool, eraseMode);
      return;
    }

    if (tool === "line") {
      applyCells(collectLineCells(startCell, endCell || startCell), tool, eraseMode);
      return;
    }

    if (tool === "rect") {
      applyCells(collectRectCells(startCell, endCell || startCell), tool, eraseMode);
      return;
    }

    applyCells([endCell || startCell], tool, eraseMode);
  };

  const applyBrushAt = (cell, forcedTool = null, forcedEraseMode = null) => {
    if (!cell) {
      return;
    }
    const tool = forcedTool || brushMode;
    const eraseMode = forcedEraseMode === null ? isEraserMode : !!forcedEraseMode;
    applyToolOperation(cell, cell, tool, eraseMode);
  };

  const refreshAll = () => {
    refreshSidebarTabs();
    refreshMapSelect();
    refreshLayerSelect();
    refreshTileSizeInputs();
    refreshSplitInputs();
    refreshTilesetSelect();
    refreshTilesetSizeInputs();
    refreshCostumeSelect();
    refreshBrushButtons();
    refreshTilesetGrid();
    refreshPalette();
    markActiveRuleInput();
    syncEditorPreviewWorld();
    drawGrid();
  };

  for (const button of sidebarTabButtons) {
    button.addEventListener("click", () => {
      const tab = button.getAttribute("data-sidebar-tab") || "maps";
      setSidebarMode(tab);
    });
  }

  for (const button of setsSubtabButtons) {
    button.addEventListener("click", () => {
      const tab = button.getAttribute("data-sets-subtab") || "catalog";
      setSetsSubsection(tab);
    });
  }

  mapSelect.addEventListener("change", () => {
    activeMapName = Cast.toString(mapSelect.value);
    ensureActiveLayer();
    refreshLayerSelect();
    refreshTileSizeInputs();
    refreshTilesetSizeInputs();
    refreshPalette();
    syncEditorPreviewWorld();
    drawGrid();
  });

  if (tileWidthInput) {
    tileWidthInput.addEventListener("change", () => {
      const tilemap = getActiveMap();
      if (!tilemap) return;
      tilemap.tileWidth = ctx._toTileSize(tileWidthInput.value, tilemap.tileWidth);
      markDraftDirty();
      refreshTileSizeInputs();
      drawGrid();
    });
  }

  if (tileHeightInput) {
    tileHeightInput.addEventListener("change", () => {
      const tilemap = getActiveMap();
      if (!tilemap) return;
      tilemap.tileHeight = ctx._toTileSize(tileHeightInput.value, tilemap.tileHeight);
      markDraftDirty();
      refreshTileSizeInputs();
      drawGrid();
    });
  }

  layerSelect.addEventListener("change", () => {
    activeLayerName = Cast.toString(layerSelect.value);
    ensureActiveLayer();
    drawGrid();
  });

  tileIdInput.addEventListener("change", () => {
    selectedTileId = Cast.toString(tileIdInput.value).trim();
    tileIdInput.value = selectedTileId;
    refreshTilesetGrid();
    refreshPalette();
  });

  modal.querySelector("[data-tile-apply='1']").addEventListener("click", () => {
    selectedTileId = Cast.toString(tileIdInput.value).trim();
    tileIdInput.value = selectedTileId;
    refreshTilesetGrid();
    refreshPalette();
  });

  connectedRuleSelect.addEventListener("change", () => {
    activeConnectedRuleId = Cast.toString(connectedRuleSelect.value).trim();
    const rule = getActiveConnectedRule();
    if (rule) {
      const centerTag = normalizeTileTags([rule.centerTag])[0] || "";
      if (centerTag !== "" && Array.from(rulesCenterTagSelect.options).some(option => option.value === centerTag)) {
        rulesCenterTagSelect.value = centerTag;
      }
      for (const input of rulesNeighborTagInputs) {
        const direction = Cast.toString(input.getAttribute("data-rules-neighbor-tag") || "").toLowerCase();
        const value = normalizeTileTags([rule.neighborTags && rule.neighborTags[direction]])[0] || "";
        input.value = value;
      }
    }
    renderRulesPreview(Cast.toString(rulesCenterTagSelect.value || ""));
    refreshTilesetStatus();
  });

  connectedRuleCreateBtn.addEventListener("click", () => {
    createConnectedRuleFromAtlasSelection();
  });

  connectedRuleDeleteBtn.addEventListener("click", () => {
    deleteActiveConnectedRule();
  });

  tilesetSelect.addEventListener("change", () => {
    activeTilesetName = normalizeTilesetName(tilesetSelect.value);
    tilesetStatusMessage = "";
    clearAtlasSelection();
    updateGroupNameSuggestion();
    refreshConnectedRuleSelect();
    refreshTilesetSizeInputs();
    refreshTilesetGrid();
    refreshPalette();
    syncEditorPreviewWorld();
    drawGrid();
  });

  tilesetCostumeSelect.addEventListener("change", () => {
    selectedCostumeValue = Cast.toString(tilesetCostumeSelect.value);
  });

  tilesetTileWidthInput.addEventListener("change", () => {
    const tileset = getActiveTileset();
    if (!tileset) {
      return;
    }

    tileset.tileWidth = ctx._toTileSize(tilesetTileWidthInput.value, tileset.tileWidth);
    markDraftDirty();
    refreshTilesetSizeInputs();
    refreshTilesetGrid();
    refreshPalette();
    drawGrid();
  });

  tilesetTileHeightInput.addEventListener("change", () => {
    const tileset = getActiveTileset();
    if (!tileset) {
      return;
    }

    tileset.tileHeight = ctx._toTileSize(tilesetTileHeightInput.value, tileset.tileHeight);
    markDraftDirty();
    refreshTilesetSizeInputs();
    refreshTilesetGrid();
    refreshPalette();
    drawGrid();
  });

  tilesetSplitModeInput.addEventListener("change", () => {
    refreshSplitInputs();
  });

  const clampSplitGridInput = input => {
    input.value = `${Math.max(1, Math.round(Cast.toNumber(input.value || 1)))}`;
  };

  tilesetSplitColumnsInput.addEventListener("change", () => {
    clampSplitGridInput(tilesetSplitColumnsInput);
  });

  tilesetSplitRowsInput.addEventListener("change", () => {
    clampSplitGridInput(tilesetSplitRowsInput);
  });

  rulesCenterTagSelect.addEventListener("change", () => {
    activeRuleField = "center";
    activeRuleNeighborDirection = "";
    markActiveRuleInput();
    renderRulesPreview(Cast.toString(rulesCenterTagSelect.value || ""));
  });

  rulesCenterTagSelect.addEventListener("focus", () => {
    activeRuleField = "center";
    activeRuleNeighborDirection = "";
    markActiveRuleInput();
  });

  for (const input of rulesNeighborTagInputs) {
    input.addEventListener("focus", () => {
      activeRuleField = "neighbor";
      activeRuleNeighborDirection = Cast.toString(input.getAttribute("data-rules-neighbor-tag") || "").toLowerCase();
      markActiveRuleInput();
    });
    input.addEventListener("input", () => {
      renderRulesPreview(Cast.toString(rulesCenterTagSelect.value || ""));
      renderRulesUsedTags();
    });
    input.addEventListener("change", () => {
      input.value = normalizeTileTags([input.value])[0] || "";
      renderRulesPreview(Cast.toString(rulesCenterTagSelect.value || ""));
      renderRulesUsedTags();
    });
  }

  rulesApplyTagBtn.addEventListener("click", () => {
    createOrUpdateConnectedRuleFromTags();
  });

  modal.querySelector("[data-tileset-new='1']").addEventListener("click", () => {
    const suggestedName = activeTilesetName === "" ? "default" : `${activeTilesetName}_copy`;
    const enteredName = window.prompt("New tileset name", suggestedName);
    if (enteredName === null) {
      return;
    }

    const nextName = normalizeTilesetName(enteredName);
    if (nextName === "") {
      window.alert("Tileset name cannot be empty.");
      return;
    }

    if (draftTilesets.has(nextName)) {
      window.alert("A tileset with that name already exists.");
      return;
    }

    const tileWidth = ctx._toTileSize(tilesetTileWidthInput.value, 32);
    const tileHeight = ctx._toTileSize(tilesetTileHeightInput.value, 32);

    draftTilesets.set(nextName, {
      name: nextName,
      tileWidth,
      tileHeight,
      sourceWidth: 0,
      sourceHeight: 0,
      atlasColumns: 0,
      atlasRows: 0,
      atlasCanvas: null,
      importSplitMode: "tile-size",
      importSplitColumns: 0,
      importSplitRows: 0,
      tiles: new Map(),
      tileMetaById: new Map(),
      coordToTileId: new Map(),
      groups: new Map(),
      connectedRules: new Map()
    });

    activeTilesetName = nextName;
    tilesetStatusMessage = "Created empty tileset";
    markDraftDirty();
    refreshTilesetSelect();
    refreshTilesetSizeInputs();
    refreshTilesetGrid();
    refreshPalette();
    syncEditorPreviewWorld();
    drawGrid();
  });

  modal.querySelector("[data-tileset-delete='1']").addEventListener("click", () => {
    if (activeTilesetName === "" || !draftTilesets.has(activeTilesetName)) {
      return;
    }

    const ok = window.confirm(`Delete tileset "${activeTilesetName}"?`);
    if (!ok) {
      return;
    }

    draftTilesets.delete(activeTilesetName);
    activeTilesetName = "";
    tilesetStatusMessage = "Deleted tileset";
    markDraftDirty();
    refreshTilesetSelect();
    refreshTilesetSizeInputs();
    refreshTilesetGrid();
    refreshPalette();
    syncEditorPreviewWorld();
    drawGrid();
  });

  modal.querySelector("[data-tileset-import-costume='1']").addEventListener("click", async () => {
    if (isTilesetImportBusy) {
      return;
    }

    const targetName = resolveTilesetTargetName();
    if (targetName === "") {
      return;
    }

    setTilesetImportBusy(true);
    try {
      const costume = typeof ctx._resolveCostume === "function" ? ctx._resolveCostume(selectedCostumeValue, null) : null;
      if (!costume) {
        tilesetStatusMessage = "Could not resolve costume";
        refreshTilesetStatus();
        return;
      }

      const renderer = ctx.runtime && ctx.runtime.renderer;
      const skin = renderer && renderer._allSkins ? renderer._allSkins[costume.skinId] : null;
      const sourceCanvas = typeof ctx._skinToCanvas === "function" ? ctx._skinToCanvas(skin) : null;
      if (!sourceCanvas) {
        tilesetStatusMessage = "Could not read costume pixels";
        refreshTilesetStatus();
        return;
      }

      if (!upsertTilesetFromCanvas(targetName, sourceCanvas)) {
        tilesetStatusMessage = "Import failed (check tile size)";
        refreshTilesetStatus();
      }
    } finally {
      setTilesetImportBusy(false);
    }
  });

  modal.querySelector("[data-tileset-import-file='1']").addEventListener("click", () => {
    if (isTilesetImportBusy) {
      return;
    }

    tilesetFileInput.value = "";
    tilesetFileInput.click();
  });

  tilesetFileInput.addEventListener("change", async () => {
    if (isTilesetImportBusy) {
      return;
    }

    const selectedFile = tilesetFileInput.files && tilesetFileInput.files[0];
    if (!selectedFile) {
      return;
    }

    if (selectedFile.type && !selectedFile.type.startsWith("image/")) {
      tilesetStatusMessage = "Selected file is not an image";
      refreshTilesetStatus();
      return;
    }

    const targetName = resolveTilesetTargetName();
    if (targetName === "") {
      return;
    }

    setTilesetImportBusy(true);
    try {
      let sourceCanvas = null;

      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function" && typeof URL.revokeObjectURL === "function") {
        const objectUrl = URL.createObjectURL(selectedFile);
        try {
          sourceCanvas = typeof ctx._loadImageToCanvas === "function" ? await ctx._loadImageToCanvas(objectUrl) : null;
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }

      if (!sourceCanvas && typeof FileReader !== "undefined") {
        sourceCanvas = await new Promise(resolve => {
          const reader = new FileReader();

          reader.onload = async () => {
            const dataUrl = Cast.toString(reader.result || "").trim();
            if (dataUrl === "" || typeof ctx._loadImageToCanvas !== "function") {
              resolve(null);
              return;
            }

            try {
              resolve(await ctx._loadImageToCanvas(dataUrl));
            } catch {
              resolve(null);
            }
          };

          reader.onerror = () => resolve(null);
          reader.readAsDataURL(selectedFile);
        });
      }

      if (!sourceCanvas) {
        tilesetStatusMessage = "Could not load image file";
        refreshTilesetStatus();
        return;
      }

      if (!upsertTilesetFromCanvas(targetName, sourceCanvas)) {
        tilesetStatusMessage = "Import failed (check tile size)";
        refreshTilesetStatus();
      }
    } finally {
      setTilesetImportBusy(false);
    }
  });

  tilesetGroupCreateBtn.addEventListener("click", () => {
    createGroupFromAtlasSelection();
  });

  tilesetGroupClearBtn.addEventListener("click", () => {
    clearAtlasSelection();
    tilesetStatusMessage = "Cleared shift-selection";
    markDraftDirty();
    refreshTilesetStatus();
    drawTilesetPreview();
  });

  tilesetRenameTileBtn.addEventListener("click", () => {
    const tileset = getActiveTileset();
    if (!tileset || !(tileset.tiles instanceof Map)) {
      return;
    }

    const fromId = Cast.toString(selectedTileId).trim();
    if (fromId === "" || !tileset.tiles.has(fromId)) {
      window.alert("Select a tile from the active tileset first.");
      return;
    }

    const toId = Cast.toString(tileIdInput.value).trim();
    if (toId === "") {
      window.alert("Tile ID cannot be empty.");
      return;
    }

    if (toId !== fromId && tileset.tiles.has(toId)) {
      window.alert("That tile ID already exists in this tileset.");
      return;
    }

    const tileCanvas = tileset.tiles.get(fromId);
    const tileMeta = tileset.tileMetaById instanceof Map ? tileset.tileMetaById.get(fromId) : null;
    tileset.tiles.delete(fromId);
    tileset.tiles.set(toId, tileCanvas);

    if (tileset.tileMetaById instanceof Map) {
      tileset.tileMetaById.delete(fromId);
      if (tileMeta) {
        tileset.tileMetaById.set(toId, tileMeta);
      }
    }

    if (tileset.coordToTileId instanceof Map) {
      for (const [coordKey, coordTileId] of tileset.coordToTileId.entries()) {
        if (coordTileId === fromId) {
          tileset.coordToTileId.set(coordKey, toId);
        }
      }
    }

    if (tileset.groups instanceof Map) {
      for (const group of tileset.groups.values()) {
        if (!group || !Array.isArray(group.cells)) {
          continue;
        }
        let changed = false;
        for (const cell of group.cells) {
          if (cell && cell.tileId === fromId) {
            cell.tileId = toId;
            changed = true;
          }
        }
        if (changed) {
          group.previewCanvas = null;
        }
      }
    }

    if (tileset.connectedRules instanceof Map) {
      for (const rule of tileset.connectedRules.values()) {
        if (!rule || !Array.isArray(rule.maskToTileId)) {
          continue;
        }

        for (let i = 0; i < rule.maskToTileId.length; i++) {
          if (Cast.toString(rule.maskToTileId[i]).trim() === fromId) {
            rule.maskToTileId[i] = toId;
          }
        }

        if (Array.isArray(rule.maskVariantsByMask)) {
          for (let i = 0; i < rule.maskVariantsByMask.length; i++) {
            const variants = Array.isArray(rule.maskVariantsByMask[i]) ? rule.maskVariantsByMask[i] : [];
            for (let v = 0; v < variants.length; v++) {
              if (Cast.toString(variants[v]).trim() === fromId) {
                variants[v] = toId;
              }
            }
          }
        }

        const normalizedRule = normalizeConnectedRuleArrays(rule.maskToTileId, rule.maskVariantsByMask);
        rule.maskToTileId = normalizedRule.maskToTileId;
        rule.maskVariantsByMask = normalizedRule.maskVariantsByMask;
      }
    }

    selectedTileId = toId;
    tileIdInput.value = toId;
    tilesetStatusMessage = `Renamed tile ${fromId} to ${toId}`;
    markDraftDirty();
    refreshConnectedRuleSelect();
    refreshSelectedTileTagEditor();
    refreshTilesetGrid();
    refreshPalette();
    drawGrid();
  });

  tilesetDeleteTileBtn.addEventListener("click", () => {
    const tileset = getActiveTileset();
    if (!tileset || !(tileset.tiles instanceof Map)) {
      return;
    }

    const tileId = Cast.toString(selectedTileId).trim();
    if (tileId === "" || !tileset.tiles.has(tileId)) {
      window.alert("Select a tile from the active tileset first.");
      return;
    }

    const ok = window.confirm(`Delete tile "${tileId}" from tileset "${activeTilesetName}"?`);
    if (!ok) {
      return;
    }

    tileset.tiles.delete(tileId);

    if (tileset.tileMetaById instanceof Map) {
      tileset.tileMetaById.delete(tileId);
    }

    if (tileset.coordToTileId instanceof Map) {
      for (const [coordKey, coordTileId] of Array.from(tileset.coordToTileId.entries())) {
        if (coordTileId === tileId) {
          tileset.coordToTileId.delete(coordKey);
          atlasSelectedCellKeys.delete(coordKey);
        }
      }
    }

    if (tileset.groups instanceof Map) {
      for (const [groupId, group] of Array.from(tileset.groups.entries())) {
        if (!group || !Array.isArray(group.cells)) {
          continue;
        }

        group.cells = group.cells.filter(cell => (cell && cell.tileId) !== tileId);
        if (group.cells.length === 0) {
          tileset.groups.delete(groupId);
          continue;
        }

        const maxDx = Math.max(...group.cells.map(cell => Math.trunc((cell && cell.dx) || 0)));
        const maxDy = Math.max(...group.cells.map(cell => Math.trunc((cell && cell.dy) || 0)));
        group.width = Math.max(1, maxDx + 1);
        group.height = Math.max(1, maxDy + 1);
        group.previewCanvas = null;
      }
    }

    if (tileset.connectedRules instanceof Map) {
      for (const [ruleId, rule] of Array.from(tileset.connectedRules.entries())) {
        if (!rule || !Array.isArray(rule.maskToTileId)) {
          continue;
        }

        for (let i = 0; i < rule.maskToTileId.length; i++) {
          if (Cast.toString(rule.maskToTileId[i]).trim() === tileId) {
            rule.maskToTileId[i] = "";
          }
        }

        if (Array.isArray(rule.maskVariantsByMask)) {
          for (let i = 0; i < rule.maskVariantsByMask.length; i++) {
            const variants = Array.isArray(rule.maskVariantsByMask[i]) ? rule.maskVariantsByMask[i] : [];
            rule.maskVariantsByMask[i] = variants.filter(value => Cast.toString(value).trim() !== tileId);
          }
        }

        const normalizedRule = normalizeConnectedRuleArrays(rule.maskToTileId, rule.maskVariantsByMask);
        rule.maskToTileId = normalizedRule.maskToTileId;
        rule.maskVariantsByMask = normalizedRule.maskVariantsByMask;

        const hasAny = rule.maskToTileId.some(value => Cast.toString(value).trim() !== "");

        if (!hasAny) {
          tileset.connectedRules.delete(ruleId);
          if (activeConnectedRuleId === ruleId) {
            activeConnectedRuleId = "";
          }
        }
      }
    }

    if (selectedTileId === tileId) {
      selectedTileId = "";
      tileIdInput.value = "";
    }

    tilesetStatusMessage = `Deleted tile ${tileId}`;
    markDraftDirty();
    refreshConnectedRuleSelect();
    refreshSelectedTileTagEditor();
    refreshTilesetGrid();
    refreshPalette();
    drawGrid();
  });

  selectedTileTagsApplyBtn.addEventListener("click", () => {
    const tileset = getActiveTileset();
    const tileId = Cast.toString(selectedTileId || "").trim();
    if (!tileset || !(tileset.tiles instanceof Map) || tileId === "" || isGroupTileId(tileId) || !tileset.tiles.has(tileId)) {
      return;
    }

    if (!(tileset.tileMetaById instanceof Map)) {
      tileset.tileMetaById = new Map();
    }

    const nextTags = parseTileTagsInput(selectedTileTagsInput.value);
    const existing = tileset.tileMetaById.get(tileId) || {
      col: 0,
      row: 0,
      isEmpty: false,
      tags: []
    };
    existing.tags = normalizeTileTags(nextTags);
    tileset.tileMetaById.set(tileId, existing);

    selectedTileTagsInput.value = formatTileTags(existing.tags);
    tilesetStatusMessage = existing.tags.length > 0 ?
      `Updated tags for tile ${tileId}` :
      `Cleared tags for tile ${tileId}`;
    markDraftDirty();
    refreshTilesetStatus();
  });

  modal.querySelector("[data-map-new='1']").addEventListener("click", () => {
    const suggestedName = `map${draftMaps.size + 1}`;
    const enteredName = window.prompt("New map name", suggestedName);
    if (enteredName === null) return;

    const nextName = Cast.toString(enteredName).trim();
    if (nextName === "") {
      window.alert("Map name cannot be empty.");
      return;
    }
    if (draftMaps.has(nextName)) {
      window.alert("A map with that name already exists.");
      return;
    }

    const activeMap = getActiveMap();
    const tileW = activeMap ? activeMap.tileWidth : 32;
    const tileH = activeMap ? activeMap.tileHeight : 32;
    draftMaps.set(nextName, buildEmptyTilemap(ctx, tileW, tileH));
    activeMapName = nextName;
    activeLayerName = "0";
    markDraftDirty();
    syncEditorPreviewWorld();
    refreshAll();
  });

  modal.querySelector("[data-map-duplicate='1']").addEventListener("click", () => {
    const source = getActiveMap();
    if (!source) return;

    const suggestedName = `${activeMapName}_copy`;
    const enteredName = window.prompt("Duplicate map as", suggestedName);
    if (enteredName === null) return;

    const nextName = Cast.toString(enteredName).trim();
    if (nextName === "") {
      window.alert("Map name cannot be empty.");
      return;
    }
    if (draftMaps.has(nextName)) {
      window.alert("A map with that name already exists.");
      return;
    }

    draftMaps.set(nextName, cloneTilemap(source));
    activeMapName = nextName;
    ensureActiveLayer();
    markDraftDirty();
    syncEditorPreviewWorld();
    refreshAll();
  });

  modal.querySelector("[data-map-delete='1']").addEventListener("click", () => {
    if (draftMaps.size <= 1) {
      window.alert("You must keep at least one map.");
      return;
    }

    const ok = window.confirm(`Delete map "${activeMapName}"?`);
    if (!ok) return;

    draftMaps.delete(activeMapName);
    const firstMap = draftMaps.keys().next();
    activeMapName = firstMap.done ? "main" : firstMap.value;
    activeLayerName = "0";
    markDraftDirty();
    syncEditorPreviewWorld();
    refreshAll();
  });

  modal.querySelector("[data-layer-add='1']").addEventListener("click", () => {
    const tilemap = getActiveMap();
    if (!tilemap) return;

    let suggestionIndex = tilemap.layers.size;
    let suggestion = `${suggestionIndex}`;
    while (tilemap.layers.has(suggestion)) {
      suggestionIndex += 1;
      suggestion = `${suggestionIndex}`;
    }

    const enteredName = window.prompt("New layer name", suggestion);
    if (enteredName === null) return;

    const nextName = Cast.toString(enteredName).trim();
    if (nextName === "") {
      window.alert("Layer name cannot be empty.");
      return;
    }

    if (tilemap.layers.has(nextName)) {
      window.alert("A layer with that name already exists.");
      return;
    }

    tilemap.layers.set(nextName, new Map());
    activeLayerName = nextName;
    markDraftDirty();
    refreshLayerSelect();
    drawGrid();
  });

  modal.querySelector("[data-layer-remove='1']").addEventListener("click", () => {
    const tilemap = getActiveMap();
    if (!tilemap) return;

    if (tilemap.layers.size <= 1) {
      window.alert("You must keep at least one layer.");
      return;
    }

    const ok = window.confirm(`Delete layer "${activeLayerName}"?`);
    if (!ok) return;

    tilemap.layers.delete(activeLayerName);
    ensureActiveLayer();
    markDraftDirty();
    refreshLayerSelect();
    drawGrid();
  });

  modal.querySelector("[data-layer-clear='1']").addEventListener("click", () => {
    const layer = getActiveLayer(false);
    if (!layer || layer.size === 0) return;

    const ok = window.confirm(`Clear all cells in layer "${activeLayerName}"?`);
    if (!ok) return;

    layer.clear();
    markDraftDirty();
    refreshPalette();
    drawGrid();
  });

  for (const button of brushButtons) {
    button.addEventListener("click", () => {
      brushMode = Cast.toString(button.getAttribute("data-brush") || "paint");
      refreshBrushButtons();
      drawGrid();
    });
  }

  eraserToggleInput.addEventListener("change", () => {
    isEraserMode = !!eraserToggleInput.checked;
    refreshBrushButtons();
    drawGrid();
  });

  fillContiguousInput.addEventListener("change", () => {
    drawGrid();
  });

  randomizeInput.addEventListener("change", () => {
    drawGrid();
  });

  const clampScatteringInput = () => {
    const next = clamp(Math.round(Cast.toNumber(scatteringInput.value)), 0, 100);
    scatteringInput.value = `${next}`;
  };

  scatteringInput.addEventListener("input", () => {
    clampScatteringInput();
    drawGrid();
  });

  scatteringInput.addEventListener("change", () => {
    clampScatteringInput();
    drawGrid();
  });

  const isEditableTarget = target => {
    if (!target || typeof target !== "object") {
      return false;
    }
    const tagName = Cast.toString(target.tagName || "").toUpperCase();
    if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
      return true;
    }
    return !!target.isContentEditable;
  };

  const setBrushModeFromShortcut = nextMode => {
    if (nextMode !== "paint" && nextMode !== "line" && nextMode !== "rect" && nextMode !== "bucket" && nextMode !== "picker") {
      return;
    }
    brushMode = nextMode;
    refreshBrushButtons();
    drawGrid();
  };

  const handleKeydown = event => {
    if (isEditableTarget(event.target)) {
      return;
    }

    const key = Cast.toString(event.key || "").toLowerCase();
    if (key === "b") {
      event.preventDefault();
      setBrushModeFromShortcut("paint");
      return;
    }
    if (key === "l") {
      event.preventDefault();
      setBrushModeFromShortcut("line");
      return;
    }
    if (key === "r") {
      event.preventDefault();
      setBrushModeFromShortcut("rect");
      return;
    }
    if (key === "f") {
      event.preventDefault();
      setBrushModeFromShortcut("bucket");
      return;
    }
    if (key === "i") {
      event.preventDefault();
      setBrushModeFromShortcut("picker");
      return;
    }
    if (key === "e") {
      event.preventDefault();
      isEraserMode = !isEraserMode;
      eraserToggleInput.checked = isEraserMode;
      refreshBrushButtons();
      drawGrid();
      return;
    }
  };

  modal.addEventListener("keydown", handleKeydown);

  tilesetPreviewCanvas.addEventListener("contextmenu", event => {
    event.preventDefault();
  });

  tilesetPreviewCanvas.addEventListener("pointerdown", event => {
    if (event.button !== 0) {
      return;
    }

    const cell = resolveTilesetPreviewCellFromEvent(event);
    if (!cell) {
      return;
    }

    if (event.shiftKey && cell.atlasKey) {
      if (cell.isEmpty) {
        return;
      }

      const mode = atlasSelectedCellKeys.has(cell.atlasKey) ? "remove" : "add";
      const baseSelection = new Set(atlasSelectedCellKeys);
      atlasShiftDrag = {
        pointerId: typeof event.pointerId === "number" ? event.pointerId : -1,
        startCol: cell.col,
        startRow: cell.row,
        mode,
        baseSelection
      };
      atlasDragSelectionRect = {
        startCol: cell.col,
        startRow: cell.row,
        endCol: cell.col,
        endRow: cell.row
      };
      atlasSelectedCellKeys = getAtlasRectSelection(cell.col, cell.row, cell.col, cell.row, mode, baseSelection);

      if (typeof tilesetPreviewCanvas.setPointerCapture === "function" && typeof event.pointerId === "number") {
        try {
          tilesetPreviewCanvas.setPointerCapture(event.pointerId);
        } catch {
          // Ignore pointer capture failures.
        }
      }

      refreshTilesetStatus();
      drawTilesetPreview();
      event.preventDefault();
      return;
    }

    if (cell.tileId === "") {
      return;
    }

    selectedTileId = cell.tileId;
    tileIdInput.value = selectedTileId;
    refreshTilesetGrid();
    refreshPalette();
  });

  tilesetPreviewCanvas.addEventListener("pointermove", event => {
    if (!atlasShiftDrag) {
      return;
    }
    if (typeof event.pointerId === "number" && atlasShiftDrag.pointerId >= 0 && event.pointerId !== atlasShiftDrag.pointerId) {
      return;
    }

    const cell = resolveTilesetPreviewCellFromEvent(event);
    if (!cell || !cell.atlasKey) {
      return;
    }

    atlasDragSelectionRect = {
      startCol: atlasShiftDrag.startCol,
      startRow: atlasShiftDrag.startRow,
      endCol: cell.col,
      endRow: cell.row
    };
    atlasSelectedCellKeys = getAtlasRectSelection(
      atlasShiftDrag.startCol,
      atlasShiftDrag.startRow,
      cell.col,
      cell.row,
      atlasShiftDrag.mode,
      atlasShiftDrag.baseSelection
    );
    refreshTilesetStatus();
    drawTilesetPreview();
    event.preventDefault();
  });

  const finishAtlasShiftDrag = event => {
    if (!atlasShiftDrag) {
      return;
    }
    if (typeof event.pointerId === "number" && atlasShiftDrag.pointerId >= 0 && event.pointerId !== atlasShiftDrag.pointerId) {
      return;
    }

    const pointerId = atlasShiftDrag.pointerId;
    atlasShiftDrag = null;
    atlasDragSelectionRect = null;

    if (pointerId >= 0 && typeof tilesetPreviewCanvas.releasePointerCapture === "function") {
      try {
        tilesetPreviewCanvas.releasePointerCapture(pointerId);
      } catch {
        // Ignore release failures.
      }
    }

    refreshTilesetStatus();
    drawTilesetPreview();
  };

  tilesetPreviewCanvas.addEventListener("pointerup", finishAtlasShiftDrag);
  tilesetPreviewCanvas.addEventListener("pointercancel", finishAtlasShiftDrag);

  const clearHoverCell = () => {
    hoverCell = null;
    if (hoverCellKey !== "") {
      hoverCellKey = "";
      scheduleDrawGrid();
    }
  };

  const startPaintStroke = (event, cell, captureTarget = null) => {

    const leftClick = event.button === 0;
    const rightClick = event.button === 2;
    if (!leftClick && !rightClick) {
      return false;
    }

    const tool = getEffectiveToolFromEvent(event);
    const eraseMode = rightClick ? true : isEraserMode;

    isPointerDown = true;
    dragTool = tool;
    dragErase = eraseMode;
    dragAnchorCell = cell ? {mapX: cell.mapX, mapY: cell.mapY} : null;
    dragPreviewCell = dragAnchorCell ? {mapX: dragAnchorCell.mapX, mapY: dragAnchorCell.mapY} : null;
    lastPaintKey = "";

    if ((dragTool === "paint" || dragTool === "line" || dragTool === "rect") &&
      captureTarget &&
      typeof captureTarget.setPointerCapture === "function" &&
      typeof event.pointerId === "number") {
      try {
        captureTarget.setPointerCapture(event.pointerId);
        pointerCaptureTarget = captureTarget;
      } catch {
        pointerCaptureTarget = null;
      }
    }

    hoverCell = cell;
    hoverCellKey = cell ? `${cell.mapX},${cell.mapY}` : "";

    if (!cell) {
      scheduleDrawGrid();
      return true;
    }

    if (dragTool === "line" || dragTool === "rect") {
      scheduleDrawGrid();
      return true;
    }

    applyBrushAt(cell, dragTool, dragErase);

    if (dragTool === "bucket" || dragTool === "picker") {
      isPointerDown = false;
      dragTool = "";
      dragErase = false;
      dragAnchorCell = null;
      dragPreviewCell = null;
      lastPaintKey = "";
    }

    return true;
  };

  const updatePaintStroke = cell => {
    const nextHoverCellKey = cell ? `${cell.mapX},${cell.mapY}` : "";
    const hoverChanged = nextHoverCellKey !== hoverCellKey;
    hoverCell = cell;
    hoverCellKey = nextHoverCellKey;

    if (isPointerDown) {
      if (dragTool === "line" || dragTool === "rect") {
        if (cell) {
          dragPreviewCell = {mapX: cell.mapX, mapY: cell.mapY};
        }
        scheduleDrawGrid();
        return true;
      }

      applyBrushAt(cell, dragTool || brushMode, dragErase);
      return true;
    }

    if (hoverChanged) {
      scheduleDrawGrid();
      return true;
    }

    return false;
  };

  const stopPaint = event => {
    if (isPointerDown && dragAnchorCell && (dragTool === "line" || dragTool === "rect")) {
      const endCell = dragPreviewCell || dragAnchorCell;
      applyToolOperation(dragAnchorCell, endCell, dragTool, dragErase);
    }

    isPointerDown = false;
    dragTool = "";
    dragErase = false;
    dragAnchorCell = null;
    dragPreviewCell = null;
    lastPaintKey = "";

    if (pendingPaletteRefreshAfterPaint) {
      pendingPaletteRefreshAfterPaint = false;
      refreshPalette();
    }

    if (event && typeof event.pointerId === "number") {
      const releaseTarget = pointerCaptureTarget;
      try {
        if (releaseTarget && typeof releaseTarget.releasePointerCapture === "function") {
          releaseTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Ignore release failures.
      }
    }

    pointerCaptureTarget = null;

    scheduleDrawGrid();
  };

  const shouldHandleStageBrushInput = () => !isClosing && isEditorTabActive() && sidebarMode === "maps";
  const shouldSuppressStageMouseInput = () => !isClosing && isEditorTabActive() && sidebarMode === "maps";

  const getStageCanvas = () => {
    const renderer = ctx.runtime && ctx.runtime.renderer;
    const stageCanvas = renderer && (renderer.canvas || (renderer._gl && renderer._gl.canvas));
    if (!stageCanvas || typeof stageCanvas.getBoundingClientRect !== "function") {
      return null;
    }
    return stageCanvas;
  };

  const isClientPointInsideStage = (clientX, clientY, stageCanvas = null) => {
    const canvas = stageCanvas || getStageCanvas();
    if (!canvas) {
      return false;
    }

    const rect = canvas.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  };

  const attachStageInputListeners = () => {
    removeStageInputListeners();
    isStageInputAttached = false;

    if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
      return false;
    }

    const canUseCameraDrag = event => event && event.button === 0 && event.shiftKey && !event.ctrlKey && !event.altKey;
    const isSyntheticMouseAfterPointer = () => (Date.now() - lastPointerDownAt) <= 120;

    const onWindowPointerDownCapture = event => {
      if (!shouldHandleStageBrushInput()) {
        return;
      }
      if (!isClientPointInsideStage(event.clientX, event.clientY)) {
        return;
      }
      if (canUseCameraDrag(event)) {
        return;
      }

      lastPointerDownAt = Date.now();
      const cell = resolveCellFromStageEvent(event);
      const handled = startPaintStroke(event, cell, getStageCanvas());
      if (handled) {
        consumeStagePointerEvent(event);
      }
    };

    const onWindowPointerMoveCapture = event => {
      if (!shouldHandleStageBrushInput()) {
        if (isPointerDown) {
          stopPaint(event);
        }
        return;
      }

      const insideStage = isClientPointInsideStage(event.clientX, event.clientY);
      if (!insideStage && !isPointerDown) {
        clearHoverCell();
        return;
      }

      const cell = resolveCellFromStageEvent(event);
      const handled = updatePaintStroke(cell);
      if (handled && (isPointerDown || insideStage)) {
        consumeStagePointerEvent(event);
      }
    };

    const onWindowPointerUpCapture = event => {
      if (!isPointerDown && !shouldHandleStageBrushInput()) {
        return;
      }
      if (isPointerDown) {
        consumeStagePointerEvent(event);
      }
      stopPaint(event);
    };

    const onWindowPointerCancelCapture = event => {
      if (!isPointerDown && !shouldHandleStageBrushInput()) {
        return;
      }
      if (isPointerDown) {
        consumeStagePointerEvent(event);
      }
      stopPaint(event);
    };

    const onWindowContextMenuCapture = event => {
      if (!shouldSuppressStageMouseInput()) {
        return;
      }
      if (!isClientPointInsideStage(event.clientX, event.clientY)) {
        return;
      }
      consumeStagePointerEvent(event);
    };

    const onWindowMouseDownCapture = event => {
      if (isSyntheticMouseAfterPointer()) {
        return;
      }
      if (!shouldHandleStageBrushInput()) {
        return;
      }
      if (!isClientPointInsideStage(event.clientX, event.clientY)) {
        return;
      }
      if (canUseCameraDrag(event)) {
        return;
      }

      const cell = resolveCellFromStageEvent(event);
      const handled = startPaintStroke(event, cell, getStageCanvas());
      if (handled) {
        consumeStagePointerEvent(event);
      }
    };

    const onWindowMouseMoveCapture = event => {
      if (isSyntheticMouseAfterPointer()) {
        return;
      }
      if (!shouldHandleStageBrushInput()) {
        if (isPointerDown) {
          stopPaint(event);
        }
        return;
      }

      const insideStage = isClientPointInsideStage(event.clientX, event.clientY);
      if (!insideStage && !isPointerDown) {
        clearHoverCell();
        return;
      }

      const cell = resolveCellFromStageEvent(event);
      const handled = updatePaintStroke(cell);
      if (handled && (isPointerDown || insideStage)) {
        consumeStagePointerEvent(event);
      }
    };

    const onWindowMouseUpCapture = event => {
      if (isSyntheticMouseAfterPointer()) {
        return;
      }
      if (!isPointerDown && !shouldHandleStageBrushInput()) {
        return;
      }
      if (isPointerDown) {
        consumeStagePointerEvent(event);
      }
      stopPaint(event);
    };

    window.addEventListener("pointerdown", onWindowPointerDownCapture, true);
    window.addEventListener("pointermove", onWindowPointerMoveCapture, true);
    window.addEventListener("pointerup", onWindowPointerUpCapture, true);
    window.addEventListener("pointercancel", onWindowPointerCancelCapture, true);
    window.addEventListener("contextmenu", onWindowContextMenuCapture, true);
    window.addEventListener("mousedown", onWindowMouseDownCapture, true);
    window.addEventListener("mousemove", onWindowMouseMoveCapture, true);
    window.addEventListener("mouseup", onWindowMouseUpCapture, true);
    isStageInputAttached = true;

    removeStageInputListeners = () => {
      window.removeEventListener("pointerdown", onWindowPointerDownCapture, true);
      window.removeEventListener("pointermove", onWindowPointerMoveCapture, true);
      window.removeEventListener("pointerup", onWindowPointerUpCapture, true);
      window.removeEventListener("pointercancel", onWindowPointerCancelCapture, true);
      window.removeEventListener("contextmenu", onWindowContextMenuCapture, true);
      window.removeEventListener("mousedown", onWindowMouseDownCapture, true);
      window.removeEventListener("mousemove", onWindowMouseMoveCapture, true);
      window.removeEventListener("mouseup", onWindowMouseUpCapture, true);
      isStageInputAttached = false;
      removeStageInputListeners = () => {};
    };

    return true;
  };

  let detachCheckInterval = null;
  let themeSyncInterval = null;
  let lastObservedTabActive = false;

  const finalizeClose = () => {
    stopPaint();
    removeStageInputListeners();

    if (ctx._tileWorlds instanceof Map) {
      for (const world of ctx._tileWorlds.values()) {
        if (!world) {
          continue;
        }
        world.showGrid = false;
        world.hoverMapX = null;
        world.hoverMapY = null;
        world.dragTool = "";
        world.dragErase = false;
        world.dragAnchorCell = null;
        world.dragPreviewCell = null;
        world.dirty = true;
      }
    }

    modal.removeAttribute("data-usb-tilemap-mounted");
    modal.removeEventListener("keydown", handleKeydown);
    if (detachCheckInterval) {
      clearInterval(detachCheckInterval);
      detachCheckInterval = null;
    }
    if (themeSyncInterval) {
      clearInterval(themeSyncInterval);
      themeSyncInterval = null;
    }
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    commitDraftToRuntime();
    if (typeof ctx._deleteTileWorld === "function") {
      ctx._deleteTileWorld(editorPreviewWorldName);
    }
  };

  const close = (requestTabClose = true) => {
    if (isClosing) {
      return;
    }
    isClosing = true;
    finalizeClose();
    if (requestTabClose) {
      editorTabsApi.close(tabId);
    }
  };

  themeSyncInterval = setInterval(() => {
    if (isClosing) {
      return;
    }

    const changed = refreshLiveTheme(false);
    if (!changed) {
      return;
    }

    refreshBrushButtons();
    refreshTilesetStatus();
    refreshTilesetGrid();
    refreshPalette();
    if (sidebarMode === "sets") {
      drawTilesetPreview();
    }
    scheduleDrawGrid();
  }, 300);

  detachCheckInterval = setInterval(() => {
    if (isClosing) {
      return;
    }

    const tabActive = sidebarMode === "maps" && isEditorTabActive();

    if (tabActive) {
      if (!isStageInputAttached) {
        attachStageInputListeners();
      }
    } else if (isStageInputAttached) {
      stopPaint();
      removeStageInputListeners();
    }

    if (tabActive) {
      requestStagePreviewRefresh();
    } else if (tabActive !== lastObservedTabActive) {
      // Force a single refresh on active->inactive transitions so stage overlays clear immediately.
      requestStagePreviewRefresh();
    }
    lastObservedTabActive = tabActive;

    if (!document.body.contains(modal)) {
      close(false);
    }
  }, 250);

  modal.querySelector("[data-cancel='1']").addEventListener("click", () => {
    close();
  });

  modal.querySelector("[data-save='1']").addEventListener("click", () => {
    commitDraftToRuntime();
    refreshTilesetStatus();
    drawGrid();
  });

  attachStageInputListeners();
  refreshAll();
};

module.exports = {
  openTilemapEditorTab,
  openTilemapEditorModal: openTilemapEditorTab
};

