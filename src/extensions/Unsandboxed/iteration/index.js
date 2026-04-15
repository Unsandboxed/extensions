(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  /**
   * Unsandboxed blocks for iterating arrays and objects.
   * @constructor
   */
  class UnsandboxedIterationBlocks {
    /**
     * The extension identifier of this block package.
     * @type {string}
     */
    static extensionId = "usbIteration";

    constructor() {
      this.vm = Scratch.vm;
      this.runtime = this.vm.runtime;

      if (Scratch.ensureParameterReporterRenamer) {
        const renamer = Scratch.ensureParameterReporterRenamer(this.runtime, Scratch.gui, Cast);
        if (renamer) {
          renamer.register(`${UnsandboxedIterationBlocks.extensionId}_forKeyValue`, ["KEY", "VALUE"], {
            KEY: translate("key"),
            VALUE: translate("value")
          });
          renamer.register(`${UnsandboxedIterationBlocks.extensionId}_forItem`, ["ITEM", "INDEX"], {
            ITEM: translate("item"),
            INDEX: "#"
          });
          renamer.register(`${UnsandboxedIterationBlocks.extensionId}_forRange`, ["INDEX"], {
            INDEX: "#"
          });
          renamer.register(`${UnsandboxedIterationBlocks.extensionId}_repeatWith`, ["INDEX"], {
            INDEX: "#"
          });
          renamer.register(`${UnsandboxedIterationBlocks.extensionId}_forChar`, ["CHAR", "INDEX"], {
            CHAR: translate("character"),
            INDEX: "#"
          });
        }
      }
    }

    _getParameterName(util, inputName, fallback = "") {
      const blockId = util?.thread?.peekStack && util.thread.peekStack();
      if (!blockId) return Cast.toString(fallback);

      const block = util.target?.blocks?.getBlock(blockId);
      if (!block || !block.inputs || !block.inputs[inputName]) {
        return Cast.toString(fallback);
      }

      const inputId = block.inputs[inputName].block;
      const inputBlock = util.target.blocks.getBlock(inputId);
      const fieldValue = inputBlock?.fields?.VALUE?.value;
      if (typeof fieldValue === "undefined" || fieldValue === null) {
        return Cast.toString(fallback);
      }

      return Cast.toString(fieldValue);
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedIterationBlocks.extensionId,
        name: translate("Iteration"),
        color1: "#FFAB19",
        blocks: [
          {
            opcode: "forKeyValue",
            blockType: Scratch.BlockType.LOOP,
            text: translate("for [KEY] [VALUE] in [OBJECT]"),
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: translate("key")
              },
              VALUE: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: translate("value")
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          },
          {
            opcode: "forItem",
            blockType: Scratch.BlockType.LOOP,
            text: translate("for [ITEM] [INDEX] in [ARRAY]"),
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: translate("item")
              },
              INDEX: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "#"
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              }
            }
          },
          "---",
          {
            opcode: "repeatWith",
            blockType: Scratch.BlockType.LOOP,
            text: translate("repeat [COUNT] times with [INDEX]"),
            arguments: {
              COUNT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              },
              INDEX: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "i"
              }
            }
          },
          {
            opcode: "forRange",
            blockType: Scratch.BlockType.LOOP,
            text: translate("for [INDEX] from [START] to [END] by [STEP]"),
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "i"
              },
              START: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              },
              END: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              },
              STEP: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: "forChar",
            blockType: Scratch.BlockType.LOOP,
            text: translate("for [CHAR] [INDEX] in [TEXT]"),
            arguments: {
              CHAR: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: translate("char")
              },
              INDEX: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "#"
              },
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("text")
              }
            }
          }
        ],
        menus: {}
      };
    }

    /**
     * Iterate key/value pairs from an object.
     * @param {object} args Block arguments.
     * @param {object} util Block utility object.
     * @returns {boolean|undefined} Truthy while loop should continue.
     */
    forKeyValue(args, util) {
      const keyName = this._getParameterName(util, "KEY", args.KEY);
      const valueName = this._getParameterName(util, "VALUE", args.VALUE);

      if (typeof util.stackFrame.index === "undefined") {
        util.stackFrame.index = 0;
      }

      const source = Cast.toObject(args.OBJECT);
      const keys = Object.keys(source);
      const values = Object.values(source);

      if (util.stackFrame.index < keys.length) {
        util.thread.initParams();
        util.thread.pushParam(keyName, keys[util.stackFrame.index]);
        util.thread.pushParam(valueName, values[util.stackFrame.index]);
        util.stackFrame.index++;
        util.startBranch(1, true);
      } else {
        util.startBranch(2, false);
      }
    }

    /**
     * Iterate items from an array.
     * @param {object} args Block arguments.
     * @param {object} util Block utility object.
     * @returns {boolean|undefined} Truthy while loop should continue.
     */
    forItem(args, util) {
      const itemName = this._getParameterName(util, "ITEM", args.ITEM);
      const indexName = this._getParameterName(util, "INDEX", args.INDEX);

      if (typeof util.stackFrame.index === "undefined") {
        util.stackFrame.index = 0;
      }

      const array = Cast.toArray(args.ARRAY);

      if (util.stackFrame.index < array.length) {
        util.thread.initParams();
        util.thread.pushParam(itemName, array[util.stackFrame.index]);
        util.thread.pushParam(indexName, util.stackFrame.index + 1);
        util.stackFrame.index++;
        util.startBranch(1, true);
      } else {
        util.startBranch(2, false);
      }
    }

    repeatWith(args, util) {
      const indexName = this._getParameterName(util, "INDEX", args.INDEX);

      if (typeof util.stackFrame.index === "undefined") {
        util.stackFrame.index = 0;
      }

      const count = Math.max(0, Math.floor(Cast.toNumber(args.COUNT)));
      if (util.stackFrame.index < count) {
        util.thread.initParams();
        util.thread.pushParam(indexName, util.stackFrame.index + 1);
        util.stackFrame.index++;
        util.startBranch(1, true);
      } else {
        util.startBranch(2, false);
      }
    }

    forRange(args, util) {
      const indexName = this._getParameterName(util, "INDEX", args.INDEX);

      if (typeof util.stackFrame.initialized === "undefined") {
        const start = Cast.toNumber(args.START);
        const end = Cast.toNumber(args.END);
        let step = Cast.toNumber(args.STEP);

        if (!Number.isFinite(start) || !Number.isFinite(end)) {
          util.startBranch(2, false);
          return;
        }

        if (!Number.isFinite(step) || step === 0) {
          step = start <= end ? 1 : -1;
        }

        util.stackFrame.initialized = true;
        util.stackFrame.current = start;
        util.stackFrame.end = end;
        util.stackFrame.step = step;
      }

      const current = util.stackFrame.current;
      const end = util.stackFrame.end;
      const step = util.stackFrame.step;
      const inRange = step > 0 ? current <= end : current >= end;

      if (inRange) {
        util.thread.initParams();
        util.thread.pushParam(indexName, current);
        util.stackFrame.current = current + step;
        util.startBranch(1, true);
      } else {
        util.startBranch(2, false);
      }
    }

    forChar(args, util) {
      const charName = this._getParameterName(util, "CHAR", args.CHAR);
      const indexName = this._getParameterName(util, "INDEX", args.INDEX);

      if (typeof util.stackFrame.index === "undefined") {
        util.stackFrame.index = 0;
      }

      const text = Cast.toString(args.TEXT);
      if (util.stackFrame.index < text.length) {
        util.thread.initParams();
        util.thread.pushParam(charName, text[util.stackFrame.index]);
        util.thread.pushParam(indexName, util.stackFrame.index + 1);
        util.stackFrame.index++;
        util.startBranch(1, true);
      } else {
        util.startBranch(2, false);
      }
    }

  }

  Scratch.extensions.register(new UnsandboxedIterationBlocks());
})(Scratch);