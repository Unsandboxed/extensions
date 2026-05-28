(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  class UnsandboxedBlendingEffectsBlocks {
    /**
     * Extension id used to namespace opcodes.
     * @type {string}
     */
    static extensionId = "usbBlendingEffects";

    /** @type {symbol} */
    static blendModeKey = Symbol("blending.mode");
    /** @type {symbol} */
    static blendAmountKey = Symbol("blending.amount");
    /** @type {symbol} */
    static blendTargetModesKey = Symbol("blending.targetModes");
    /** @type {symbol} */
    static blendTargetConfigsKey = Symbol("blending.targetConfigs");

    /** @type {symbol} */
    static effectValuesKey = Symbol("blendingEffects.values");
    /** @type {symbol} */
    static effectTargetConfigsKey = Symbol("blendingEffects.targetConfigs");
    /** @type {symbol} */
    static effectRenderModeKey = Symbol("blendingEffects.renderMode");

    /** @type {string} */
    static modeDefault = "default";
    /** @type {string} */
    static defaultEffect = "blur";
    /** @type {string} */
    static rendererConfigMode = "effect";
    /** @type {string} */
    static effectRenderModeUnderlay = "underlay";
    /** @type {string} */
    static effectRenderModeReplace = "replace";
    /** @type {string[]} */
    static fallbackEffectNames = [
      "blur",
      "pixelate",
      "whirl"
    ];

    constructor() {
      this.vm = Scratch.vm;
      this.runtime = this.vm.runtime;

      this.runtime.targets.forEach(target => this._implementTarget(target));
      this.runtime.on("targetWasCreated", (target, originalTarget) =>
        this._implementTarget(target, originalTarget)
      );
      this.runtime.on("PROJECT_LOADED", () => {
        this.runtime.targets.forEach(target => this._implementTarget(target));
      });
    }

    _implementTarget(target, originalTarget) {
      if (!target || target.isStage) return;
      if (UnsandboxedBlendingEffectsBlocks.effectValuesKey in target) return;

      target[UnsandboxedBlendingEffectsBlocks.blendModeKey] = originalTarget ? originalTarget[UnsandboxedBlendingEffectsBlocks.blendModeKey] : UnsandboxedBlendingEffectsBlocks.modeDefault;
      target[UnsandboxedBlendingEffectsBlocks.blendAmountKey] = originalTarget ? originalTarget[UnsandboxedBlendingEffectsBlocks.blendAmountKey] : 100;
      target[UnsandboxedBlendingEffectsBlocks.blendTargetModesKey] = originalTarget && originalTarget[UnsandboxedBlendingEffectsBlocks.blendTargetModesKey]
        ? {...originalTarget[UnsandboxedBlendingEffectsBlocks.blendTargetModesKey]}
        : Object.create(null);
      target[UnsandboxedBlendingEffectsBlocks.blendTargetConfigsKey] = this._resolveBlendTargetConfigs(target, target[UnsandboxedBlendingEffectsBlocks.blendTargetModesKey]);

      target[UnsandboxedBlendingEffectsBlocks.effectValuesKey] = originalTarget && originalTarget[UnsandboxedBlendingEffectsBlocks.effectValuesKey]
        ? {...originalTarget[UnsandboxedBlendingEffectsBlocks.effectValuesKey]}
        : Object.create(null);
      target[UnsandboxedBlendingEffectsBlocks.effectRenderModeKey] = originalTarget
        ? this._normalizeEffectRenderMode(originalTarget[UnsandboxedBlendingEffectsBlocks.effectRenderModeKey])
        : UnsandboxedBlendingEffectsBlocks.effectRenderModeUnderlay;
      target[UnsandboxedBlendingEffectsBlocks.effectTargetConfigsKey] = this._resolveEffectTargetConfigs(target);
      this._applyRendererState(target);
    }

    _normalizeEffectRenderMode(value) {
      const mode = Cast.toString(value).trim().toLowerCase();
      return mode === UnsandboxedBlendingEffectsBlocks.effectRenderModeReplace
        ? UnsandboxedBlendingEffectsBlocks.effectRenderModeReplace
        : UnsandboxedBlendingEffectsBlocks.effectRenderModeUnderlay;
    }

    _getTargets() {
      const spriteNames = [
        {text: "screen", value: "screen"},
        {text: "backdrop", value: "backdrop"},
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

    _normalizeMode(value) {
      const mode = Cast.toString(value).toLowerCase();
      if (mode === "additive") {
        return "add";
      }
      const allowed = ["default", "add", "multiply", "screen", "overlay", "invert", "subtract"];
      return allowed.includes(mode) ? mode : UnsandboxedBlendingEffectsBlocks.modeDefault;
    }

    _clampAmount(value) {
      const n = Cast.toNumber(value);
      if (!Number.isFinite(n)) return 100;
      return Math.max(0, Math.min(200, n));
    }

    _resolveTargetDrawableID(target, targetName) {
      const name = Cast.toString(targetName);
      if (name === "_myself_") {
        return target && target.drawableID !== null ? target.drawableID : null;
      }
      if (name === "backdrop") {
        const stage = this.runtime.getTargetForStage ? this.runtime.getTargetForStage() : null;
        return stage && stage.drawableID !== null ? stage.drawableID : null;
      }
      const spriteTarget = this.runtime.getSpriteTargetByName
        ? this.runtime.getSpriteTargetByName(name)
        : null;
      return spriteTarget && spriteTarget.drawableID !== null ? spriteTarget.drawableID : null;
    }

    _resolveBlendTargetConfigs(target, targetModes) {
      const map = targetModes || Object.create(null);
      const configsByID = new Map();
      const names = Object.keys(map);
      for (const name of names) {
        const drawableID = this._resolveTargetDrawableID(target, name);
        if (drawableID === null) continue;
        const mode = this._normalizeMode(map[name]);
        configsByID.set(drawableID, {drawableID, mode});
      }
      return Array.from(configsByID.values());
    }

    _getKnownEffectNames() {
      const names = [...UnsandboxedBlendingEffectsBlocks.fallbackEffectNames];
      if (this.runtime && typeof this.runtime.getSpriteShaderEffects === "function") {
        const runtimeEffects = this.runtime.getSpriteShaderEffects();
        for (const effectInfo of runtimeEffects) {
          const name = Cast.toString(effectInfo && effectInfo.name).trim().toLowerCase();
          if (!name) continue;
          if (!names.includes(name)) {
            names.push(name);
          }
        }
      }
      return names;
    }

    _getEffectMenuItems() {
      const menuItems = [];
      const seen = new Set();

      if (this.runtime && typeof this.runtime.getSpriteShaderEffects === "function") {
        const runtimeEffects = this.runtime.getSpriteShaderEffects();
        for (const effectInfo of runtimeEffects) {
          if (effectInfo && effectInfo.showInMenu === false) continue;
          const value = Cast.toString(effectInfo && effectInfo.name).trim().toLowerCase();
          if (!value || seen.has(value)) continue;
          seen.add(value);

          const text = Cast.toString((effectInfo && effectInfo.menuName) || value).trim() || value;
          menuItems.push({text, value});
        }
      }

      for (const effectName of UnsandboxedBlendingEffectsBlocks.fallbackEffectNames) {
        if (seen.has(effectName)) continue;
        seen.add(effectName);
        menuItems.push({text: effectName, value: effectName});
      }

      return menuItems;
    }

    _normalizeEffectName(effectName) {
      const normalized = Cast.toString(effectName).trim().toLowerCase();
      const knownNames = this._getKnownEffectNames();
      return knownNames.includes(normalized) ? normalized : UnsandboxedBlendingEffectsBlocks.defaultEffect;
    }

    _resolveEffectTargetConfigs(target) {
      const values = target && target[UnsandboxedBlendingEffectsBlocks.effectValuesKey]
        ? target[UnsandboxedBlendingEffectsBlocks.effectValuesKey]
        : Object.create(null);
      const effects = Object.create(null);

      for (const effectName of Object.keys(values)) {
        const normalizedName = this._normalizeEffectName(effectName);
        const rawValue = Cast.toNumber(values[effectName]);
        if (!Number.isFinite(rawValue) || rawValue === 0) continue;
        effects[normalizedName] = rawValue;
      }

      if (Object.keys(effects).length === 0) {
        return [];
      }

      const renderMode = this._normalizeEffectRenderMode(target[UnsandboxedBlendingEffectsBlocks.effectRenderModeKey]);

      return [{
        mode: UnsandboxedBlendingEffectsBlocks.rendererConfigMode,
        effects,
        keepSpriteVisible: renderMode !== UnsandboxedBlendingEffectsBlocks.effectRenderModeReplace
      }];
    }

    _applyRendererState(target) {
      if (!target || target.isStage || !target.renderer || target.drawableID === null) return;

      target[UnsandboxedBlendingEffectsBlocks.blendTargetConfigsKey] = this._resolveBlendTargetConfigs(target, target[UnsandboxedBlendingEffectsBlocks.blendTargetModesKey]);
      target[UnsandboxedBlendingEffectsBlocks.effectTargetConfigsKey] = this._resolveEffectTargetConfigs(target);
      const effectConfigs = target[UnsandboxedBlendingEffectsBlocks.effectTargetConfigsKey] || [];
      const blendTargetConfigs = target[UnsandboxedBlendingEffectsBlocks.blendTargetConfigsKey] || [];
      // Allow behind-effects and blend-target modes to stack by sending both.
      const targetConfigs = effectConfigs.concat(blendTargetConfigs);

      target.renderer.updateDrawableBlendMode(target.drawableID, target[UnsandboxedBlendingEffectsBlocks.blendModeKey]);
      target.renderer.updateDrawableBlendAmount(target.drawableID, target[UnsandboxedBlendingEffectsBlocks.blendAmountKey]);
      target.renderer.updateDrawableBlendTargets(target.drawableID, targetConfigs);

      if (target.visible) {
        target.emitVisualChange();
        target.runtime.requestRedraw();
      }
      target.runtime.requestTargetsUpdate(target);
    }

    getInfo() {
      return {
        id: UnsandboxedBlendingEffectsBlocks.extensionId,
        name: translate("Blending"),
        color1: "#9966FF",
        color2: "#855CD6",
        color3: "#774DCB",
        blocks: [
          {
            opcode: "useBlending",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("use [MODE] blending"),
            arguments: {
              MODE: {
                type: Scratch.ArgumentType.STRING,
                menu: "blendMode",
                defaultValue: UnsandboxedBlendingEffectsBlocks.modeDefault
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "addBlendToTarget",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("add [BLEND] blending to [TARGET]"),
            arguments: {
              BLEND: {
                type: Scratch.ArgumentType.STRING,
                menu: "blendMode",
                defaultValue: UnsandboxedBlendingEffectsBlocks.modeDefault
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "blendTarget",
                defaultValue: "backdrop"
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "clearBlending",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("reset blending"),
            filter: [Scratch.TargetType.SPRITE]
          },
          "---",
          {
            opcode: "setBlendAmount",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set blend amount to [AMOUNT]%"),
            arguments: {
              AMOUNT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 100
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "changeBlendAmount",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("change blend amount by [AMOUNT]%"),
            arguments: {
              AMOUNT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "getBlendingValue",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("blend [PROPERTY]"),
            arguments: {
              PROPERTY: {
                type: Scratch.ArgumentType.STRING,
                menu: "blendProperty",
                defaultValue: "mode"
              }
            },
            filter: [Scratch.TargetType.SPRITE],
            disableMonitor: true
          },
          // TODO: these are just not ready yet. the renderer *can* support behind effects,
          // but the implementation sucks. Once I actually figure that out, maybe people will
          // be allowed to use these. Until then, theyre just sad reminders of what could be :(
          // "---",
          // {
          //   opcode: "setBehindEffect",
          //   blockType: Scratch.BlockType.COMMAND,
          //   text: translate("set behind [EFFECT] effect to [VALUE]"),
          //   arguments: {
          //     EFFECT: {
          //       type: Scratch.ArgumentType.STRING,
          //       menu: "effectType",
          //       defaultValue: UnsandboxedBlendingEffectsBlocks.defaultEffect
          //     },
          //     VALUE: {
          //       type: Scratch.ArgumentType.NUMBER,
          //       defaultValue: 25
          //     }
          //   },
          //   filter: [Scratch.TargetType.SPRITE]
          // },
          // {
          //   opcode: "changeBehindEffect",
          //   blockType: Scratch.BlockType.COMMAND,
          //   text: translate("change behind [EFFECT] effect by [VALUE]"),
          //   arguments: {
          //     EFFECT: {
          //       type: Scratch.ArgumentType.STRING,
          //       menu: "effectType",
          //       defaultValue: UnsandboxedBlendingEffectsBlocks.defaultEffect
          //     },
          //     VALUE: {
          //       type: Scratch.ArgumentType.NUMBER,
          //       defaultValue: 10
          //     }
          //   },
          //   filter: [Scratch.TargetType.SPRITE]
          // },
          // {
          //   opcode: "clearEffects",
          //   blockType: Scratch.BlockType.COMMAND,
          //   text: translate("clear behind effects"),
          //   filter: [Scratch.TargetType.SPRITE]
          // },
          // {
          //   opcode: "setBehindRenderMode",
          //   blockType: Scratch.BlockType.COMMAND,
          //   text: translate("render behind effects as [MODE]"),
          //   arguments: {
          //     MODE: {
          //       type: Scratch.ArgumentType.STRING,
          //       menu: "behindRenderMode",
          //       defaultValue: UnsandboxedBlendingEffectsBlocks.effectRenderModeUnderlay
          //     }
          //   },
          //   filter: [Scratch.TargetType.SPRITE]
          // },
          // "---",
          // {
          //   opcode: "getEffectValue",
          //   blockType: Scratch.BlockType.REPORTER,
          //   text: translate("behind [EFFECT] effect"),
          //   arguments: {
          //     EFFECT: {
          //       type: Scratch.ArgumentType.STRING,
          //       menu: "effectType",
          //       defaultValue: UnsandboxedBlendingEffectsBlocks.defaultEffect
          //     }
          //   },
          //   filter: [Scratch.TargetType.SPRITE],
          //   disableMonitor: true
          // }
        ],
        menus: {
          blendMode: {
            acceptReporters: true,
            items: ["default", "additive", "subtract", "multiply", "invert", "screen", "overlay"]
          },
          blendTarget: {
            acceptReporters: true,
            items: "_getTargets"
          },
          blendProperty: {
            acceptReporters: true,
            items: ["mode", "amount", "targets"]
          },
          effectType: {
            acceptReporters: true,
            items: "_getEffectMenuItems"
          },
          behindRenderMode: {
            acceptReporters: true,
            items: [
              UnsandboxedBlendingEffectsBlocks.effectRenderModeUnderlay,
              UnsandboxedBlendingEffectsBlocks.effectRenderModeReplace
            ]
          }
        }
      };
    }

    addBlendToTarget(args, util) {
      const blendMode = this._normalizeMode(args.BLEND);
      const targetName = Cast.toString(args.TARGET);

      if (targetName === "screen") {
        util.target[UnsandboxedBlendingEffectsBlocks.blendModeKey] = blendMode;
      } else {
        const targetModes = util.target[UnsandboxedBlendingEffectsBlocks.blendTargetModesKey] || Object.create(null);
        targetModes[targetName] = blendMode;
        util.target[UnsandboxedBlendingEffectsBlocks.blendTargetModesKey] = targetModes;
      }

      this._applyRendererState(util.target);
    }

    useBlending(args, util) {
      util.target[UnsandboxedBlendingEffectsBlocks.blendModeKey] = this._normalizeMode(args.MODE);
      this._applyRendererState(util.target);
    }

    setBlendAmount(args, util) {
      util.target[UnsandboxedBlendingEffectsBlocks.blendAmountKey] = this._clampAmount(args.AMOUNT);
      this._applyRendererState(util.target);
    }

    changeBlendAmount(args, util) {
      util.target[UnsandboxedBlendingEffectsBlocks.blendAmountKey] = this._clampAmount(
        util.target[UnsandboxedBlendingEffectsBlocks.blendAmountKey] + Cast.toNumber(args.AMOUNT)
      );
      this._applyRendererState(util.target);
    }

    clearBlending(args, util) {
      util.target[UnsandboxedBlendingEffectsBlocks.blendModeKey] = UnsandboxedBlendingEffectsBlocks.modeDefault;
      util.target[UnsandboxedBlendingEffectsBlocks.blendAmountKey] = 100;
      util.target[UnsandboxedBlendingEffectsBlocks.blendTargetModesKey] = Object.create(null);
      util.target[UnsandboxedBlendingEffectsBlocks.blendTargetConfigsKey] = [];
      this._applyRendererState(util.target);
    }

    getBlendingValue(args, util) {
      const property = Cast.toString(args.PROPERTY).toLowerCase();
      switch (property) {
        case "amount":
          return util.target[UnsandboxedBlendingEffectsBlocks.blendAmountKey];
        case "targets": {
          const targetModes = util.target[UnsandboxedBlendingEffectsBlocks.blendTargetModesKey] || Object.create(null);
          const names = Object.keys(targetModes);
          return names.length ? names.join(", ") : "none";
        }
        case "mode":
        default:
          return util.target[UnsandboxedBlendingEffectsBlocks.blendModeKey];
      }
    }

    setBehindEffect(args, util) {
      const effectName = this._normalizeEffectName(args.EFFECT);
      const values = util.target[UnsandboxedBlendingEffectsBlocks.effectValuesKey] || Object.create(null);
      values[effectName] = Cast.toNumber(args.VALUE);
      util.target[UnsandboxedBlendingEffectsBlocks.effectValuesKey] = values;
      this._applyRendererState(util.target);
    }

    changeBehindEffect(args, util) {
      const effectName = this._normalizeEffectName(args.EFFECT);
      const values = util.target[UnsandboxedBlendingEffectsBlocks.effectValuesKey] || Object.create(null);
      const current = Cast.toNumber(values[effectName]);
      const delta = Cast.toNumber(args.VALUE);
      values[effectName] = (Number.isFinite(current) ? current : 0) + (Number.isFinite(delta) ? delta : 0);
      util.target[UnsandboxedBlendingEffectsBlocks.effectValuesKey] = values;
      this._applyRendererState(util.target);
    }

    clearEffects(args, util) {
      util.target[UnsandboxedBlendingEffectsBlocks.effectValuesKey] = Object.create(null);
      util.target[UnsandboxedBlendingEffectsBlocks.effectTargetConfigsKey] = [];
      this._applyRendererState(util.target);
    }

    setBehindRenderMode(args, util) {
      util.target[UnsandboxedBlendingEffectsBlocks.effectRenderModeKey] = this._normalizeEffectRenderMode(args.MODE);
      this._applyRendererState(util.target);
    }

    getEffectValue(args, util) {
      const effectName = this._normalizeEffectName(args.EFFECT);
      const values = util.target[UnsandboxedBlendingEffectsBlocks.effectValuesKey] || Object.create(null);
      const value = Cast.toNumber(values[effectName]);
      return Number.isFinite(value) ? value : 0;
    }
  }

  Scratch.extensions.register(new UnsandboxedBlendingEffectsBlocks());
})(Scratch);
