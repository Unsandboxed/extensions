(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  const STRETCH_X = Symbol("stretch.x");
  const STRETCH_Y = Symbol("stretch.y");
  const SKEW_X = Symbol("skew.x");
  const SKEW_Y = Symbol("skew.y");

  const TRANSFORM_STRETCH = "stretch";
  const TRANSFORM_SKEW = "skew";

  class UnsandboxedStretchBlocks {
    /**
     * The extension identifier of this block package.
     * @type {string}
     */
    static extensionId = "stretch";

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

      this.runtime.targets.forEach(target => this._implementTarget(target));
      this.runtime.on("targetWasCreated", (target, originalTarget) =>
        this._implementTarget(target, originalTarget)
      );
      this.runtime.on("PROJECT_LOADED", () => {
        this.runtime.targets.forEach(target => this._implementTarget(target));
      });
    }

    /**
     * @param {string} value
     * @returns {string}
     */
    _normalizeTransform(value) {
      return Cast.toString(value).toLowerCase() === TRANSFORM_SKEW
        ? TRANSFORM_SKEW
        : TRANSFORM_STRETCH;
    }

    /**
     * @param {VM.RenderedTarget} target
     */
    _forceUpdateDirectionAndScale(target) {
      target.setDirection(target.direction);
    }

    /**
     * @param {VM.RenderedTarget} target
     */
    _applySkewToTarget(target) {
      if (!target || target.isStage || !target.renderer || target.drawableID === null) {
        return;
      }

      target.renderer.updateDrawableSkew(target.drawableID, [target[SKEW_X], target[SKEW_Y]]);

      if (target.visible) {
        target.emitVisualChange();
        target.runtime.requestRedraw();
      }

      target.runtime.requestTargetsUpdate(target);
    }

    /**
     * @param {VM.RenderedTarget} target
     * @param {VM.RenderedTarget} [originalTarget]
     */
    _implementTarget(target, originalTarget) {
      if (!target || target.isStage) return;
      if (STRETCH_X in target) return;

      target[STRETCH_X] = originalTarget ? originalTarget[STRETCH_X] : 100;
      target[STRETCH_Y] = originalTarget ? originalTarget[STRETCH_Y] : 100;
      target[SKEW_X] = originalTarget ? originalTarget[SKEW_X] : 0;
      target[SKEW_Y] = originalTarget ? originalTarget[SKEW_Y] : 0;

      const original = target._getRenderedDirectionAndScale;
      target._getRenderedDirectionAndScale = function () {
        const result = original.call(this);
        result.scale[0] *= this[STRETCH_X] / 100;
        result.scale[1] *= this[STRETCH_Y] / 100;
        return result;
      };

      this._applySkewToTarget(target);
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedStretchBlocks.extensionId,
        name: translate("Stretch & Skew"),
        color1: "#9966FF",
        color2: "#855CD6",
        color3: "#774DCB",
        blocks: [
          {
            opcode: "setStretch",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set [TRANSFORM] to x: [X] y: [Y]"),
            arguments: {
              TRANSFORM: {
                type: Scratch.ArgumentType.STRING,
                menu: "transformType",
                defaultValue: TRANSFORM_STRETCH
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 100
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 100
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "changeStretch",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("change [TRANSFORM] by x: [DX] y: [DY]"),
            arguments: {
              TRANSFORM: {
                type: Scratch.ArgumentType.STRING,
                menu: "transformType",
                defaultValue: TRANSFORM_STRETCH
              },
              DX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              },
              DY: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          "---",
          {
            opcode: "setStretchX",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set [TRANSFORM] x to [X]"),
            arguments: {
              TRANSFORM: {
                type: Scratch.ArgumentType.STRING,
                menu: "transformType",
                defaultValue: TRANSFORM_STRETCH
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 100
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "setStretchY",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set [TRANSFORM] y to [Y]"),
            arguments: {
              TRANSFORM: {
                type: Scratch.ArgumentType.STRING,
                menu: "transformType",
                defaultValue: TRANSFORM_STRETCH
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 100
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "changeStretchX",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("change [TRANSFORM] x by [DX]"),
            arguments: {
              TRANSFORM: {
                type: Scratch.ArgumentType.STRING,
                menu: "transformType",
                defaultValue: TRANSFORM_STRETCH
              },
              DX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "changeStretchY",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("change [TRANSFORM] y by [DY]"),
            arguments: {
              TRANSFORM: {
                type: Scratch.ArgumentType.STRING,
                menu: "transformType",
                defaultValue: TRANSFORM_STRETCH
              },
              DY: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              }
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          "---",
          {
            opcode: "getX",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("x [TRANSFORM]"),
            arguments: {
              TRANSFORM: {
                type: Scratch.ArgumentType.STRING,
                menu: "transformType",
                defaultValue: TRANSFORM_STRETCH
              }
            },
            filter: [Scratch.TargetType.SPRITE],
            disableMonitor: true
          },
          {
            opcode: "getY",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("y [TRANSFORM]"),
            arguments: {
              TRANSFORM: {
                type: Scratch.ArgumentType.STRING,
                menu: "transformType",
                defaultValue: TRANSFORM_STRETCH
              }
            },
            filter: [Scratch.TargetType.SPRITE],
            disableMonitor: true
          },

          // Legacy skew opcodes remain for compatibility with existing projects.
          {
            opcode: "setSkew",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set skew to x: [X] y: [Y]"),
            hideFromPalette: true,
            arguments: {
              X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0},
              Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "changeSkew",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("change skew by x: [DX] y: [DY]"),
            hideFromPalette: true,
            arguments: {
              DX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 10},
              DY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 10}
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "setSkewX",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set skew x to [X]"),
            hideFromPalette: true,
            arguments: {
              X: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "setSkewY",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set skew y to [Y]"),
            hideFromPalette: true,
            arguments: {
              Y: {type: Scratch.ArgumentType.NUMBER, defaultValue: 0}
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "changeSkewX",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("change skew x by [DX]"),
            hideFromPalette: true,
            arguments: {
              DX: {type: Scratch.ArgumentType.NUMBER, defaultValue: 10}
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "changeSkewY",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("change skew y by [DY]"),
            hideFromPalette: true,
            arguments: {
              DY: {type: Scratch.ArgumentType.NUMBER, defaultValue: 10}
            },
            filter: [Scratch.TargetType.SPRITE]
          },
          {
            opcode: "getSkewX",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("x skew"),
            hideFromPalette: true,
            filter: [Scratch.TargetType.SPRITE],
            disableMonitor: true
          },
          {
            opcode: "getSkewY",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("y skew"),
            hideFromPalette: true,
            filter: [Scratch.TargetType.SPRITE],
            disableMonitor: true
          }
        ],
        menus: {
          transformType: {
            acceptReporters: false,
            items: [
              {text: translate("stretch"), value: TRANSFORM_STRETCH},
              {text: translate("skew"), value: TRANSFORM_SKEW}
            ]
          }
        }
      };
    }

    setStretch(args, util) {
      const transform = this._normalizeTransform(args.TRANSFORM);
      const x = Cast.toNumber(args.X);
      const y = Cast.toNumber(args.Y);

      if (transform === TRANSFORM_SKEW) {
        util.target[SKEW_X] = x;
        util.target[SKEW_Y] = y;
        this._applySkewToTarget(util.target);
      } else {
        util.target[STRETCH_X] = x;
        util.target[STRETCH_Y] = y;
        this._forceUpdateDirectionAndScale(util.target);
      }
    }

    changeStretch(args, util) {
      const transform = this._normalizeTransform(args.TRANSFORM);
      const dx = Cast.toNumber(args.DX);
      const dy = Cast.toNumber(args.DY);

      if (transform === TRANSFORM_SKEW) {
        util.target[SKEW_X] += dx;
        util.target[SKEW_Y] += dy;
        this._applySkewToTarget(util.target);
      } else {
        util.target[STRETCH_X] += dx;
        util.target[STRETCH_Y] += dy;
        this._forceUpdateDirectionAndScale(util.target);
      }
    }

    setStretchX(args, util) {
      const transform = this._normalizeTransform(args.TRANSFORM);
      const value = Cast.toNumber(args.X);
      if (transform === TRANSFORM_SKEW) {
        util.target[SKEW_X] = value;
        this._applySkewToTarget(util.target);
      } else {
        util.target[STRETCH_X] = value;
        this._forceUpdateDirectionAndScale(util.target);
      }
    }

    setStretchY(args, util) {
      const transform = this._normalizeTransform(args.TRANSFORM);
      const value = Cast.toNumber(args.Y);
      if (transform === TRANSFORM_SKEW) {
        util.target[SKEW_Y] = value;
        this._applySkewToTarget(util.target);
      } else {
        util.target[STRETCH_Y] = value;
        this._forceUpdateDirectionAndScale(util.target);
      }
    }

    changeStretchX(args, util) {
      const transform = this._normalizeTransform(args.TRANSFORM);
      const value = Cast.toNumber(args.DX);
      if (transform === TRANSFORM_SKEW) {
        util.target[SKEW_X] += value;
        this._applySkewToTarget(util.target);
      } else {
        util.target[STRETCH_X] += value;
        this._forceUpdateDirectionAndScale(util.target);
      }
    }

    changeStretchY(args, util) {
      const transform = this._normalizeTransform(args.TRANSFORM);
      const value = Cast.toNumber(args.DY);
      if (transform === TRANSFORM_SKEW) {
        util.target[SKEW_Y] += value;
        this._applySkewToTarget(util.target);
      } else {
        util.target[STRETCH_Y] += value;
        this._forceUpdateDirectionAndScale(util.target);
      }
    }

    getX(args, util) {
      const transform = this._normalizeTransform(args.TRANSFORM);
      return transform === TRANSFORM_SKEW ? util.target[SKEW_X] : util.target[STRETCH_X];
    }

    getY(args, util) {
      const transform = this._normalizeTransform(args.TRANSFORM);
      return transform === TRANSFORM_SKEW ? util.target[SKEW_Y] : util.target[STRETCH_Y];
    }

    // Legacy skew opcode implementations.
    setSkew(args, util) {
      this.setStretch({TRANSFORM: TRANSFORM_SKEW, X: args.X, Y: args.Y}, util);
    }

    changeSkew(args, util) {
      this.changeStretch({TRANSFORM: TRANSFORM_SKEW, DX: args.DX, DY: args.DY}, util);
    }

    setSkewX(args, util) {
      this.setStretchX({TRANSFORM: TRANSFORM_SKEW, X: args.X}, util);
    }

    setSkewY(args, util) {
      this.setStretchY({TRANSFORM: TRANSFORM_SKEW, Y: args.Y}, util);
    }

    changeSkewX(args, util) {
      this.changeStretchX({TRANSFORM: TRANSFORM_SKEW, DX: args.DX}, util);
    }

    changeSkewY(args, util) {
      this.changeStretchY({TRANSFORM: TRANSFORM_SKEW, DY: args.DY}, util);
    }

    getSkewX(args, util) {
      return this.getX({TRANSFORM: TRANSFORM_SKEW}, util);
    }

    getSkewY(args, util) {
      return this.getY({TRANSFORM: TRANSFORM_SKEW}, util);
    }
  }

  Scratch.extensions.register(new UnsandboxedStretchBlocks());
})(Scratch);
