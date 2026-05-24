(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;
  const DIAGONAL_COST = Math.SQRT2;

  /**
   * Unsandboxed blocks for stage-space grid pathfinding.
   */
  class UnsandboxedPathfindingBlocks {
    static extensionId = "usbPathfinding";

    static get ALL_SPRITES_OPTION() {
      return "_all_";
    }

    /**
     * Keep debug overlay visibility controlled by code, not blocks.
     * @returns {boolean}
     */
    static get debugOverlayEnabled() {
      return false;
    }

    constructor() {
      this.vm = Scratch.vm;
      this.runtime = this.vm.runtime;
      this._cellSize = 24;
      this._obstacleSource = "all";
      this._obstacleTags = ["solid"];
      this._obstacleSprite = UnsandboxedPathfindingBlocks.ALL_SPRITES_OPTION;
      this._showDebugOverlay = UnsandboxedPathfindingBlocks.debugOverlayEnabled;
      this._debugDrawableId = null;
      this._debugSkinId = null;
      this._debugDataByTargetId = new Map();
      this._subcellProbeResolution = 4;
      this._cellCoverageThreshold = 0.22;
      this._boundaryProbeInset = 0.08;
    }

    _clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    _key(x, y) {
      return `${x},${y}`;
    }

    _parseVector(input) {
      if (Array.isArray(input) && input.length >= 2) {
        return [Cast.toNumber(input[0]), Cast.toNumber(input[1])];
      }

      if (input && typeof input === "object") {
        if (Object.prototype.hasOwnProperty.call(input, "x") && Object.prototype.hasOwnProperty.call(input, "y")) {
          return [Cast.toNumber(input.x), Cast.toNumber(input.y)];
        }
      }

      const text = Cast.toString(input);
      const parts = text.split(",");
      if (parts.length >= 2) {
        return [Cast.toNumber(parts[0]), Cast.toNumber(parts[1])];
      }

      return [0, 0];
    }

    _getGridConfig(startPoint = null, endPoint = null, obstacleTargets = null, paddingMultiplier = 1) {
      const stageWidth = this.runtime.stageWidth || 480;
      const stageHeight = this.runtime.stageHeight || 360;
      const cellSize = this._cellSize;
      const camera = this.runtime.camera || null;
      const centerX = camera && Number.isFinite(camera.x) ? camera.x : 0;
      const centerY = camera && Number.isFinite(camera.y) ? camera.y : 0;
      const viewLeft = centerX - (stageWidth / 2);
      const viewBottom = centerY - (stageHeight / 2);
      const viewRight = viewLeft + stageWidth;
      const viewTop = viewBottom + stageHeight;

      let minX = viewLeft;
      let maxX = viewRight;
      let minY = viewBottom;
      let maxY = viewTop;

      if (startPoint) {
        minX = Math.min(minX, startPoint[0]);
        maxX = Math.max(maxX, startPoint[0]);
        minY = Math.min(minY, startPoint[1]);
        maxY = Math.max(maxY, startPoint[1]);
      }
      if (endPoint) {
        minX = Math.min(minX, endPoint[0]);
        maxX = Math.max(maxX, endPoint[0]);
        minY = Math.min(minY, endPoint[1]);
        maxY = Math.max(maxY, endPoint[1]);
      }

      if (Array.isArray(obstacleTargets)) {
        for (const target of obstacleTargets) {
          const bounds = target && typeof target.getBounds === "function" ? target.getBounds() : null;
          if (!bounds) continue;
          minX = Math.min(minX, bounds.left);
          maxX = Math.max(maxX, bounds.right);
          minY = Math.min(minY, bounds.bottom);
          maxY = Math.max(maxY, bounds.top);
        }
      }

      // Expand search beyond the visible viewport so routes can go around
      // obstacles by exiting the current screen region.
      const padding = Math.max(cellSize * 3, Math.min(stageWidth, stageHeight) * 0.5) * paddingMultiplier;
      const rawLeft = minX - padding;
      const rawRight = maxX + padding;
      const rawBottom = minY - padding;
      const rawTop = maxY + padding;

      // Quantize bounds to cell edges so tiny float shifts from camera/interpolation
      // don't move the hidden grid and cause flaky occupancy results.
      const left = Math.floor(rawLeft / cellSize) * cellSize;
      const right = Math.ceil(rawRight / cellSize) * cellSize;
      const bottom = Math.floor(rawBottom / cellSize) * cellSize;
      const top = Math.ceil(rawTop / cellSize) * cellSize;

      const columns = Math.max(1, Math.ceil((right - left) / cellSize));
      const rows = Math.max(1, Math.ceil((top - bottom) / cellSize));

      return {
        stageWidth,
        stageHeight,
        cellSize,
        columns,
        rows,
        centerX,
        centerY,
        left,
        bottom,
        right,
        top,
        viewLeft,
        viewBottom,
        viewRight,
        viewTop
      };
    }

    _stageToCell(x, y, grid) {
      const cellX = this._clamp(
        Math.floor((Cast.toNumber(x) - grid.left) / grid.cellSize),
        0,
        grid.columns - 1
      );
      const cellY = this._clamp(
        Math.floor((Cast.toNumber(y) - grid.bottom) / grid.cellSize),
        0,
        grid.rows - 1
      );

      return [cellX, cellY];
    }

    _cellToStage(cellX, cellY, grid) {
      const x = grid.left + (cellX * grid.cellSize) + (grid.cellSize / 2);
      const y = grid.bottom + (cellY * grid.cellSize) + (grid.cellSize / 2);
      return [x, y];
    }

    _getObstacleTargets(excludedTargetId = "") {
      const tags = this._obstacleTags.map(tag => Cast.toString(tag));
      const spriteName = Cast.toString(this._obstacleSprite);

      return this.runtime.targets.filter(target => {
        if (!target || target.isStage) return false;
        if (excludedTargetId && target.id === excludedTargetId) return false;
        if (typeof target.drawableID !== "number") return false;
        if (target.visible === false) return false;
        if (this._obstacleSource === "tag") {
          if (!Array.isArray(target.tags) || tags.length === 0) {
            return false;
          }
          return tags.some(tag => target.tags.includes(tag));
        }
        if (this._obstacleSource === "sprite") {
          const name = typeof target.getName === "function" ? target.getName() : "";
          return name === spriteName;
        }
        return true;
      });
    }

    _getSpriteMenu() {
      const spriteNames = [
        {
          text: translate("all sprites"),
          value: UnsandboxedPathfindingBlocks.ALL_SPRITES_OPTION
        }
      ];
      for (const target of this.runtime.targets) {
        if (!target || target.isStage || !target.isOriginal) continue;
        const name = typeof target.getName === "function" ? target.getName() : "";
        if (!name) continue;
        spriteNames.push({
          text: name,
          value: name
        });
      }
      return spriteNames;
    }

    _getEditingTarget() {
      if (this.vm && this.vm.editingTarget) {
        return this.vm.editingTarget;
      }
      return null;
    }

    _ensureDebugOverlayDrawable() {
      const renderer = this.runtime && this.runtime.renderer;
      if (!renderer || typeof document === "undefined") {
        return false;
      }

      if (this._debugDrawableId === null) {
        this._debugDrawableId = renderer.createDrawable("pen");
      }

      if (this._debugSkinId === null) {
        const emptyCanvas = document.createElement("canvas");
        emptyCanvas.width = this.runtime.stageWidth || 480;
        emptyCanvas.height = this.runtime.stageHeight || 360;
        this._debugSkinId = renderer.createBitmapSkin(
          emptyCanvas,
          1,
          [emptyCanvas.width / 2, emptyCanvas.height / 2]
        );
      }

      renderer.updateDrawableSkinId(this._debugDrawableId, this._debugSkinId);
      renderer.updateDrawablePosition(this._debugDrawableId, [0, 0]);
      renderer.updateDrawableDirectionScale(this._debugDrawableId, 90, [100, 100]);
      renderer.updateDrawableVisible(this._debugDrawableId, true);
      return true;
    }

    _hideDebugOverlayDrawable() {
      const renderer = this.runtime && this.runtime.renderer;
      if (!renderer || this._debugDrawableId === null) {
        return;
      }
      renderer.updateDrawableVisible(this._debugDrawableId, false);
    }

    _drawDebugOverlay(grid, blocked, stagePath, coverageMap = new Map()) {
      const renderer = this.runtime && this.runtime.renderer;
      if (!renderer || this._debugSkinId === null || typeof document === "undefined") {
        return;
      }

      const width = grid.stageWidth;
      const height = grid.stageHeight;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      // Blocked cells (obstacles) are shaded red to explain path constraints.
      ctx.fillStyle = "rgba(255, 80, 80, 0.18)";
      for (const cellKey of blocked) {
        const split = cellKey.split(",");
        const cellX = Cast.toNumber(split[0]);
        const cellY = Cast.toNumber(split[1]);
        const worldLeft = grid.left + (cellX * grid.cellSize);
        const worldBottom = grid.bottom + (cellY * grid.cellSize);
        const px = worldLeft - grid.viewLeft;
        const py = grid.viewTop - (worldBottom + grid.cellSize);
        ctx.fillRect(px, py, grid.cellSize, grid.cellSize);
      }

      // Draw granular occupancy probes so debug view reflects subcell collision detail.
      for (const [cellKey, sample] of coverageMap.entries()) {
        if (!sample || !sample.mask || sample.resolution <= 1) {
          continue;
        }

        const split = cellKey.split(",");
        const cellX = Cast.toNumber(split[0]);
        const cellY = Cast.toNumber(split[1]);
        const worldLeft = grid.left + (cellX * grid.cellSize);
        const worldBottom = grid.bottom + (cellY * grid.cellSize);
        const cellPxX = worldLeft - grid.viewLeft;
        const cellPxY = grid.viewTop - (worldBottom + grid.cellSize);
        const subW = grid.cellSize / sample.resolution;
        const subH = grid.cellSize / sample.resolution;

        ctx.strokeStyle = "rgba(255, 255, 255, 0.17)";
        ctx.lineWidth = 1;
        for (let i = 1; i < sample.resolution; i++) {
          const x = cellPxX + (i * subW);
          const y = cellPxY + (i * subH);
          ctx.beginPath();
          ctx.moveTo(x, cellPxY);
          ctx.lineTo(x, cellPxY + grid.cellSize);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cellPxX, y);
          ctx.lineTo(cellPxX + grid.cellSize, y);
          ctx.stroke();
        }

        ctx.fillStyle = "rgba(255, 70, 70, 0.35)";
        for (let xi = 0; xi < sample.resolution; xi++) {
          for (let yi = 0; yi < sample.resolution; yi++) {
            const maskIndex = (yi * sample.resolution) + xi;
            if (!sample.mask[maskIndex]) continue;
            const subX = cellPxX + (xi * subW);
            const subY = cellPxY + ((sample.resolution - 1 - yi) * subH);
            ctx.fillRect(subX, subY, subW, subH);
          }
        }
      }

      ctx.strokeStyle = "rgba(110, 220, 255, 0.25)";
      ctx.lineWidth = 1;
      const firstGridLineX = grid.left - grid.viewLeft;
      for (let x = 0; x <= grid.columns; x++) {
        const px = firstGridLineX + (x * grid.cellSize);
        if (px < -1 || px > width + 1) continue;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();
      }

      const firstGridLineY = grid.viewTop - grid.bottom;
      for (let y = 0; y <= grid.rows; y++) {
        const py = firstGridLineY - (y * grid.cellSize);
        if (py < -1 || py > height + 1) continue;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();
      }

      if (stagePath.length > 0) {
        ctx.strokeStyle = "rgba(255, 230, 120, 0.95)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < stagePath.length; i++) {
          const [stageX, stageY] = stagePath[i];
          const px = stageX - grid.viewLeft;
          const py = grid.viewTop - stageY;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 230, 120, 0.95)";
        for (const [stageX, stageY] of stagePath) {
          const px = stageX - grid.viewLeft;
          const py = grid.viewTop - stageY;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      renderer.updateBitmapSkin(this._debugSkinId, canvas, 1, [width / 2, height / 2]);
    }

    _updateDebugOverlayForEditingTarget() {
      if (!this._showDebugOverlay) {
        this._hideDebugOverlayDrawable();
        return;
      }
      if (!this._ensureDebugOverlayDrawable()) {
        return;
      }

      const editingTarget = this._getEditingTarget();
      const targetId = editingTarget ? editingTarget.id : "";
      const data = this._debugDataByTargetId.get(targetId);
      const grid = data ? data.grid : this._getGridConfig();
      const blocked = data ? data.blocked : new Set();
      const stagePath = data ? data.stagePath : [];
      const coverageMap = data ? data.coverageMap : new Map();
      this._drawDebugOverlay(grid, blocked, stagePath, coverageMap);
    }

    _buildBlockedCells(grid, excludedTargetId = "") {
      const blocked = new Set();
      const coverageMap = new Map();
      const obstacleInfos = this._getObstacleTargets(excludedTargetId).map(target => ({
        target,
        touchTester: this._createTargetTouchTester(target)
      }));

      for (const obstacleInfo of obstacleInfos) {
        const target = obstacleInfo.target;
        const targetStats = {
          blockedCount: 0,
          bestCandidate: null,
          minX: null,
          maxX: null,
          minY: null,
          maxY: null
        };

        const bounds = typeof target.getBounds === "function" ? target.getBounds() : null;
        if (!bounds) {
          const [cellX, cellY] = this._stageToCell(target.x || 0, target.y || 0, grid);
          const key = this._key(cellX, cellY);
          blocked.add(key);
          coverageMap.set(key, {
            hits: 1,
            total: 1,
            resolution: 1,
            mask: [true]
          });
          targetStats.blockedCount++;
          continue;
        }

        const left = this._clamp(Math.floor((bounds.left - grid.left) / grid.cellSize), 0, grid.columns - 1);
        const right = this._clamp(Math.floor((bounds.right - grid.left) / grid.cellSize), 0, grid.columns - 1);
        const bottom = this._clamp(Math.floor((bounds.bottom - grid.bottom) / grid.cellSize), 0, grid.rows - 1);
        const top = this._clamp(Math.floor((bounds.top - grid.bottom) / grid.cellSize), 0, grid.rows - 1);

        const minX = Math.min(left, right);
        const maxX = Math.max(left, right);
        const minY = Math.min(bottom, top);
        const maxY = Math.max(bottom, top);
        targetStats.minX = minX;
        targetStats.maxX = maxX;
        targetStats.minY = minY;
        targetStats.maxY = maxY;

        if (this._canSampleTargetInStageSpace(target)) {
          this._markBlockedCellsAdaptive(obstacleInfo, grid, minX, maxX, minY, maxY, blocked, coverageMap, targetStats, 0);
        } else {
          for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
              const key = this._key(x, y);
              blocked.add(key);
              coverageMap.set(key, {
                hits: 1,
                total: 1,
                resolution: 1,
                mask: [true]
              });
              targetStats.blockedCount++;
            }
          }
        }

        // Deterministic guard per obstacle target: ensure at least one occupied cell
        // if the sampler found any applicable hit for this target.
        if (targetStats.blockedCount === 0 && targetStats.bestCandidate) {
          blocked.add(this._key(targetStats.bestCandidate.x, targetStats.bestCandidate.y));
          targetStats.blockedCount++;
        }

        // Recovery path: if adaptive subdivision produced no occupied cells,
        // run a dense per-cell probe scan inside the target bounds. This avoids
        // broad AABB fallback while preventing silent misses on tricky SVGs.
        if (targetStats.blockedCount === 0 && Number.isInteger(targetStats.minX)) {
          this._recoverBlockedCellsByDenseScan(obstacleInfo, grid, targetStats, blocked, coverageMap);
        }
      }
      return {blocked, coverageMap};
    }

    _canSampleTargetInStageSpace(target) {
      const renderer = this.runtime && this.runtime.renderer;
      if (!renderer || typeof target.drawableID !== "number") {
        return false;
      }
      const allDrawables = renderer._allDrawables;
      return Boolean(allDrawables && allDrawables[target.drawableID]);
    }

    _isVectorCostumeTarget(target) {
      if (!target || typeof target.getCurrentCostume !== "function") {
        return false;
      }
      const costume = target.getCurrentCostume();
      if (!costume) {
        return false;
      }
      const dataFormat = Cast.toString(costume.dataFormat || "").toLowerCase();
      return dataFormat === "svg";
    }

    _createTargetTouchTester(target) {
      const renderer = this.runtime && this.runtime.renderer;
      if (!renderer || typeof target.drawableID !== "number") {
        return null;
      }

      const allDrawables = renderer._allDrawables;
      if (!allDrawables) {
        return null;
      }

      const drawable = allDrawables[target.drawableID];
      if (!drawable) {
        return null;
      }

      const drawableCtor = drawable.constructor;
      const sampleColor4b = drawableCtor && typeof drawableCtor.sampleColor4b === "function"
        ? drawableCtor.sampleColor4b
        : null;
      if (!sampleColor4b) {
        return null;
      }

      if (typeof drawable.updateCPURenderAttributes === "function") {
        drawable.updateCPURenderAttributes();
      }

      const color = new Uint8ClampedArray(4);
      const scratchPoint = [0, 0, 0];
      const alphaThreshold = this._isVectorCostumeTarget(target) ? 96 : 1;

      // Sample directly from the Drawable's transformed silhouette in scratch
      // space. This follows renderer math exactly and avoids custom projection.
      return (x, y) => {
        scratchPoint[0] = x;
        scratchPoint[1] = y;
        scratchPoint[2] = 0;
        sampleColor4b(scratchPoint, drawable, color);
        return color[3] >= alphaThreshold;
      };
    }

    _targetTouchesStagePoint(target, x, y, touchTester = null) {
      if (typeof touchTester === "function") {
        return touchTester(x, y);
      }

      const renderer = this.runtime && this.runtime.renderer;
      if (!renderer || typeof target.drawableID !== "number") {
        return false;
      }

      const allDrawables = renderer._allDrawables;
      if (!allDrawables) {
        return false;
      }

      const drawable = allDrawables[target.drawableID];
      if (!drawable || typeof drawable.isTouching !== "function") {
        return false;
      }

      if (typeof drawable.updateCPURenderAttributes === "function") {
        drawable.updateCPURenderAttributes();
      }

      return drawable.isTouching([x, y, 0]);
    }

    _markBlockedCellsAdaptive(obstacleInfo, grid, minX, maxX, minY, maxY, blocked, coverageMap, targetStats, depth) {
      if (minX > maxX || minY > maxY) {
        return;
      }

      const isVector = this._isVectorCostumeTarget(obstacleInfo.target);
      const width = (maxX - minX) + 1;
      const height = (maxY - minY) + 1;

      // For vector targets, skip region-level classification pruning.
      // Sparse line art can be missed by coarse region probes and appear as
      // "cut off" walls. Per-cell rasterization is slower but reliable.
      if (isVector) {
        this._rasterizeRegionCells(obstacleInfo, grid, minX, maxX, minY, maxY, blocked, coverageMap, targetStats);
        return;
      }

      const status = this._classifyRegionOccupancy(obstacleInfo, grid, minX, maxX, minY, maxY);

      if (status === "empty") {
        return;
      }

      if (width === 1 && height === 1) {
        blocked.add(this._key(minX, minY));
        targetStats.blockedCount++;
        return;
      }

      const shouldRasterizeNow = depth >= 6 || (width * height) <= 6;
      if (!isVector && status === "full" && (width * height) <= 36) {
        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            blocked.add(this._key(x, y));
            targetStats.blockedCount++;
          }
        }
        return;
      }

      if (shouldRasterizeNow) {
        this._rasterizeRegionCells(obstacleInfo, grid, minX, maxX, minY, maxY, blocked, coverageMap, targetStats);
        return;
      }

      const splitX = Math.floor((minX + maxX) / 2);
      const splitY = Math.floor((minY + maxY) / 2);

      this._markBlockedCellsAdaptive(obstacleInfo, grid, minX, splitX, minY, splitY, blocked, coverageMap, targetStats, depth + 1);
      this._markBlockedCellsAdaptive(obstacleInfo, grid, splitX + 1, maxX, minY, splitY, blocked, coverageMap, targetStats, depth + 1);
      this._markBlockedCellsAdaptive(obstacleInfo, grid, minX, splitX, splitY + 1, maxY, blocked, coverageMap, targetStats, depth + 1);
      this._markBlockedCellsAdaptive(obstacleInfo, grid, splitX + 1, maxX, splitY + 1, maxY, blocked, coverageMap, targetStats, depth + 1);
    }

    _classifyRegionOccupancy(obstacleInfo, grid, minX, maxX, minY, maxY) {
      const rect = this._cellRegionToStageRect(minX, maxX, minY, maxY, grid);
      const widthCells = (maxX - minX) + 1;
      const heightCells = (maxY - minY) + 1;
      const areaCells = widthCells * heightCells;
      const points = this._regionProbePoints(rect);

      let touchCount = 0;
      for (const point of points) {
        if (this._targetTouchesStagePoint(obstacleInfo.target, point[0], point[1], obstacleInfo.touchTester)) {
          touchCount++;
        }
      }

      if (touchCount === 0) {
        // Be conservative near sprite edges: small regions are rasterized directly
        // to avoid false negatives from sparse probe misses.
        if (areaCells <= 16) {
          return "mixed";
        }

        // Vector silhouettes can be thin and transformed; sparse region probes may
        // miss even when occupancy exists. Keep subdividing for medium-size regions.
        if (this._isVectorCostumeTarget(obstacleInfo.target) && areaCells <= 256) {
          return "mixed";
        }
        return "empty";
      }
      if (touchCount === points.length) {
        return "full";
      }
      return "mixed";
    }

    _regionProbePoints(rect) {
      const width = Math.max(0.001, rect.right - rect.left);
      const height = Math.max(0.001, rect.top - rect.bottom);
      const x1 = rect.left + (width / 6);
      const x2 = rect.left + (width / 2);
      const x3 = rect.right - (width / 6);
      const y1 = rect.bottom + (height / 6);
      const y2 = rect.bottom + (height / 2);
      const y3 = rect.top - (height / 6);

      return [
        [x1, y1], [x2, y1], [x3, y1],
        [x1, y2], [x2, y2], [x3, y2],
        [x1, y3], [x2, y3], [x3, y3],
        [rect.left, rect.bottom], [rect.left, rect.top],
        [rect.right, rect.bottom], [rect.right, rect.top],
        [rect.left, y2], [rect.right, y2], [x2, rect.bottom], [x2, rect.top]
      ];
    }

    _cellRegionToStageRect(minX, maxX, minY, maxY, grid) {
      return {
        left: grid.left + (minX * grid.cellSize),
        right: grid.left + ((maxX + 1) * grid.cellSize),
        bottom: grid.bottom + (minY * grid.cellSize),
        top: grid.bottom + ((maxY + 1) * grid.cellSize)
      };
    }

    _rasterizeRegionCells(obstacleInfo, grid, minX, maxX, minY, maxY, blocked, coverageMap, targetStats) {
      const isVector = this._isVectorCostumeTarget(obstacleInfo.target);
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const sample = this._sampleCellCoverage(obstacleInfo, grid, x, y);
          if (coverageMap) {
            coverageMap.set(this._key(x, y), {
              hits: sample.hits,
              total: sample.total,
              resolution: sample.resolution,
              mask: sample.mask,
              boundaryTouch: sample.boundaryTouch
            });
          }

          if (sample.hits > 0) {
            if (!targetStats.bestCandidate ||
              sample.coverage > targetStats.bestCandidate.coverage ||
              (sample.coverage === targetStats.bestCandidate.coverage && (y < targetStats.bestCandidate.y || (y === targetStats.bestCandidate.y && x < targetStats.bestCandidate.x)))) {
              targetStats.bestCandidate = {
                x,
                y,
                coverage: sample.coverage
              };
            }
          }

          const shouldBlock = isVector
            ? (sample.hits > 0)
            : (sample.hits > 0 || sample.coverage >= this._cellCoverageThreshold || sample.boundaryTouch);

          if (shouldBlock) {
            blocked.add(this._key(x, y));
            targetStats.blockedCount++;
          }
        }
      }
    }

    _sampleCellCoverage(obstacleInfo, grid, cellX, cellY) {
      const rect = this._cellRegionToStageRect(cellX, cellX, cellY, cellY, grid);
      const width = rect.right - rect.left;
      const height = rect.top - rect.bottom;
      const isVector = this._isVectorCostumeTarget(obstacleInfo.target);
      const resolution = isVector ? Math.max(this._subcellProbeResolution, 8) : this._subcellProbeResolution;
      const totalSamples = resolution * resolution;
      let hits = 0;
      const mask = new Array(totalSamples).fill(false);

      for (let xi = 0; xi < resolution; xi++) {
        for (let yi = 0; yi < resolution; yi++) {
          const x = rect.left + (((xi + 0.5) / resolution) * width);
          const y = rect.bottom + (((yi + 0.5) / resolution) * height);
          const maskIndex = (yi * resolution) + xi;
          if (this._targetTouchesStagePoint(obstacleInfo.target, x, y, obstacleInfo.touchTester)) {
            hits++;
            mask[maskIndex] = true;
          }
        }
      }

      let boundaryTouch = false;
      const insetX = Math.max(0.001, width * this._boundaryProbeInset);
      const insetY = Math.max(0.001, height * this._boundaryProbeInset);
      const boundaryProbes = [
        [rect.left + insetX, rect.bottom + insetY],
        [rect.left + insetX, rect.top - insetY],
        [rect.right - insetX, rect.bottom + insetY],
        [rect.right - insetX, rect.top - insetY],
        [rect.left + (width / 2), rect.bottom + insetY],
        [rect.left + (width / 2), rect.top - insetY],
        [rect.left + insetX, rect.bottom + (height / 2)],
        [rect.right - insetX, rect.bottom + (height / 2)]
      ];

      for (const probe of boundaryProbes) {
        if (this._targetTouchesStagePoint(obstacleInfo.target, probe[0], probe[1], obstacleInfo.touchTester)) {
          boundaryTouch = true;
          break;
        }
      }

      // If only boundary probes hit, promote one deterministic sample so
      // debug data and deterministic-cell selection remain consistent.
      if (!isVector && hits === 0 && boundaryTouch) {
        hits = 1;
        const middleIndex = Math.floor(totalSamples / 2);
        mask[middleIndex] = true;
      }

      const coverage = hits / totalSamples;
      return {
        hits,
        total: totalSamples,
        resolution,
        mask,
        coverage,
        boundaryTouch
      };
    }

    _recoverBlockedCellsByDenseScan(obstacleInfo, grid, targetStats, blocked, coverageMap) {
      const minX = targetStats.minX;
      const maxX = targetStats.maxX;
      const minY = targetStats.minY;
      const maxY = targetStats.maxY;
      const denseResolution = 8;

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          if (blocked.has(this._key(x, y))) {
            continue;
          }

          const rect = this._cellRegionToStageRect(x, x, y, y, grid);
          const width = rect.right - rect.left;
          const height = rect.top - rect.bottom;
          let found = false;

          for (let xi = 0; xi < denseResolution && !found; xi++) {
            for (let yi = 0; yi < denseResolution; yi++) {
              const sx = rect.left + (((xi + 0.5) / denseResolution) * width);
              const sy = rect.bottom + (((yi + 0.5) / denseResolution) * height);
              if (this._targetTouchesStagePoint(obstacleInfo.target, sx, sy, obstacleInfo.touchTester)) {
                found = true;
                break;
              }
            }
          }

          if (found) {
            const key = this._key(x, y);
            blocked.add(key);
            targetStats.blockedCount++;
            coverageMap.set(key, {
              hits: 1,
              total: 1,
              resolution: 1,
              mask: [true],
              boundaryTouch: true
            });
          }
        }
      }
    }

    _getMoverClearance(util, grid) {
      const target = util && util.target ? util.target : null;
      if (!target || typeof target.getBounds !== "function") {
        return {padX: 0, padY: 0};
      }

      const bounds = target.getBounds();
      if (!bounds) {
        return {padX: 0, padY: 0};
      }

      const width = Math.max(0, bounds.right - bounds.left);
      const height = Math.max(0, bounds.top - bounds.bottom);
      const halfCell = grid.cellSize / 2;
      const halfWidth = width / 2;
      const halfHeight = height / 2;

      // Obstacles already consume one full cell, so only add extra clearance
      // for mover size beyond half a cell footprint.
      const padX = Math.max(0, Math.ceil((halfWidth - halfCell) / grid.cellSize));
      const padY = Math.max(0, Math.ceil((halfHeight - halfCell) / grid.cellSize));

      return {padX, padY};
    }

    _inflateBlockedCells(blocked, coverageMap, grid, padX, padY) {
      if (padX <= 0 && padY <= 0) {
        return blocked;
      }

      const inflated = new Set(blocked);
      const baseKeys = Array.from(blocked);

      for (const key of baseKeys) {
        const split = key.split(",");
        const baseX = Cast.toNumber(split[0]);
        const baseY = Cast.toNumber(split[1]);

        for (let dx = -padX; dx <= padX; dx++) {
          for (let dy = -padY; dy <= padY; dy++) {
            const nx = baseX + dx;
            const ny = baseY + dy;
            if (nx < 0 || ny < 0 || nx >= grid.columns || ny >= grid.rows) {
              continue;
            }

            // Keep an ellipse-like expansion so large sprites don't look too boxy.
            const normX = padX === 0 ? 0 : (dx / (padX + 0.5));
            const normY = padY === 0 ? 0 : (dy / (padY + 0.5));
            if ((normX * normX) + (normY * normY) > 1) {
              continue;
            }

            const nKey = this._key(nx, ny);
            inflated.add(nKey);
            if (coverageMap && !coverageMap.has(nKey)) {
              coverageMap.set(nKey, {
                hits: 1,
                total: 1,
                resolution: 1,
                mask: [true]
              });
            }
          }
        }
      }

      return inflated;
    }

    _findNearestFreeCell(originCell, blocked, grid) {
      const originKey = this._key(originCell[0], originCell[1]);
      if (!blocked.has(originKey)) {
        return originCell;
      }

      const maxRadius = Math.max(grid.columns, grid.rows);
      for (let radius = 1; radius <= maxRadius; radius++) {
        const minX = originCell[0] - radius;
        const maxX = originCell[0] + radius;
        const minY = originCell[1] - radius;
        const maxY = originCell[1] + radius;

        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            const onRing = x === minX || x === maxX || y === minY || y === maxY;
            if (!onRing) continue;
            if (x < 0 || y < 0 || x >= grid.columns || y >= grid.rows) continue;

            const key = this._key(x, y);
            if (!blocked.has(key)) {
              return [x, y];
            }
          }
        }
      }

      return null;
    }

    _heuristic(x1, y1, x2, y2) {
      const dx = x1 - x2;
      const dy = y1 - y2;
      return Math.sqrt((dx * dx) + (dy * dy));
    }

    _findPathCells(startCell, endCell, blocked, grid) {
      const startKey = this._key(startCell[0], startCell[1]);
      const endKey = this._key(endCell[0], endCell[1]);
      if (startKey === endKey) {
        return [startCell];
      }

      const open = [{
        x: startCell[0],
        y: startCell[1],
        g: 0,
        f: this._heuristic(startCell[0], startCell[1], endCell[0], endCell[1])
      }];
      const cameFrom = new Map();
      const gScore = new Map();
      gScore.set(startKey, 0);

      while (open.length > 0) {
        let bestIndex = 0;
        for (let i = 1; i < open.length; i++) {
          if (open[i].f < open[bestIndex].f) {
            bestIndex = i;
          }
        }

        const current = open.splice(bestIndex, 1)[0];
        const currentKey = this._key(current.x, current.y);

        const bestKnownG = gScore.has(currentKey) ? gScore.get(currentKey) : Infinity;
        if (current.g > bestKnownG) {
          continue;
        }

        if (currentKey === endKey) {
          return this._reconstructPath(cameFrom, endKey);
        }

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;

            const nx = current.x + dx;
            const ny = current.y + dy;
            if (nx < 0 || ny < 0 || nx >= grid.columns || ny >= grid.rows) continue;

            const key = this._key(nx, ny);
            if (blocked.has(key)) continue;

            // Prevent cutting diagonally through obstacle corners.
            if (dx !== 0 && dy !== 0) {
              const sideA = this._key(current.x + dx, current.y);
              const sideB = this._key(current.x, current.y + dy);
              if (blocked.has(sideA) || blocked.has(sideB)) {
                continue;
              }
            }

            const stepCost = (dx !== 0 && dy !== 0) ? DIAGONAL_COST : 1;
            const tentativeG = current.g + stepCost;
            const knownG = gScore.has(key) ? gScore.get(key) : Infinity;
            if (tentativeG >= knownG) continue;

            cameFrom.set(key, currentKey);
            gScore.set(key, tentativeG);

            open.push({
              x: nx,
              y: ny,
              g: tentativeG,
              f: tentativeG + this._heuristic(nx, ny, endCell[0], endCell[1])
            });
          }
        }
      }

      return [];
    }

    _reconstructPath(cameFrom, endKey) {
      const path = [];
      let current = endKey;

      while (current) {
        const split = current.split(",");
        path.push([Cast.toNumber(split[0]), Cast.toNumber(split[1])]);

        if (!cameFrom.has(current)) {
          break;
        }
        current = cameFrom.get(current);
      }

      path.reverse();
      return path;
    }

    _samplePathAt(pathPoints, t) {
      const lastIndex = pathPoints.length - 1;
      const clampedT = this._clamp(t, 0, lastIndex);
      const lowIndex = Math.floor(clampedT);
      const highIndex = Math.min(lastIndex, lowIndex + 1);
      const alpha = clampedT - lowIndex;

      const low = pathPoints[lowIndex];
      const high = pathPoints[highIndex];
      return [
        low[0] + ((high[0] - low[0]) * alpha),
        low[1] + ((high[1] - low[1]) * alpha)
      ];
    }

    _interpolatePath(pathInput, factorInput) {
      const path = Cast.toArray(pathInput).map(point => this._parseVector(point));
      if (path.length <= 1) {
        return path;
      }

      let factor = Math.abs(Cast.toNumber(factorInput));
      if (!Number.isFinite(factor) || factor === 0) {
        factor = 1;
      }

      const lastIndex = path.length - 1;
      // Multiplier semantics:
      // 1 = unchanged density, >1 = denser path, <1 = sparser path.
      const sampleStep = this._clamp(1 / factor, 0.05, Math.max(1, lastIndex));
      const maxSamples = 4096;
      const result = [];

      let sampleCount = 0;
      for (let t = 0; t < lastIndex && sampleCount < maxSamples; t += sampleStep) {
        const point = this._samplePathAt(path, t);
        const previous = result[result.length - 1];
        if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) {
          result.push(point);
        }
        sampleCount++;
      }

      const lastPoint = path[lastIndex];
      const previous = result[result.length - 1];
      if (!previous || previous[0] !== lastPoint[0] || previous[1] !== lastPoint[1]) {
        result.push(lastPoint);
      }

      return result;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedPathfindingBlocks.extensionId,
        name: translate("Pathfinding"),
        color1: "#3c9f73",
        requires: {
          usbVectors: [
            "vec2"
          ],
          usbSpriteTags: [
            "addTag"
          ]
        },
        blocks: [
          {
            opcode: "setObstacleTags",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set path obstacle tags [TAGS]"),
            arguments: {
              TAGS: {
                type: Scratch.ArgumentType.ARRAY,
                defaultValue: ["solid"]
              }
            }
          },
          {
            opcode: "setObstacleSprite",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set path obstacle sprite [SPRITE]"),
            arguments: {
              SPRITE: {
                type: Scratch.ArgumentType.STRING,
                menu: "sprites"
              }
            }
          },
          "---",
          {
            opcode: "findPath",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("find path from [A] to [B]"),
            arguments: {
              A: {
                type: Scratch.ArgumentType.VECTOR,
                defaultValue: [0, 0]
              },
              B: {
                type: Scratch.ArgumentType.VECTOR,
                defaultValue: [100, 100]
              }
            }
          },
          {
            opcode: "interpolatePath",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("interpolate path [PATH] by [FACTOR]"),
            arguments: {
              PATH: {
                type: Scratch.ArgumentType.ARRAY
              },
              FACTOR: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 2
              }
            }
          }
        ],
        menus: {
          sprites: {
            acceptReporters: true,
            items: "_getSpriteMenu"
          }
        }
      };
    }

    setObstacleTags(args) {
      this._obstacleTags = Cast.toArray(args.TAGS)
        .map(tag => Cast.toString(tag))
        .filter(tag => tag !== "");
      this._obstacleSource = "tag";
    }

    setObstacleSprite(args) {
      const sprite = Cast.toString(args.SPRITE);
      if (!sprite || sprite === UnsandboxedPathfindingBlocks.ALL_SPRITES_OPTION) {
        this._obstacleSprite = UnsandboxedPathfindingBlocks.ALL_SPRITES_OPTION;
        this._obstacleSource = "all";
        return;
      }

      this._obstacleSprite = sprite;
      this._obstacleSource = "sprite";
    }

    interpolatePath(args) {
      return this._interpolatePath(args.PATH, args.FACTOR);
    }

    findPath(args, util) {
      const [startX, startY] = this._parseVector(args.A);
      const [endX, endY] = this._parseVector(args.B);
      const selfTarget = (util && util.target) || null;
      const selfTargetId = selfTarget ? selfTarget.id : "";

      const obstacleTargets = this._getObstacleTargets(selfTargetId);
      const target = (util && util.target) || this._getEditingTarget();
      const targetId = target ? target.id : "";

      let lastGrid = null;
      let lastBlocked = new Set();
      let lastCoverageMap = new Map();
      let solvedStagePath = null;

      const paddingMultipliers = [1, 1.75, 2.5];
      for (const paddingMultiplier of paddingMultipliers) {
        const grid = this._getGridConfig([startX, startY], [endX, endY], obstacleTargets, paddingMultiplier);
        const startCell = this._stageToCell(startX, startY, grid);
        const endCell = this._stageToCell(endX, endY, grid);

        const {blocked, coverageMap} = this._buildBlockedCells(grid, selfTargetId);
        const clearance = this._getMoverClearance(util, grid);
        const finalBlocked = this._inflateBlockedCells(
          blocked,
          coverageMap,
          grid,
          clearance.padX,
          clearance.padY
        );

        lastGrid = grid;
        lastBlocked = finalBlocked;
        lastCoverageMap = coverageMap;

        const resolvedStartCell = this._findNearestFreeCell(startCell, finalBlocked, grid);
        const resolvedEndCell = this._findNearestFreeCell(endCell, finalBlocked, grid);
        if (!resolvedStartCell || !resolvedEndCell) {
          continue;
        }

        const cellPath = this._findPathCells(resolvedStartCell, resolvedEndCell, finalBlocked, grid);
        if (cellPath.length === 0) {
          continue;
        }

        const stagePath = cellPath.map(cell => this._cellToStage(cell[0], cell[1], grid));
        stagePath[0] = [startX, startY];
        const endAdjusted = resolvedEndCell[0] !== endCell[0] || resolvedEndCell[1] !== endCell[1];
        if (!endAdjusted) {
          stagePath[stagePath.length - 1] = [endX, endY];
        }
        solvedStagePath = stagePath;
        break;
      }

      if (!solvedStagePath) {
        this._debugDataByTargetId.set(targetId, {
          grid: lastGrid || this._getGridConfig([startX, startY], [endX, endY], obstacleTargets),
          blocked: lastBlocked,
          coverageMap: lastCoverageMap,
          stagePath: []
        });
        this._updateDebugOverlayForEditingTarget();
        return [];
      }

      this._debugDataByTargetId.set(targetId, {
        grid: lastGrid,
        blocked: lastBlocked,
        coverageMap: lastCoverageMap,
        stagePath: solvedStagePath
      });
      this._updateDebugOverlayForEditingTarget();

      return solvedStagePath;
    }
  }

  Scratch.extensions.register(new UnsandboxedPathfindingBlocks());
})(Scratch);
