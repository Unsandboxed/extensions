(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  /**
   * Unsandboxed blocks for mirroring the stage onto sprite silhouettes.
   */
  class UnsandboxedViewportBlocks {
    /**
     * @type {string}
     */
    static extensionId = "usbViewport";

    /** @type {symbol} */
    static liveStateKey = Symbol("viewport.state");

    /** @type {string} */
    static effectName = "viewport";


    /** @type {number} */
    static effectOn = 1;

    /** @type {number} */
    static effectOff = 0;

    /** @type {object} */
    static effectInfo = {
      menuName: "viewport",
      showInMenu: false,
      converter: value => {
        const n = Cast.toNumber(value);
        return Number.isFinite(n) && n > 0 ? 1 : 0;
      },
      shapeChanges: false,
      fragmentUniforms: [
        "uniform float u_viewport;",
        "uniform float u_viewportx;",
        "uniform float u_viewporty;"
      ].join("\n"),
      fragmentColor: [
        "{",
        "    if (u_viewport > 0.5 && u_hasViewportSkin > 0.5) {",
        "        vec2 uv = vec2(u_viewportx, u_viewporty) + (texcoord0 - vec2(0.5));",
        "        uv.y = mix(uv.y, 1.0 - uv.y, u_viewportFlipY);",
        "        bool outOfBounds = uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0;",
        "        vec4 stageSample = outOfBounds ? vec4(0.0) : texture2D(u_viewportSkin, uv);",
        "        float silhouetteAlpha = gl_FragColor.a;",
        "        gl_FragColor = vec4(stageSample.rgb * silhouetteAlpha, stageSample.a * silhouetteAlpha);",
        "    }",
        "}"
      ].join("\n")
    };

    /**
     * Create the Viewport extension instance.
     */
    constructor() {
      /** @type {VirtualMachine} */
      this.vm = Scratch.vm;
      /** @type {Runtime} */
      this.runtime = this.vm.runtime;

      /** @type {Set<string>} */
      this._activeTargetIds = new Set();
      /** @type {boolean} */
      this._didRegisterEffect = false;

      this._registerEffect();

      this.runtime.targets.forEach(target => this._initTargetState(target));
      this.runtime.on("targetWasCreated", (target, originalTarget) => {
        this._initTargetState(target, originalTarget);
      });
      this.runtime.on("PROJECT_LOADED", () => this._resetOnProjectLoad());
      this.runtime.on("PROJECT_STOP_ALL", () => this._restoreAllTargets());
      this.runtime.on("RUNTIME_DISPOSED", () => this._dispose());
      this.runtime.on("AFTER_EXECUTE", () => this._syncLiveTargets());
    }

    /**
     * Reset Viewport state after project load.
     */
    _resetOnProjectLoad() {
      this._restoreAllTargets();
      this._didRegisterEffect = false;
      this._registerEffect();
      this._activeTargetIds.clear();
      this.runtime.targets.forEach(target => this._initTargetState(target));
    }

    /**
     * Initialize sprite-local Viewport state.
     * @param {VM.RenderedTarget} target
     */
    _initTargetState(target) {
      if (!target || target.isStage) return;
      if (UnsandboxedViewportBlocks.liveStateKey in target) return;

      target[UnsandboxedViewportBlocks.liveStateKey] = {
        enabled: false,
        prevViewportSkinId: null,
        prevEffectValue: 0,
        viewportX: 0,
        viewportY: 0
      };
    }

    /**
     * Register the custom Viewport shader effect.
     * @returns {boolean}
     */
    _registerEffect() {
      if (this._didRegisterEffect) return true;
      if (!this.vm || typeof this.vm.registerSpriteShaderEffect !== "function") return false;

      const registerOne = (name, info) => {
        try {
          this.vm.registerSpriteShaderEffect(name, info);
        } catch (error) {
          const message = error && error.message ? String(error.message) : "";
          if (message.indexOf(`Effect already exists: ${name}`) === -1) {
            if (message.indexOf("without an attached renderer") !== -1) {
              return false;
            }
            throw error;
          }
        }
        return true;
      };

      if (!registerOne(UnsandboxedViewportBlocks.effectName, UnsandboxedViewportBlocks.effectInfo)) {
        return false;
      }

      this._didRegisterEffect = true;
      return true;
    }

    /**
     * Get renderer from runtime.
     * @returns {?RenderWebGL}
     */
    _getRenderer() {
      return this.runtime ? this.runtime.renderer : null;
    }

    /**
     * Resolve a renderer drawable by id.
     * @param {number} drawableId
     * @returns {?Drawable}
     */
    _getDrawableById(drawableId) {
      const renderer = this._getRenderer();
      if (!renderer || !renderer._allDrawables || !Number.isInteger(drawableId)) return null;
      return renderer._allDrawables[drawableId] || null;
    }

    /**
     * Get current dedicated viewport skin id from a target.
     * @param {VM.RenderedTarget} target
     * @returns {?number}
     */
    _getCurrentViewportSkinId(target) {
      if (!target || target.drawableID === null) return null;
      const drawable = this._getDrawableById(target.drawableID);
      if (!drawable || !drawable.viewportSkin) return null;
      return Number.isInteger(drawable.viewportSkin.id) ? drawable.viewportSkin.id : null;
    }

    /**
     * Disable Viewport on all active targets.
     */
    _restoreAllTargets() {
      for (const target of this.runtime.targets) {
        if (!target || target.isStage || !(UnsandboxedViewportBlocks.liveStateKey in target) || !target[UnsandboxedViewportBlocks.liveStateKey].enabled) continue;
        this._disableTarget(target, true);
      }
      this._activeTargetIds.clear();
    }

    /**
     * Dispose all Viewport resources.
     */
    _dispose() {
      this._restoreAllTargets();
      this._activeTargetIds.clear();
    }

    /**
     * Resolve a runtime target by id.
     * @param {string} targetId
     * @returns {?VM.RenderedTarget}
     */
    _resolveTargetById(targetId) {
      for (const target of this.runtime.targets) {
        if (target && target.id === targetId) return target;
      }
      return null;
    }

    /**
     * Bind one sprite target to Viewport resources.
     * @param {VM.RenderedTarget} target
     * @returns {boolean}
     */
    _bindTargetToRenderer(target) {
      if (!target || target.isStage || !target.renderer || target.drawableID === null) return false;
      if (!this._registerEffect()) return false;

      const state = target[UnsandboxedViewportBlocks.liveStateKey];
      if (!state || !state.enabled) return false;

      const renderer = this._getRenderer();
      if (!renderer) return false;
      if (typeof renderer.updateDrawableUseSceneViewportTexture === "function") {
        renderer.updateDrawableUseSceneViewportTexture(target.drawableID, true);
      }
      if (this._getCurrentViewportSkinId(target) !== null) {
        renderer.updateDrawableViewportSkinId(target.drawableID, null);
      }

      if (target.effects && typeof target.setEffect === "function") {
        if (!Object.prototype.hasOwnProperty.call(target.effects, UnsandboxedViewportBlocks.effectName) || target.effects[UnsandboxedViewportBlocks.effectName] !== UnsandboxedViewportBlocks.effectOn) {
          target.setEffect(UnsandboxedViewportBlocks.effectName, UnsandboxedViewportBlocks.effectOn);
        }

        const uv = (renderer && typeof renderer.scratchPointToNeutralStageUV === "function")
          ? renderer.scratchPointToNeutralStageUV(state.viewportX, state.viewportY)
          : {
            x: 0.5 + ((Number(state.viewportX) || 0) / 480),
            y: 0.5 - ((Number(state.viewportY) || 0) / 360)
          };
        if (typeof renderer.updateDrawableViewportAnchor === "function") {
          renderer.updateDrawableViewportAnchor(target.drawableID, uv.x, uv.y);
        }
      }

      return true;
    }

    /**
     * Disable Viewport on one target and optionally restore previous state.
     * @param {VM.RenderedTarget} target
     * @param {boolean} restoring
     */
    _disableTarget(target, restoring) {
      if (!target || target.isStage || !(UnsandboxedViewportBlocks.liveStateKey in target)) return;

      const state = target[UnsandboxedViewportBlocks.liveStateKey];
      state.enabled = false;
      this._activeTargetIds.delete(target.id);

      if (target.effects && typeof target.setEffect === "function" && Object.prototype.hasOwnProperty.call(target.effects, UnsandboxedViewportBlocks.effectName)) {
        target.setEffect(UnsandboxedViewportBlocks.effectName, restoring ? state.prevEffectValue : UnsandboxedViewportBlocks.effectOff);
      }

      if (target.renderer && target.drawableID !== null) {
        if (typeof target.renderer.updateDrawableUseSceneViewportTexture === "function") {
          target.renderer.updateDrawableUseSceneViewportTexture(target.drawableID, false);
        }
        target.renderer.updateDrawableViewportSkinId(target.drawableID, restoring ? state.prevViewportSkinId : null);
      }

      if (target.visible) {
        target.emitVisualChange();
        target.runtime.requestRedraw();
      }
      target.runtime.requestTargetsUpdate(target);
    }

    /**
     * Sync Viewport bindings for active targets.
     */
    _syncLiveTargets() {
      if (this._activeTargetIds.size === 0) {
        return;
      }

      const stale = [];
      for (const targetId of this._activeTargetIds) {
        const target = this._resolveTargetById(targetId);
        if (!target) {
          stale.push(targetId);
          continue;
        }
        this._bindTargetToRenderer(target);
      }

      for (const targetId of stale) {
        this._activeTargetIds.delete(targetId);
      }
    }

    /**
     * Extension metadata and block definitions.
     * @returns {object}
     */
    getInfo() {
      return {
        id: UnsandboxedViewportBlocks.extensionId,
        name: translate("Viewport"),
        requires: {
          usbVectors: ["vec2"]
        },
        blocks: [
          {
            opcode: "enableViewport",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("show stage viewport on this sprite"),
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "disableViewport",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("stop stage viewport on this sprite"),
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "isViewportEnabled",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("stage viewport enabled?"),
            filter: [Scratch.TargetType.SPRITE],
            disableMonitor: true
          },
          "---",
          {
            opcode: "moveViewportToPosition",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("move viewport to [POSITION]"),
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              POSITION: {
                type: Scratch.ArgumentType.POSITION
              }
            }
          },
          {
            opcode: "getViewportPosition",
            blockType: Scratch.BlockType.VECTOR,
            text: translate("viewport position"),
            filter: [Scratch.TargetType.SPRITE],
            disableMonitor: true
          }
        ]
      };
    }

    /**
     * Enable Viewport for current sprite.
     * @param {object} args Block arguments.
     * @param {object} util Block utility.
     */
    enableViewport(args, util) {
      const target = util && util.target;
      if (!target || target.isStage) return;

      this._initTargetState(target);
      const state = target[UnsandboxedViewportBlocks.liveStateKey];
      if (!state) return;

      state.prevEffectValue = target.effects && Object.prototype.hasOwnProperty.call(target.effects, UnsandboxedViewportBlocks.effectName)
        ? target.effects[UnsandboxedViewportBlocks.effectName]
        : UnsandboxedViewportBlocks.effectOff;
      state.prevViewportSkinId = this._getCurrentViewportSkinId(target);

      state.enabled = true;
      this._activeTargetIds.add(target.id);

      this._syncLiveTargets();
      this.runtime.requestRedraw();
      target.runtime.requestTargetsUpdate(target);
    }

    /**
     * Disable Viewport for current sprite.
     * @param {object} args Block arguments.
     * @param {object} util Block utility.
     */
    disableViewport(args, util) {
      const target = util && util.target;
      if (!target || target.isStage || !(UnsandboxedViewportBlocks.liveStateKey in target)) return;

      this._disableTarget(target, true);
    }

    /**
     * Whether Viewport is enabled for current sprite.
     * @param {object} args Block arguments.
     * @param {object} util Block utility.
     * @returns {boolean}
     */
    isViewportEnabled(args, util) {
      const target = util && util.target;
      if (!target || target.isStage || !(UnsandboxedViewportBlocks.liveStateKey in target)) return false;
      return Boolean(target[UnsandboxedViewportBlocks.liveStateKey].enabled);
    }

    /**
     * Set viewport sampling offset for current sprite in stage pixels.
     * @param {object} args
     * @param {object} util
     */
    moveViewportToPosition(args, util) {
      const target = util && util.target;
      if (!target || target.isStage) return;

      this._initTargetState(target);
      const state = target[UnsandboxedViewportBlocks.liveStateKey];
      if (!state) return;

      const position = this._toPosition(Cast.toArray(args.POSITION));
      state.viewportX = position[0];
      state.viewportY = position[1];

      if (state.enabled) {
        this._bindTargetToRenderer(target);
      }
      this.runtime.requestRedraw();
      target.runtime.requestTargetsUpdate(target);
    }

    /**
     * Backward-compatible scalar workflow shim.
     * @param {object} args
     * @param {object} util
     */
    moveViewportTo(args, util) {
      const x = Cast.toNumber(args.X);
      const y = Cast.toNumber(args.Y);
      this.moveViewportToPosition({
        POSITION: [
          Number.isFinite(x) ? x : 0,
          Number.isFinite(y) ? y : 0
        ]
      }, util);
    }

    /**
     * Get viewport position offset for current sprite.
     * @param {object} args
     * @param {object} util
     * @returns {object|Array<number>}
     */
    getViewportPosition(args, util) {
      const target = util && util.target;
      if (!target || target.isStage || !(UnsandboxedViewportBlocks.liveStateKey in target)) {
        return this._makePosition([0, 0]);
      }
      const state = target[UnsandboxedViewportBlocks.liveStateKey];
      return this._makePosition([state.viewportX, state.viewportY]);
    }

    /**
     * Get viewport X offset for current sprite.
     * @param {object} args
     * @param {object} util
     * @returns {number}
     */
    getViewportX(args, util) {
      const target = util && util.target;
      if (!target || target.isStage || !(UnsandboxedViewportBlocks.liveStateKey in target)) return 0;
      return Number(target[UnsandboxedViewportBlocks.liveStateKey].viewportX) || 0;
    }

    /**
     * Get viewport Y offset for current sprite.
     * @param {object} args
     * @param {object} util
     * @returns {number}
     */
    getViewportY(args, util) {
      const target = util && util.target;
      if (!target || target.isStage || !(UnsandboxedViewportBlocks.liveStateKey in target)) return 0;
      return Number(target[UnsandboxedViewportBlocks.liveStateKey].viewportY) || 0;
    }

    _createBuiltInType(typeId, payload) {
      if (this.runtime && typeof this.runtime.createBuiltInCustomTypeValue === "function") {
        const value = this.runtime.createBuiltInCustomTypeValue(typeId, payload);
        if (value && typeof value === "object") {
          return value;
        }
      }
      return payload;
    }

    _makePosition(value) {
      return this._createBuiltInType("position", this._toPosition(value));
    }

    _toPosition(value) {
      const position = Cast.toArray(value).slice(0, 2).map(number => Cast.toNumber(number));
      return [position[0] || 0, position[1] || 0];
    }
  }

  Scratch.extensions.register(new UnsandboxedViewportBlocks());
})(Scratch);
