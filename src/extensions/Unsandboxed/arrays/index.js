(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;
  const IterationExtension = require("../iteration");

  /**
   * Unsandboxed blocks for working with JSON Arrays.
   * @constructor
   */
  class UnsandboxedArraysBlocks {
    /**
     * The extension identifier of this block package.
     * @type {string}
     */
    static extensionId = "usbArrays";

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

      if (Scratch.ensureParameterReporterRenamer) {
        const renamer = Scratch.ensureParameterReporterRenamer(this.runtime, Scratch.gui, Cast);
        if (renamer) {
          renamer.register(`${UnsandboxedArraysBlocks.extensionId}_map`, ["ITEM", "INDEX"], {
            ITEM: translate("item"),
            INDEX: "#"
          });
        }
      }
    }

    /**
     * Deep-clone an array and preserve its contents.
     * Functions, classes, and all types will be preserved.
     * We cannot use standard clone because it'll break our
     * custom types implementation.
     * @param {object} value The array to clone
     * @returns {object} The cloned array
     */
    complexClone(value) {
      return [...this._toSafeArray(value)]
    };

    _toSafeArray(value) {
      const casted = Cast.toArray(value);
      return Array.isArray(casted) ? casted : [];
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedArraysBlocks.extensionId,
        name: translate("Arrays"),
        color1: "#737fff",
        provides: {
          usbIteration: [
            "map"
          ],
        },
        blocks: [
          {
            opcode: "newArray",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("new array"),
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "1"
              }
            },
            extendable: {
              proceeds: ["ITEM"],
              minProceedGroups: 0
            }
          },
          {
            opcode: "stringToArray",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("[STRING] to array"),
            arguments: {
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: `["${translate("thing")}"]`,
              }
            }
          },
          {
            opcode: "concat",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("join"),
            arguments: {
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              }
            },
            extendable: {
              starts: ["ARRAY"],
              proceeds: ["ARRAY"],
              minProceedGroups: 0,
              initialExtendCount: 1
            }
          },
          "---",
          {
            opcode: "addItem",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("add [ITEM] to [ARRAY]"),
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thing"),
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
            },
          },
          {
            opcode: "deleteItem",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("delete [INDEX] of [ARRAY]"),
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                menu: "arrayIndexAll",
                defaultValue: 1,
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
            },
          },
          "---",
          {
            opcode: "insertItem",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("insert [ITEM] at [INDEX] of [ARRAY]"),
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thing"),
              },
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                menu: "arrayIndexRandom",
                defaultValue: 1,
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
            },
          },
          {
            opcode: "replaceItem",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("replace item [INDEX] of [ARRAY] with [ITEM]"),
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                menu: "arrayIndexRandom",
                defaultValue: 1,
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thing"),
              },
            },
          },
          "---",
          {
            opcode: "itemAtIndex",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("item [INDEX] of [ARRAY]"),
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                menu: "arrayIndexRandom",
                defaultValue: 1,
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
            },
          },
          {
            opcode: "itemsFromTo",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("items [START] to [END] of [ARRAY]"),
            arguments: {
              START: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1,
              },
              END: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 3,
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
            },
          },
          {
            opcode: "itemNumber",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("item # of [ITEM] in [ARRAY]"),
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thing"),
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
            },
          },
          {
            opcode: "length",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("length of [ARRAY]"),
            arguments: {
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
            },
          },
          {
            opcode: "contains",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("[ARRAY] contains [ITEM]?"),
            arguments: {
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thing"),
              },
            },
          },
          {
            opcode: "isValidArray",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("is [ARRAY] valid?"),
            arguments: {
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
            },
          },
          {
            opcode: "repeatArray",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("repeat [ARRAY] [TIMES] times"),
            arguments: {
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
              TIMES: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 2,
              },
            },
          },
          "---",
          {
            opcode: "map",
            blockType: Scratch.BlockType.ARRAY,
            output: "Array",
            text: translate("for each [ITEM] [INDEX] in [ARRAY]"),
            branchCount: 1,
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
        ],
        menus: {
          arrayIndexRandom: {
            acceptReporters: true,
            acceptNumber: true,
            items: [
              "1",
              {
                text: translate("last"),
                value: "_last_",
              },
              {
                text: translate("random"),
                value: "_random_",
              }
            ]
          },
          arrayIndexAll: {
            acceptReporters: true,
            acceptNumber: true,
            items: [
              "1",
              {
                text: translate("last"),
                value: "_last_",
              },
              {
                text: translate("all"),
                value: "_all_",
              }
            ]
          }
        }
      };
    }

    newArray(args) {
      return Scratch.getOrderedExtendableValues(args, ["TEXT"], "");
    }

    stringToArray(args) {
      const array = this.complexClone(this._toSafeArray(args.STRING));
      return array;
    }

    concat(args) {
      const arrays = Scratch.getOrderedExtendableValues(args, ["ARRAY"], [])
        .map(value => this.complexClone(this._toSafeArray(value)) ?? []);

      return arrays.reduce((result, current) => result.concat(current), []);
    }

    addItem(args) {
      const array = this.complexClone(this._toSafeArray(args.ARRAY)) ?? [];
      const item = args.ITEM ?? "";

      array.push(item);
      return array;
    }

    deleteItem(args) {
      const array = this.complexClone(this._toSafeArray(args.ARRAY)) ?? [];
      const index = this._getIndex(args.INDEX, array.length);

      if (index === "_all_") return [];

      array.splice(index, 1);
      return array;
    }

    insertItem(args) {
      const array = this.complexClone(this._toSafeArray(args.ARRAY)) ?? [];
      const item = args.ITEM ?? "";
      const index = this._getIndex(args.INDEX, array.length);

      array.splice(index, 0, item);
      return array;
    }

    replaceItem(args) {
      const array = this.complexClone(this._toSafeArray(args.ARRAY)) ?? [];
      const item = args.ITEM ?? "";
      const index = this._getIndex(args.INDEX, array.length);

      if (typeof array[index] !== "undefined") array[index] = item;
      return array;
    }

    itemAtIndex(args) {
      const array = this._toSafeArray(args.ARRAY);
      const index = this._getIndex(args.INDEX, array.length);

      return array[index] ?? "";
    }

    itemsFromTo(args) {
      const array = this.complexClone(this._toSafeArray(args.ARRAY)) ?? [];

      let start = Math.floor(Cast.toNumber(args.START));
      let end = Math.floor(Cast.toNumber(args.END));

      if (!Number.isFinite(start)) start = 1;
      if (!Number.isFinite(end)) end = array.length;

      const startIndex = Math.max(1, start) - 1;
      const endIndex = Math.max(1, end) - 1;

      if (endIndex < startIndex) {
        return [];
      }

      return array.slice(startIndex, endIndex + 1);
    }

    itemNumber(args) {
      const array = this.complexClone(this._toSafeArray(args.ARRAY)) ?? [];
      const item = args.ITEM ?? "";

      return array.indexOf(item);
    }

    length(args) {
      const array = this.complexClone(this._toSafeArray(args.ARRAY)) ?? [];

      return array.length;
    }

    contains(args) {
      const array = this.complexClone(this._toSafeArray(args.ARRAY)) ?? [];
      const item = args.ITEM ?? "";

      return array.includes(item);
    }

    isValidArray(args) {
      return Array.isArray(args.ARRAY);
    }

    repeatArray(args) {
      const source = this.complexClone(this._toSafeArray(args.ARRAY)) ?? [];
      const times = Math.max(0, Math.floor(Cast.toNumber(args.TIMES)));
      const result = [];

      for (let i = 0; i < times; i++) {
        result.push(...source);
      }

      return result;
    }

    map(args, util) {
      const itemTarget = this._resolveParameterTarget(util, "ITEM", args.ITEM);
      const indexTarget = this._resolveParameterTarget(util, "INDEX", args.INDEX);

      if (typeof util.stackFrame.index === "undefined") {
        util.stackFrame.index = 0;
        util.stackFrame.source = this._toSafeArray(args.ARRAY);
        util.stackFrame.results = [];
        util.thread.peekStackFrame().weakScriptTop = true;
      }

      if (typeof util.stackFrame.pendingItemIndex !== "undefined") {
        const reported = this._consumeBranchReturn(util);
        util.stackFrame.results[util.stackFrame.pendingItemIndex] = reported;
        delete util.stackFrame.pendingItemIndex;
      }

      if (util.stackFrame.index < util.stackFrame.source.length) {
        const item = util.stackFrame.source[util.stackFrame.index];
        util.stackFrame.pendingItemIndex = util.stackFrame.index;
        util.stackFrame.index++;

        util.thread.initParams();
        this._assignResolvedParameterValue(itemTarget, item, util);
        this._assignResolvedParameterValue(indexTarget, util.stackFrame.pendingItemIndex + 1, util);
        util.startBranch(1, true);
      } else {
        return util.stackFrame.results;
      }
    }

    _consumeBranchReturn(util) {
      const fromReturnBlock = util.stackFrame.returnValue;
      if (typeof fromReturnBlock !== "undefined") {
        delete util.stackFrame.returnValue;
        return fromReturnBlock;
      }

      const reported = util.thread.justReported;
      if (reported === null || typeof reported === "undefined") {
        return "";
      }
      return reported;
    }

    _resolveParameterTarget(util, inputName, fallback = "") {
      return IterationExtension.resolveReporter(util, inputName, fallback);
    }

    _assignResolvedParameterValue(target, value, util) {
      IterationExtension.assignResolvedParameterValue(target, value, util);
    }

    _getIndex(arg, length) {
      if (arg === "_last_") return length - 1;
      if (arg === "_random_") return Math.floor(Math.random() * length);
      if (arg === "_all_") return "_all_";
      return arg - 1;
    }

    stringify(args) {
      try {
        return JSON.stringify(args.JSON)
      } catch (error) {
        return "[]";
      }
    }

    parse(args) {
      try {
        return JSON.parse(args.STRING)
      } catch (error) {
        return [];
      }
    }
  }

  Scratch.extensions.register(new UnsandboxedArraysBlocks());
})(Scratch);
