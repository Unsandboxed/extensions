(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  /**
   * The constructor for a Scratch Runtime.
   * We only use this to get constants from.
   * TODO: There's probably a better way to get this.
   */
  const Runtime = vm.runtime.constructor;

  /**
   * The constructor for a Scratch Renderer.
   * We only use this to get constants from.
   * TODO: There's probably a better way to get this.
   */
  const Renderer = vm.runtime.renderer.constructor;

  /**
   * Unsandboxed blocks for modifying the runtime.
   * @constructor
   */
  class UnsandboxedRuntimeBlocks {
    /**
     * The extension identifier of this block package.
     * @type {string}
     */
    static extensionId = "usbRuntime";

    /**
     * The identifier for the "turbo mode" option.
     * @type {string}
     */
    static TURBO_MODE = "turbo mode";

    /**
     * The identifier for the "remove fencing" option.
     * @type {string}
     */
    static REMOVE_FENCING = "remove fencing";

    /**
     * The identifier for the "remove misc limits" option.
     * @type {string}
     */
    static REMOVE_MISC_LIMITS = "remove misc limits";

    /**
     * The identifier for the "high quality pen" option.
     * @type {string}
     */
    static HIGH_QUALITY_PEN = "high quality pen";

    /**
     * The identifier for the "framerate" option.
     * @type {string}
     */
    static FRAMERATE = "framerate";

    /**
     * The identifier for the "clone limit" option.
     * @type {string}
     */
    static CLONE_LIMIT = "clone limit";

    /**
     * The identifier for the "stage size" option.
     * @type {string}
     */
    static STAGE_SIZE = "stage size";

    /**
     * The identifier for the "username" option.
     * @type {string}
     */
    static USERNAME = "username";

    constructor() {
      /**
       * The Scratch Virtual Machine instance.
       * @type {VirtualMachine}
       */
      this.vm = Scratch.vm;

      /**
       * The runtime instantiating this block package.
       * @type {Runtime}
       */
      this.runtime = this.vm.runtime;

      this.previousRuntimeOptions = this.shallowClone(Scratch.vm.runtime.runtimeOptions);

      /**
       * Emit our custom events when Turbo Mode has changed.
       */
      this.vm.on(Runtime.TURBO_MODE_OFF, () => this.emitChanged(UnsandboxedRuntimeBlocks.TURBO_MODE));
      this.vm.on(Runtime.TURBO_MODE_ON, () => this.emitChanged(UnsandboxedRuntimeBlocks.TURBO_MODE));

      this.vm.on(Runtime.RUNTIME_OPTIONS_CHANGED, (newOptions) => {
        if (newOptions.fencing !== this.previousRuntimeOptions.fencing) {
          this.emitChanged(UnsandboxedRuntimeBlocks.REMOVE_FENCING);
        }
        if (newOptions.miscLimits !== this.previousRuntimeOptions.miscLimits) {
          this.emitChanged(UnsandboxedRuntimeBlocks.REMOVE_MISC_LIMITS);
        }
        if (newOptions.maxClones !== this.previousRuntimeOptions.maxClones) {
          this.emitChanged(UnsandboxedRuntimeBlocks.CLONE_LIMIT);
        }
        this.previousRuntimeOptions = this.shallowClone(newOptions);
      });

      this.vm.renderer.on(Renderer.UseHighQualityRenderChanged, () =>
        this.emitChanged(UnsandboxedRuntimeBlocks.HIGH_QUALITY_PEN)
      );

      this.vm.on(Runtime.FRAMERATE_CHANGED, () => this.emitChanged(UnsandboxedRuntimeBlocks.FRAMERATE));
      this.vm.on(Runtime.STAGE_SIZE_CHANGED, () => this.emitChanged(UnsandboxedRuntimeBlocks.STAGE_SIZE));

      const extensionInstance = this;
      const originalPostData = this.runtime.ioDevices.userData.postData;
      this.vm.runtime.ioDevices.userData.postData = function (data) {
        const newUsername = data.username !== this._username;
        originalPostData.call(this, data);
        if (newUsername) {
          extensionInstance.emitChanged(extensionInstance.USERNAME);
        }
      };
    }

    emitChanged(thing) {
      this.runtime.startHats("usbRuntime_whenChange", {
        thing,
      });
    }

    /**
     * @template T
     * @param {T} obj
     * @returns {T}
     */
    shallowClone(obj) {
      return Object.assign({}, obj);
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedRuntimeBlocks.extId,
        name: translate("Runtime"),
        blocks: [
          {
            opcode: "whenChange",
            blockType: Scratch.BlockType.EVENT,
            text: "when [thing] changed",
            isEdgeActivated: false,
            arguments: {
              thing: {
                type: Scratch.ArgumentType.STRING,
                menu: "changeable"
              },
            },
          },
          "---",
          {
            opcode: "getEnabled",
            text: translate("[thing] enabled?"),
            blockType: Scratch.BlockType.BOOLEAN,
            arguments: {
              thing: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: this.TURBO_MODE,
                menu: "thing",
              },
            },
          },
          {
            opcode: "setEnabled",
            text: translate("set [thing] to [enabled]"),
            blockType: Scratch.BlockType.COMMAND,
            arguments: {
              thing: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: this.TURBO_MODE,
                menu: "thing",
              },
              enabled: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "true",
                menu: "enabled",
              },
            },
          },
          "---",
          {
            opcode: "getFramerate",
            text: translate("framerate limit"),
            blockType: Scratch.BlockType.REPORTER,
          },
          {
            opcode: "setFramerate",
            text: translate("set framerate limit to [fps]"),
            blockType: Scratch.BlockType.COMMAND,
            arguments: {
              fps: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "30",
              },
            },
          },
          "---",
          {
            opcode: "getCloneLimit",
            text: translate("clone limit"),
            blockType: Scratch.BlockType.REPORTER,
          },
          {
            opcode: "setCloneLimit",
            text: translate("set clone limit to [limit]"),
            blockType: Scratch.BlockType.COMMAND,
            arguments: {
              limit: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "300",
                menu: "clones",
              },
            },
          },
          "---",
          {
            opcode: "getDimension",
            text: translate({
              default: "stage [dimension]",
              description: "[dimension] is a dropdown of width and height",
            }),
            blockType: Scratch.BlockType.REPORTER,
            arguments: {
              dimension: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "width",
                menu: "dimension",
              },
            },
          },
          {
            opcode: "setDimensions",
            text: translate(
              "set stage size width: [width] height: [height]"
            ),
            blockType: Scratch.BlockType.COMMAND,
            arguments: {
              width: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "480",
              },
              height: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: "360",
              },
            },
          },
          "---",
          {
            opcode: "setUsername",
            text: translate("set username to [username]"),
            blockType: Scratch.BlockType.COMMAND,
            arguments: {
              username: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "",
              },
            },
          },
        ],
        menus: {
          thing: {
            acceptReporters: true,
            items: [
              {
                text: translate("turbo mode"),
                value: UnsandboxedRuntimeBlocks.TURBO_MODE,
              },
              {
                text: translate("remove fencing"),
                value: UnsandboxedRuntimeBlocks.REMOVE_FENCING,
              },
              {
                text: translate("remove misc limits"),
                value: UnsandboxedRuntimeBlocks.REMOVE_MISC_LIMITS,
              },
              {
                text: translate("high quality pen"),
                value: UnsandboxedRuntimeBlocks.HIGH_QUALITY_PEN,
              },
            ],
          },
          changeable: {
            acceptReporters: false,
            items: [
              {
                text: translate("turbo mode"),
                value: UnsandboxedRuntimeBlocks.TURBO_MODE,
              },
              {
                text: translate("remove fencing"),
                value: UnsandboxedRuntimeBlocks.REMOVE_FENCING,
              },
              {
                text: translate("remove misc limits"),
                value: UnsandboxedRuntimeBlocks.REMOVE_MISC_LIMITS,
              },
              {
                text: translate("high quality pen"),
                value: UnsandboxedRuntimeBlocks.HIGH_QUALITY_PEN,
              },
              {
                text: translate("framerate"),
                value: UnsandboxedRuntimeBlocks.FRAMERATE,
              },
              {
                text: translate("clone limit"),
                value: UnsandboxedRuntimeBlocks.CLONE_LIMIT,
              },
              {
                text: translate("stage size"),
                value: UnsandboxedRuntimeBlocks.STAGE_SIZE,
              },
              {
                text: translate("username"),
                value: UnsandboxedRuntimeBlocks.USERNAME,
              },
            ],
          },
          enabled: {
            acceptReporters: true,
            items: [
              {
                text: translate("enabled"),
                value: "true",
              },
              {
                text: translate("disabled"),
                value: "false",
              },
            ],
          },
          clones: {
            acceptReporters: true,
            acceptNumber: true,
            items: [
              {
                text: translate("default ({n})", {
                  n: "300",
                }),
                value: "300",
              },
              {
                text: translate("Infinity"),
                value: "Infinity",
              },
            ],
          },
          dimension: {
            acceptReporters: true,
            items: [
              {
                text: translate("width"),
                value: "width",
              },
              {
                text: translate("height"),
                value: "height",
              },
            ],
          },
        },
      };
    }

    getEnabled({ thing }) {
      if (thing === UnsandboxedRuntimeBlocks.TURBO_MODE) {
        return Scratch.vm.runtime.turboMode;
      } else if (thing === UnsandboxedRuntimeBlocks.REMOVE_FENCING) {
        return !Scratch.vm.runtime.runtimeOptions.fencing;
      } else if (thing === UnsandboxedRuntimeBlocks.REMOVE_MISC_LIMITS) {
        return !Scratch.vm.runtime.runtimeOptions.miscLimits;
      } else if (thing === UnsandboxedRuntimeBlocks.HIGH_QUALITY_PEN) {
        return Scratch.renderer.useHighQualityRender;
      }
      return false;
    }

    setEnabled({ thing, enabled }) {
      enabled = Cast.toBoolean(enabled);

      if (thing === UnsandboxedRuntimeBlocks.TURBO_MODE) {
        Scratch.vm.setTurboMode(enabled);
      } else if (thing === this.REMOVE_FENCING) {
        Scratch.vm.setRuntimeOptions({
          fencing: !enabled,
        });
      } else if (thing === UnsandboxedRuntimeBlocks.REMOVE_MISC_LIMITS) {
        Scratch.vm.setRuntimeOptions({
          miscLimits: !enabled,
        });
      } else if (thing === UnsandboxedRuntimeBlocks.HIGH_QUALITY_PEN) {
        Scratch.renderer.setUseHighQualityRender(enabled);
      }
    }

    getFramerate() {
      return Scratch.vm.runtime.frameLoop.framerate;
    }

    setFramerate({ fps }) {
      fps = Cast.toNumber(fps);
      Scratch.vm.setFramerate(fps);
    }

    getCloneLimit() {
      return Scratch.vm.runtime.runtimeOptions.maxClones;
    }

    setCloneLimit({ limit }) {
      limit = Cast.toNumber(limit);
      Scratch.vm.setRuntimeOptions({
        maxClones: limit,
      });
    }

    getDimension({ dimension }) {
      if (dimension === "width") {
        return Scratch.vm.runtime.stageWidth;
      } else if (dimension === "height") {
        return Scratch.vm.runtime.stageHeight;
      }
      return 0;
    }

    setDimensions({ width, height }) {
      width = Cast.toNumber(width);
      height = Cast.toNumber(height);
      Scratch.vm.setStageSize(width, height);
    }

    setUsername({ username }) {
      Scratch.vm.postIOData("userData", {
        username: Cast.toString(username),
      });
    }
  }

  Scratch.extensions.register(new UnsandboxedRuntimeBlocks());
})(Scratch);