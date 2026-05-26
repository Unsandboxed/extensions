(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  const CLIP_MASK_COSTUME = Symbol("clipMask.costume");
  const CLIP_MASK_SKIN_ID = Symbol("clipMask.skinId");
  const CLIP_MASK_X = Symbol("clipMask.x");
  const CLIP_MASK_Y = Symbol("clipMask.y");
  const CLIP_MASK_USE_SPRITE = Symbol("clipMask.useSprite");
  const CLIP_MASK_SOURCE_SPRITE = Symbol("clipMask.sourceSprite");

  class UnsandboxedClippingBlocks {
    static extensionId = "usbClipMask";

    constructor() {
      /**
       * The Scratch Virtual Machine instance.
       * @type {VirtualMachine}
       */
      this.vm = Scratch.vm;

      /**
       * The runtime instantiating this extension.
       * @type {Runtime}
       */
      this.runtime = this.vm.runtime;

      /**
       * Decoder used when converting byte payloads from data URIs to strings.
       * @type {TextDecoder}
       */
      this.textDecoder = new TextDecoder();

      this.runtime.targets.forEach(target => this._implementMaskForTarget(target));
      this.runtime.on("targetWasCreated", (target, originalTarget) =>
        this._implementMaskForTarget(target, originalTarget)
      );
      this.runtime.on("PROJECT_LOADED", () => {
        this.runtime.targets.forEach(target => this._implementMaskForTarget(target));
      });
      this.runtime.on("AFTER_EXECUTE", () => {
        this._syncSpriteMasks();
      });
      this.runtime.on("RUNTIME_DISPOSED", () => {
        for (const target of this.runtime.targets) {
          this._destroyGeneratedMaskSkin(target);
        }
      });

      this._installSecretTransformations();
    }

    /**
     * Register Blockly secret transformation defaults for hidden utility blocks.
     */
    _installSecretTransformations() {
      if (!Scratch.gui || typeof Scratch.gui.getBlockly !== "function") return;

      Scratch.gui.getBlockly().then(Blockly => {
        if (!Blockly || !Blockly.SecretTransformations) return;
        Blockly.SecretTransformations.addDefaultShadow(
          "usbClipMask_useCostumeMask",
          "COSTUME",
          "<shadow type=\"looks_costume\"><field name=\"COSTUME\"></field></shadow>"
        );
        Blockly.SecretTransformations.addDefaultShadow(
          "usbClipMask_useCostumeMaskAt",
          "COSTUME",
          "<shadow type=\"looks_costume\"><field name=\"COSTUME\"></field></shadow>"
        );
        Blockly.SecretTransformations.addDefaultShadow(
          "usbClipMask_useURLMask",
          "URL",
          "<shadow type=\"text\"><field name=\"TEXT\">https://extensions.turbowarp.org/dango.png</field></shadow>"
        );
        Blockly.SecretTransformations.addGroup([
          "usbClipMask_useCostumeMask",
          "usbClipMask_useURLMask"
        ]);
      });
    }

    /**
     * Safely fetch a target's costume list.
     * @param {VM.RenderedTarget} target
     * @returns {Array<object>}
     */
    _getTargetCostumes(target) {
      if (!target || typeof target.getCostumes !== "function") return [];
      return target.getCostumes();
    }

    /**
     * Build dynamic sprite list for sprite mask block.
     * @returns {Array<{text: string, value: string}>}
     */
    _getMaskSprites() {
      const spriteNames = [
        {text: "myself", value: "_myself_"}
      ];

      const targets = this.runtime.targets;
      for (let i = 1; i < targets.length; i++) {
        const target = targets[i];
        if (target.isOriginal && !target.isStage) {
          const name = target.getName();
          spriteNames.push({text: name, value: name});
        }
      }
      return spriteNames;
    }

    /**
     * Resolve a sprite reference from menus/reporters to a target.
     * @param {VM.RenderedTarget} currentTarget
     * @param {*} value
     * @returns {?VM.RenderedTarget}
     */
    _resolveSpriteTarget(currentTarget, value) {
      const name = Cast.toString(value);
      if (name === "_myself_") {
        return currentTarget || null;
      }
      if (name === "backdrop") {
        const stage = this.runtime.getTargetForStage ? this.runtime.getTargetForStage() : null;
        return stage || null;
      }
      return this.runtime.getSpriteTargetByName ? this.runtime.getSpriteTargetByName(name) : null;
    }

    /**
     * Resolve a costume reference (index/name/value) to a zero-based index.
     * @param {VM.RenderedTarget} target
     * @param {*} value
     * @returns {?number}
     */
    _resolveCostumeIndex(target, value) {
      const costumes = this._getTargetCostumes(target);
      if (costumes.length === 0) return null;

      if (typeof value === "number" && Number.isFinite(value)) {
        const index = Math.round(value) - 1;
        return index >= 0 && index < costumes.length ? index : null;
      }

      const numericValue = Number(value);
      if (Number.isFinite(numericValue) && String(value).trim() !== "") {
        const index = Math.round(numericValue) - 1;
        return index >= 0 && index < costumes.length ? index : null;
      }

      const name = Cast.toString(value);
      const exactIndex = costumes.findIndex(c => c.name === name);
      if (exactIndex !== -1) return exactIndex;

      const lower = name.toLowerCase();
      const lowerIndex = costumes.findIndex(c => c.name.toLowerCase() === lower);
      return lowerIndex === -1 ? null : lowerIndex;
    }

    /**
     * Decode a data URI into mime metadata and raw bytes.
     * @param {*} dataURIValue
     * @returns {{mimeType: string, bytes: Uint8Array, source: string}}
     */
    _decodeDataURI(dataURIValue) {
      const dataURI = Cast.toString(dataURIValue).trim();
      if (!dataURI.startsWith("data:")) {
        throw new Error("Not a data URI");
      }

      const commaIndex = dataURI.indexOf(",");
      if (commaIndex === -1) {
        throw new Error("Malformed data URI");
      }

      const header = dataURI.slice(5, commaIndex);
      const payload = dataURI.slice(commaIndex + 1);
      const headerParts = header.split(";").filter(Boolean);
      const mimeType = headerParts.length > 0 ? headerParts[0] : "text/plain;charset=US-ASCII";
      const isBase64 = headerParts.includes("base64");

      let bytes;
      if (isBase64) {
        const binary = atob(payload);
        bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
      } else {
        const decoded = decodeURIComponent(payload);
        bytes = new TextEncoder().encode(decoded);
      }

      return {
        mimeType: mimeType.toLowerCase(),
        bytes,
        source: dataURI
      };
    }

    /**
     * Load an image element from a URL or data URI for bitmap skin creation.
     * @param {string} sourceURL
     * @returns {Promise<HTMLImageElement>}
     */
    _loadImageFromURL(sourceURL) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Unable to load image URL"));
        image.src = sourceURL;
      });
    }

    /**
     * Destroy the generated mask skin associated with a target, if any.
     * @param {VM.RenderedTarget} target
     */
    _destroyGeneratedMaskSkin(target) {
      if (!target || !target.renderer) return;
      const skinId = target[CLIP_MASK_SKIN_ID];
      if (typeof skinId === "number") {
        target.renderer.destroySkin(skinId);
      }
      target[CLIP_MASK_SKIN_ID] = null;
    }

    /**
     * Ensure clip-mask state exists for a target and initialize clone state.
     * @param {VM.RenderedTarget} target
     * @param {VM.RenderedTarget} [originalTarget]
     */
    _implementMaskForTarget(target, originalTarget) {
      if (!target || target.isStage) return;

      if (CLIP_MASK_COSTUME in target) {
        this._applyMaskToTarget(target);
        return;
      }

      if (originalTarget) {
        target[CLIP_MASK_COSTUME] = originalTarget[CLIP_MASK_COSTUME];
        target[CLIP_MASK_SKIN_ID] = null;
        target[CLIP_MASK_X] = originalTarget[CLIP_MASK_X];
        target[CLIP_MASK_Y] = originalTarget[CLIP_MASK_Y];
        target[CLIP_MASK_USE_SPRITE] = originalTarget[CLIP_MASK_USE_SPRITE];
        target[CLIP_MASK_SOURCE_SPRITE] = originalTarget[CLIP_MASK_SOURCE_SPRITE];
      } else {
        target[CLIP_MASK_COSTUME] = null;
        target[CLIP_MASK_SKIN_ID] = null;
        target[CLIP_MASK_X] = 0;
        target[CLIP_MASK_Y] = 0;
        target[CLIP_MASK_USE_SPRITE] = true;
        target[CLIP_MASK_SOURCE_SPRITE] = null;
      }
      this._applyMaskToTarget(target);
    }

    /**
     * Keep sprite-driven masks synced with source sprite movement/costume changes.
     */
    _syncSpriteMasks() {
      for (const target of this.runtime.targets) {
        if (!target || target.isStage) continue;
        if (!(CLIP_MASK_SOURCE_SPRITE in target)) continue;
        if (!target[CLIP_MASK_SOURCE_SPRITE]) continue;
        this._applyMaskToTarget(target);
      }
    }

    /**
     * Push current clip-mask state from target metadata to renderer uniforms.
     * @param {VM.RenderedTarget} target
     */
    _applyMaskToTarget(target) {
      if (!target || target.isStage || !target.renderer || target.drawableID === null) return;

      const sourceSpriteName = target[CLIP_MASK_SOURCE_SPRITE];
      if (sourceSpriteName) {
        const sourceTarget = this._resolveSpriteTarget(target, sourceSpriteName);
        if (!sourceTarget || sourceTarget.isStage) {
          target.renderer.updateDrawableClipMaskSkinId(target.drawableID, null);
          target.renderer.updateDrawableClipMaskPosition(target.drawableID, null);
        } else {
          const sourceCostumes = this._getTargetCostumes(sourceTarget);
          const sourceCostumeIndex = typeof sourceTarget.currentCostume === "number" ? sourceTarget.currentCostume : null;
          const sourceCostume = sourceCostumeIndex === null ? null : sourceCostumes[sourceCostumeIndex];
          const sourceSkinId = sourceCostume && typeof sourceCostume.skinId === "number" ? sourceCostume.skinId : null;

          target.renderer.updateDrawableClipMaskSkinId(target.drawableID, sourceSkinId);
          target.renderer.updateDrawableClipMaskPosition(target.drawableID, [sourceTarget.x, sourceTarget.y]);
        }

        if (target.visible) {
          target.emitVisualChange();
          target.runtime.requestRedraw();
        }
        target.runtime.requestTargetsUpdate(target);
        return;
      }

      const directSkinId = target[CLIP_MASK_SKIN_ID];
      if (typeof directSkinId === "number") {
        target.renderer.updateDrawableClipMaskSkinId(target.drawableID, directSkinId);
        target.renderer.updateDrawableClipMaskPosition(
          target.drawableID,
          target[CLIP_MASK_USE_SPRITE] ? null : [target[CLIP_MASK_X], target[CLIP_MASK_Y]]
        );
      } else {
        const costumeIndex = target[CLIP_MASK_COSTUME];
        if (typeof costumeIndex !== "number") {
          target.renderer.updateDrawableClipMaskSkinId(target.drawableID, null);
          target.renderer.updateDrawableClipMaskPosition(target.drawableID, null);
        } else {
          const costumes = this._getTargetCostumes(target);
          const costume = costumes[costumeIndex];
          target.renderer.updateDrawableClipMaskSkinId(
            target.drawableID,
            costume && typeof costume.skinId === "number" ? costume.skinId : null
          );
          target.renderer.updateDrawableClipMaskPosition(
            target.drawableID,
            target[CLIP_MASK_USE_SPRITE] ? null : [target[CLIP_MASK_X], target[CLIP_MASK_Y]]
          );
        }
      }

      if (target.visible) {
        target.emitVisualChange();
        target.runtime.requestRedraw();
      }
      target.runtime.requestTargetsUpdate(target);
    }

    /**
     * Build and apply a generated mask skin from an SVG or bitmap URL/data URI.
     * @param {VM.RenderedTarget} target
     * @param {*} sourceValue
     * @returns {Promise<void>}
     */
    async _setGeneratedMaskFromURL(target, sourceValue) {
      if (!target || target.isStage || !target.renderer || target.drawableID === null) return;

      let skinId;
      const sourceURL = Cast.toString(sourceValue).trim();
      if (sourceURL.startsWith("data:")) {
        const decoded = this._decodeDataURI(sourceURL);
        if (decoded.mimeType.includes("svg")) {
          const svgText = this.textDecoder.decode(decoded.bytes);
          skinId = target.renderer.createSVGSkin(svgText);
        } else {
          const image = await this._loadImageFromURL(decoded.source);
          skinId = target.renderer.createBitmapSkin(image, 1);
        }
      } else {
        if (!(await Scratch.canFetch(sourceURL))) {
          return;
        }

        const response = await Scratch.fetch(sourceURL);
        const contentType = (response.headers.get("Content-Type") || "").toLowerCase();
        if (contentType.includes("image/svg+xml")) {
          skinId = target.renderer.createSVGSkin(await response.text());
        } else if (contentType.startsWith("image/")) {
          const blob = await response.blob();
          const objectURL = URL.createObjectURL(blob);
          try {
            const image = await this._loadImageFromURL(objectURL);
            skinId = target.renderer.createBitmapSkin(image, 1);
          } finally {
            URL.revokeObjectURL(objectURL);
          }
        } else {
          return;
        }
      }

      if (typeof skinId !== "number") return;

      this._destroyGeneratedMaskSkin(target);
      target[CLIP_MASK_SKIN_ID] = skinId;
      target[CLIP_MASK_COSTUME] = null;
      this._applyMaskToTarget(target);
    }

    getInfo() {
      return {
        id: UnsandboxedClippingBlocks.extensionId,
        name: translate("Clipping"),
        color1: "#9966FF",
        color2: "#855CD6",
        color3: "#774DCB",
        blocks: [
          {
            opcode: "useCostumeMask",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("use [COSTUME] as clipping mask"),
            arguments: {
              COSTUME: {
                type: Scratch.ArgumentType.COSTUME
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "useSpriteMask",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("use [SPRITE] as clipping mask"),
            hideFromPalette: true,
            arguments: {
              SPRITE: {
                type: Scratch.ArgumentType.STRING,
                menu: "maskSprite"
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "setMaskPosition",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("move mask to x: [X] y: [Y]"),
            arguments: {
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "clearMask",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("clear clipping mask"),
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "useURLMask",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("load image from URL [URL] as clipping mask"),
            hideFromPalette: true,
            arguments: {
              URL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "https://extensions.turbowarp.org/dango.png"
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          "---",
          {
            opcode: "getMaskCostume",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("clipping mask costume"),
            filter: [Scratch.TargetType.SPRITE],
            disableMonitor: true
          },
          {
            opcode: "getMaskProperty",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("clipping mask [PROP]"),
            arguments: {
              PROP: {
                type: Scratch.ArgumentType.STRING,
                menu: "maskProperty"
              }
            },
            filter: [Scratch.TargetType.SPRITE],
            disableMonitor: true
          }
        ],
        menus: {
          maskSprite: {
            acceptReporters: true,
            items: "_getMaskSprites"
          },
          maskProperty: {
            acceptReporters: true,
            items: [
              {
                text: translate("x"),
                value: "x"
              },
              {
                text: translate("y"),
                value: "y"
              }
            ]
          }
        }
      };
    }

    useCostumeMask(args, util) {
      this._destroyGeneratedMaskSkin(util.target);
      util.target[CLIP_MASK_COSTUME] = this._resolveCostumeIndex(util.target, args.COSTUME);
      util.target[CLIP_MASK_USE_SPRITE] = true;
      util.target[CLIP_MASK_SOURCE_SPRITE] = null;
      this._applyMaskToTarget(util.target);
    }

    useSpriteMask(args, util) {
      this._destroyGeneratedMaskSkin(util.target);
      const sourceTarget = this._resolveSpriteTarget(util.target, args.SPRITE);
      if (!sourceTarget || sourceTarget.isStage) {
        util.target[CLIP_MASK_SOURCE_SPRITE] = null;
        util.target[CLIP_MASK_COSTUME] = null;
        util.target[CLIP_MASK_SKIN_ID] = null;
      } else {
        util.target[CLIP_MASK_SOURCE_SPRITE] = sourceTarget === util.target ? "_myself_" : sourceTarget.getName();
        util.target[CLIP_MASK_COSTUME] = null;
        util.target[CLIP_MASK_SKIN_ID] = null;
      }
      util.target[CLIP_MASK_USE_SPRITE] = false;
      this._applyMaskToTarget(util.target);
    }

    setMaskPosition(args, util) {
      util.target[CLIP_MASK_X] = Cast.toNumber(args.X);
      util.target[CLIP_MASK_Y] = Cast.toNumber(args.Y);
      util.target[CLIP_MASK_USE_SPRITE] = false;
      util.target[CLIP_MASK_SOURCE_SPRITE] = null;
      this._applyMaskToTarget(util.target);
    }

    clearMask(args, util) {
      this._destroyGeneratedMaskSkin(util.target);
      util.target[CLIP_MASK_COSTUME] = null;
      util.target[CLIP_MASK_SKIN_ID] = null;
      util.target[CLIP_MASK_USE_SPRITE] = true;
      util.target[CLIP_MASK_SOURCE_SPRITE] = null;
      this._applyMaskToTarget(util.target);
    }

    async useURLMask(args, util) {
      try {
        util.target[CLIP_MASK_SOURCE_SPRITE] = null;
        await this._setGeneratedMaskFromURL(util.target, args.URL);
      } catch (e) {
        // Keep extension commands fail-safe in projects.
      }
    }

    getMaskCostume(args, util) {
      const value = util.target[CLIP_MASK_COSTUME];
      if (typeof value !== "number") return "";
      const costumes = this._getTargetCostumes(util.target);
      return costumes[value] ? costumes[value].name : value + 1;
    }

    getMaskProperty(args, util) {
      if (util.target[CLIP_MASK_USE_SPRITE]) {
        if (args.PROP === "x") return util.target.x;
        if (args.PROP === "y") return util.target.y;
      }
      if (args.PROP === "x") return util.target[CLIP_MASK_X];
      if (args.PROP === "y") return util.target[CLIP_MASK_Y];
      return 0;
    }
  }

  Scratch.extensions.register(new UnsandboxedClippingBlocks());
})(Scratch);
