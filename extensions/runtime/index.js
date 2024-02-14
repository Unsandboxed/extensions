// Name: Runtime Options
// ID: runtimeoptions
// Description: Get and modify turbo mode, framerate, interpolation, clone limit, stage size, and more.

(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error("Runtime Options extension needs to be run unsandboxed");
  }

  const TURBO_MODE = "turbo mode";
  const REMOVE_FENCING = "remove fencing";
  const REMOVE_MISC_LIMITS = "remove misc limits";
  const HIGH_QUALITY_PEN = "high quality pen";
  const FRAMERATE = "framerate";
  const CLONE_LIMIT = "clone limit";
  const STAGE_SIZE = "stage size";
  const USERNAME = "username";

  /** @param {string} thing */
  const emitChanged = (thing) =>
    Scratch.vm.runtime.startHats("usbRuntime_whenChange", {
      thing,
    });

  /**
   * @template T
   * @param {T} obj
   * @returns {T}
   */
  const shallowCopy = (obj) => Object.assign({}, obj);

  let previousRuntimeOptions = shallowCopy(Scratch.vm.runtime.runtimeOptions);

  Scratch.vm.on("TURBO_MODE_OFF", () => emitChanged(TURBO_MODE));
  Scratch.vm.on("TURBO_MODE_ON", () => emitChanged(TURBO_MODE));
  Scratch.vm.on("RUNTIME_OPTIONS_CHANGED", (newOptions) => {
    if (newOptions.fencing !== previousRuntimeOptions.fencing) {
      emitChanged(REMOVE_FENCING);
    }
    if (newOptions.miscLimits !== previousRuntimeOptions.miscLimits) {
      emitChanged(REMOVE_MISC_LIMITS);
    }
    if (newOptions.maxClones !== previousRuntimeOptions.maxClones) {
      emitChanged(CLONE_LIMIT);
    }
    previousRuntimeOptions = shallowCopy(newOptions);
  });
  Scratch.vm.renderer.on("UseHighQualityRenderChanged", () =>
    emitChanged(HIGH_QUALITY_PEN)
  );
  Scratch.vm.on("FRAMERATE_CHANGED", () => emitChanged(FRAMERATE));
  Scratch.vm.on("STAGE_SIZE_CHANGED", () => emitChanged(STAGE_SIZE));

  const originalPostData = Scratch.vm.runtime.ioDevices.userData.postData;
  Scratch.vm.runtime.ioDevices.userData.postData = function (data) {
    const newUsername = data.username !== this._username;
    originalPostData.call(this, data);
    if (newUsername) {
      emitChanged(USERNAME);
    }
  };

  class Runtime {
    getInfo() {
      return {
        id: "usbRuntime",
        name: Scratch.translate("Runtime"),
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
            text: Scratch.translate("[thing] enabled?"),
            blockType: Scratch.BlockType.BOOLEAN,
            arguments: {
              thing: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: TURBO_MODE,
                menu: "thing",
              },
            },
          },
          {
            opcode: "setEnabled",
            text: Scratch.translate("set [thing] to [enabled]"),
            blockType: Scratch.BlockType.COMMAND,
            arguments: {
              thing: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: TURBO_MODE,
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
            text: Scratch.translate("framerate limit"),
            blockType: Scratch.BlockType.REPORTER,
          },
          {
            opcode: "setFramerate",
            text: Scratch.translate("set framerate limit to [fps]"),
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
            text: Scratch.translate("clone limit"),
            blockType: Scratch.BlockType.REPORTER,
          },
          {
            opcode: "setCloneLimit",
            text: Scratch.translate("set clone limit to [limit]"),
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
            text: Scratch.translate({
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
            text: Scratch.translate(
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
            text: Scratch.translate("set username to [username]"),
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
                text: Scratch.translate("turbo mode"),
                value: TURBO_MODE,
              },
              {
                text: Scratch.translate("remove fencing"),
                value: REMOVE_FENCING,
              },
              {
                text: Scratch.translate("remove misc limits"),
                value: REMOVE_MISC_LIMITS,
              },
              {
                text: Scratch.translate("high quality pen"),
                value: HIGH_QUALITY_PEN,
              },
            ],
          },

          changeable: {
            acceptReporters: false,
            items: [
              {
                text: Scratch.translate("turbo mode"),
                value: TURBO_MODE,
              },
              {
                text: Scratch.translate("remove fencing"),
                value: REMOVE_FENCING,
              },
              {
                text: Scratch.translate("remove misc limits"),
                value: REMOVE_MISC_LIMITS,
              },
              {
                text: Scratch.translate("high quality pen"),
                value: HIGH_QUALITY_PEN,
              },
              {
                text: Scratch.translate("framerate"),
                value: FRAMERATE,
              },
              {
                text: Scratch.translate("clone limit"),
                value: CLONE_LIMIT,
              },
              {
                text: Scratch.translate("stage size"),
                value: STAGE_SIZE,
              },
              {
                text: Scratch.translate("username"),
                value: USERNAME,
              },
            ],
          },

          enabled: {
            acceptReporters: true,
            items: [
              {
                text: Scratch.translate("enabled"),
                value: "true",
              },
              {
                text: Scratch.translate("disabled"),
                value: "false",
              },
            ],
          },

          clones: {
            acceptReporters: true,
            acceptNumber: true,
            items: [
              {
                text: Scratch.translate("default ({n})", {
                  n: "300",
                }),
                value: "300",
              },
              {
                text: Scratch.translate("Infinity"),
                value: "Infinity",
              },
            ],
          },

          dimension: {
            acceptReporters: true,
            items: [
              {
                text: Scratch.translate("width"),
                value: "width",
              },
              {
                text: Scratch.translate("height"),
                value: "height",
              },
            ],
          },
        },
      };
    }

    getEnabled({ thing }) {
      if (thing === TURBO_MODE) {
        return Scratch.vm.runtime.turboMode;
      } else if (thing === REMOVE_FENCING) {
        return !Scratch.vm.runtime.runtimeOptions.fencing;
      } else if (thing === REMOVE_MISC_LIMITS) {
        return !Scratch.vm.runtime.runtimeOptions.miscLimits;
      } else if (thing === HIGH_QUALITY_PEN) {
        return Scratch.renderer.useHighQualityRender;
      }
      return false;
    }

    setEnabled({ thing, enabled }) {
      enabled = Scratch.Cast.toBoolean(enabled);

      if (thing === TURBO_MODE) {
        Scratch.vm.setTurboMode(enabled);
      } else if (thing === REMOVE_FENCING) {
        Scratch.vm.setRuntimeOptions({
          fencing: !enabled,
        });
      } else if (thing === REMOVE_MISC_LIMITS) {
        Scratch.vm.setRuntimeOptions({
          miscLimits: !enabled,
        });
      } else if (thing === HIGH_QUALITY_PEN) {
        Scratch.renderer.setUseHighQualityRender(enabled);
      }
    }

    getFramerate() {
      return Scratch.vm.runtime.frameLoop.framerate;
    }

    setFramerate({ fps }) {
      fps = Scratch.Cast.toNumber(fps);
      Scratch.vm.setFramerate(fps);
    }

    getCloneLimit() {
      return Scratch.vm.runtime.runtimeOptions.maxClones;
    }

    setCloneLimit({ limit }) {
      limit = Scratch.Cast.toNumber(limit);
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
      width = Scratch.Cast.toNumber(width);
      height = Scratch.Cast.toNumber(height);
      Scratch.vm.setStageSize(width, height);
    }

    setUsername({ username }) {
      Scratch.vm.postIOData("userData", {
        username: Scratch.Cast.toString(username),
      });
    }
  }

  Scratch.extensions.register(new Runtime());
})(Scratch);
