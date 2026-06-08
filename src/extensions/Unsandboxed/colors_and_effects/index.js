(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;
  const UnsandboxedColorsEffects = require("./effects");

  class UnsandboxedColorsBlocks {
    static extensionId = "usbColorsAndEffects";
    static channelEffects = UnsandboxedColorsEffects.channelEffects;
    static solidChannelEffects = UnsandboxedColorsEffects.solidChannelEffects;
    static outlineColorEffects = UnsandboxedColorsEffects.outlineColorEffects;
    static outlineOpacityEffect = UnsandboxedColorsEffects.outlineOpacityEffect;
    static outlineWidthEffect = UnsandboxedColorsEffects.outlineWidthEffect;

    constructor() {
      this.vm = Scratch.vm;
      this.runtime = this.vm.runtime;
      this.effects = new UnsandboxedColorsEffects(Scratch, this.vm);
      this._sampleScratchVec = [0, 0, 0];
      this._sampleColorBuffer = new Uint8ClampedArray(4);
      this._effectsRegistrationRetry = null;

      this._ensureEffectsRegistered();
      this.runtime.on("PROJECT_LOADED", () => {
        this.effects.reset();
        this._ensureEffectsRegistered();
      });
    }

    _ensureEffectsRegistered() {
      if (this.effects.registerEffects()) {
        if (typeof this.runtime.requestToolboxExtensionsUpdate === "function") {
          this.runtime.requestToolboxExtensionsUpdate();
        }
        if (this._effectsRegistrationRetry) {
          clearTimeout(this._effectsRegistrationRetry);
          this._effectsRegistrationRetry = null;
        }
        return true;
      }

      if (!this._effectsRegistrationRetry) {
        this._effectsRegistrationRetry = setTimeout(() => {
          this._effectsRegistrationRetry = null;
          this._ensureEffectsRegistered();
        }, 50);
      }

      return false;
    }

    _normalizeChannel(value) {
      const channel = Cast.toString(value).trim().toLowerCase();
      return Object.prototype.hasOwnProperty.call(UnsandboxedColorsBlocks.channelEffects, channel) ? channel : "red";
    }

    _getTarget(util) {
      const target = util && util.target;
      if (!target || target.isStage) return null;
      return target;
    }

    _getEffectName(channel) {
      return UnsandboxedColorsBlocks.channelEffects[this._normalizeChannel(channel)];
    }

    _getChannelValue(target, channel) {
      const effectName = this._getEffectName(channel);
      if (!target || !target.effects) return 0;
      const raw = Cast.toNumber(target.effects[effectName]);
      return Number.isFinite(raw) ? raw : 0;
    }

    _setChannelValue(target, channel, value) {
      if (!target || typeof target.setEffect !== "function") return;
      if (!this._ensureEffectsRegistered()) return;

      const effectName = this._getEffectName(channel);
      const nextValue = Math.max(-100, Math.min(100, Cast.toNumber(value)));
      target.setEffect(effectName, Number.isFinite(nextValue) ? nextValue : 0);
    }

    _toEffectFromColorChannel(channelValue) {
      const normalized = Math.max(0, Math.min(255, Cast.toNumber(channelValue)));
      // Map 0..255 color channels to the extension's -100..100 channel effect range.
      return (normalized / 255) * 200 - 100;
    }

    _toEffectFromTintChannel(channelValue) {
      const normalized = Math.max(0, Math.min(255, Cast.toNumber(channelValue)));
      // Map around neutral midpoint so #808080 is near zero tint shift.
      return ((normalized - 128) / 127) * 100;
    }

    _normalizeMode(value) {
      const mode = Cast.toString(value).trim().toLowerCase();
      return mode === "color" ? "color" : "tint";
    }

    _toSolidRawChannel(channelValue) {
      const normalized = Math.max(0, Math.min(255, Cast.toNumber(channelValue)));
      // +1 keeps channel zero representable while effect remains enabled.
      return Math.floor(normalized) + 1;
    }

    _setSolidColor(target, color) {
      if (!target || typeof target.setEffect !== "function") return;
      if (!this._ensureEffectsRegistered()) return;

      target.setEffect(
        UnsandboxedColorsBlocks.solidChannelEffects.red,
        this._toSolidRawChannel(color.r)
      );
      target.setEffect(
        UnsandboxedColorsBlocks.solidChannelEffects.green,
        this._toSolidRawChannel(color.g)
      );
      target.setEffect(
        UnsandboxedColorsBlocks.solidChannelEffects.blue,
        this._toSolidRawChannel(color.b)
      );
    }

    _clearSolidColor(target) {
      if (!target || typeof target.setEffect !== "function") return;
      target.setEffect(UnsandboxedColorsBlocks.solidChannelEffects.red, 0);
      target.setEffect(UnsandboxedColorsBlocks.solidChannelEffects.green, 0);
      target.setEffect(UnsandboxedColorsBlocks.solidChannelEffects.blue, 0);
    }

    _setOutlineColor(target, color) {
      if (!target || typeof target.setEffect !== "function") return;
      if (!this._ensureEffectsRegistered()) return;

      target.setEffect(
        UnsandboxedColorsBlocks.outlineColorEffects.red,
        this._toSolidRawChannel(color.r)
      );
      target.setEffect(
        UnsandboxedColorsBlocks.outlineColorEffects.green,
        this._toSolidRawChannel(color.g)
      );
      target.setEffect(
        UnsandboxedColorsBlocks.outlineColorEffects.blue,
        this._toSolidRawChannel(color.b)
      );
    }

    _setOutlineOpacity(target, opacity) {
      if (!target || typeof target.setEffect !== "function") return;
      if (!this._ensureEffectsRegistered()) return;

      const next = Math.max(0, Math.min(100, Cast.toNumber(opacity)));
      if (next > 0) {
        this._ensureOutlineColor(target);
        this._ensureOutlineWidth(target);
      }
      target.setEffect(UnsandboxedColorsBlocks.outlineOpacityEffect, Number.isFinite(next) ? next : 0);
    }

    _setOutlineWidth(target, width) {
      if (!target || typeof target.setEffect !== "function") return;
      if (!this._ensureEffectsRegistered()) return;

      const next = Math.max(0, Math.min(20, Cast.toNumber(width)));
      if (next > 0) {
        this._ensureOutlineColor(target);
      }
      target.setEffect(UnsandboxedColorsBlocks.outlineWidthEffect, Number.isFinite(next) ? next : 0);
    }

    _ensureOutlineColor(target) {
      if (!target || !target.effects || typeof target.setEffect !== "function") return;

      const effects = UnsandboxedColorsBlocks.outlineColorEffects;
      if (!Cast.toNumber(target.effects[effects.red])) {
        target.setEffect(effects.red, 256);
      }
      if (!Cast.toNumber(target.effects[effects.green])) {
        target.setEffect(effects.green, 256);
      }
      if (!Cast.toNumber(target.effects[effects.blue])) {
        target.setEffect(effects.blue, 256);
      }
    }

    _ensureOutlineWidth(target) {
      if (!target || !target.effects || typeof target.setEffect !== "function") return;

      const widthEffect = UnsandboxedColorsBlocks.outlineWidthEffect;
      if (!Cast.toNumber(target.effects[widthEffect])) {
        target.setEffect(widthEffect, 1);
      }
    }

    _parseColorInput(value) {
      const raw = Cast.toString(value).trim();

      const shortHexMatch = /^#([0-9a-fA-F]{3})$/.exec(raw);
      if (shortHexMatch) {
        const hex = shortHexMatch[1];
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16)
        };
      }

      const longHexMatch = /^#([0-9a-fA-F]{6})$/.exec(raw);
      if (longHexMatch) {
        const hex = longHexMatch[1];
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16)
        };
      }

      const packed = Cast.toNumber(value);
      if (Number.isFinite(packed)) {
        const rgb = Math.max(0, Math.min(0xFFFFFF, Math.floor(packed)));
        return {
          r: (rgb >> 16) & 0xFF,
          g: (rgb >> 8) & 0xFF,
          b: rgb & 0xFF
        };
      }

      return {r: 255, g: 255, b: 255};
    }

    _getRenderer() {
      return this.runtime && this.runtime.renderer ? this.runtime.renderer : null;
    }

    _toPosition(value) {
      const position = Cast.toArray(value).slice(0, 2).map(number => Cast.toNumber(number));
      return [position[0] || 0, position[1] || 0];
    }

    _getTopVisibleDrawables(renderer, position) {
      if (!renderer || !Array.isArray(renderer._drawList) || !renderer._allDrawables) return [];

      const x = position[0];
      const y = position[1];
      const drawables = [];
      for (let i = renderer._drawList.length - 1; i >= 0; i--) {
        const drawableId = renderer._drawList[i];
        const drawable = renderer._allDrawables[drawableId];
        if (!drawable) continue;
        if (typeof drawable.getVisible === "function" && !drawable.getVisible()) continue;

        if (typeof drawable.getFastBounds === "function") {
          const bounds = drawable.getFastBounds();
          if (!bounds || x < bounds.left || x > bounds.right || y < bounds.bottom || y > bounds.top) {
            continue;
          }
        }

        // sampleColor4b requires CPU render attributes + a live silhouette.
        if (typeof drawable.updateCPURenderAttributes === "function") {
          drawable.updateCPURenderAttributes();
        }

        const skin = drawable.skin;
        if (!skin || !skin._silhouette) continue;

        drawables.push({drawable});
      }

      return drawables;
    }

    _rgbToHex(color) {
      const toHex = channel => {
        const value = Math.max(0, Math.min(255, Math.round(Cast.toNumber(channel))));
        return value.toString(16).padStart(2, "0");
      };

      return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
    }

    getInfo() {
      return {
        id: UnsandboxedColorsBlocks.extensionId,
        name: translate("Colors and Effects"),
        requires: {
          usbVectors: ["vec2"]
        },
        blocks: [
          {
            opcode: "setModeToColor",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set [MODE] to [COLOR]"),
            arguments: {
              MODE: {
                type: Scratch.ArgumentType.STRING,
                menu: "modes",
                defaultValue: "tint"
              },
              COLOR: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: "#ff0000"
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          "---",
          {
            opcode: "setEffectChannel",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set [CHANNEL] to [VALUE]"),
            arguments: {
              CHANNEL: {
                type: Scratch.ArgumentType.STRING,
                menu: "channels",
                defaultValue: "red"
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "changeEffectChannel",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("change [CHANNEL] by [VALUE]"),
            arguments: {
              CHANNEL: {
                type: Scratch.ArgumentType.STRING,
                menu: "channels",
                defaultValue: "red"
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "getEffectChannel",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("[CHANNEL] value"),
            arguments: {
              CHANNEL: {
                type: Scratch.ArgumentType.STRING,
                menu: "channels",
                defaultValue: "red"
              }
            },
            filter: [Scratch.TargetType.SPRITE],
            disableMonitor: true
          },
          "---",
          {
            opcode: "setOutlineColor",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set outline color to [COLOR]"),
            arguments: {
              COLOR: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: "#000000"
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "setOutlineSetting",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set outline [SETTING] to [VALUE]"),
            arguments: {
              SETTING: {
                type: Scratch.ArgumentType.STRING,
                menu: "outlineSettings",
                defaultValue: "width"
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          "---",
          {
            opcode: "getColorAtPosition",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("color at [POSITION]"),
            arguments: {
              POSITION: {
                type: Scratch.ArgumentType.POSITION
              }
            },
            disableMonitor: true
          }
        ],
        menus: {
          outlineSettings: {
            acceptReporters: false,
            items: [
              {text: translate("width"), value: "width"},
              {text: translate("opacity"), value: "opacity"}
            ]
          },
          channels: {
            acceptReporters: false,
            items: [
              {text: translate("red"), value: "red"},
              {text: translate("green"), value: "green"},
              {text: translate("blue"), value: "blue"}
            ]
          },
          modes: {
            acceptReporters: false,
            items: [
              {text: translate("tint"), value: "tint"},
              {text: translate("color"), value: "color"}
            ]
          }
        }
      };
    }

    setEffectChannel(args, util) {
      const target = this._getTarget(util);
      if (!target) return;
      this._setChannelValue(target, args.CHANNEL, args.VALUE);
    }

    changeEffectChannel(args, util) {
      const target = this._getTarget(util);
      if (!target) return;
      const channel = this._normalizeChannel(args.CHANNEL);
      const current = this._getChannelValue(target, channel);
      this._setChannelValue(target, channel, current + Cast.toNumber(args.VALUE));
    }

    getEffectChannel(args, util) {
      const target = this._getTarget(util);
      if (!target) return 0;
      return this._getChannelValue(target, args.CHANNEL);
    }

    getColorAtPosition(args) {
      const renderer = this._getRenderer();
      if (!renderer || typeof renderer.sampleColor4b !== "function") return "#000000";

      const position = this._toPosition(args.POSITION);
      const drawables = this._getTopVisibleDrawables(renderer, position);
      this._sampleScratchVec[0] = position[0];
      this._sampleScratchVec[1] = position[1];
      this._sampleScratchVec[2] = 0;
      const sampled = renderer.sampleColor4b(this._sampleScratchVec, drawables, this._sampleColorBuffer);

      if (!sampled || sampled.length < 3) return "#000000";
      return this._rgbToHex({r: sampled[0], g: sampled[1], b: sampled[2]});
    }

    setOutlineColor(args, util) {
      const target = this._getTarget(util);
      if (!target) return;

      const color = this._parseColorInput(args.COLOR);
      this._setOutlineColor(target, color);
    }

    setOutlineOpacity(args, util) {
      const target = this._getTarget(util);
      if (!target) return;

      this._setOutlineOpacity(target, args.OPACITY);
    }

    setOutlineSetting(args, util) {
      const target = this._getTarget(util);
      if (!target) return;

      const setting = Cast.toString(args.SETTING).trim().toLowerCase();
      if (setting === "opacity") {
        this._setOutlineOpacity(target, args.VALUE);
      } else {
        this._setOutlineWidth(target, args.VALUE);
      }
    }


    setModeToColor(args, util) {
      const target = this._getTarget(util);
      if (!target) return;

      const mode = this._normalizeMode(args.MODE);
      const color = this._parseColorInput(args.COLOR);
      if (mode === "color") {
        this._setChannelValue(target, "red", 0);
        this._setChannelValue(target, "green", 0);
        this._setChannelValue(target, "blue", 0);
        this._setSolidColor(target, color);
        return;
      }

      this._clearSolidColor(target);
      this._setChannelValue(target, "red", this._toEffectFromTintChannel(color.r));
      this._setChannelValue(target, "green", this._toEffectFromTintChannel(color.g));
      this._setChannelValue(target, "blue", this._toEffectFromTintChannel(color.b));
    }
  }

  Scratch.extensions.register(new UnsandboxedColorsBlocks());
})(Scratch);
