(function (Scratch) {
  "use strict";

  const cast = Scratch.UnsandboxedMod.Cast;

  /**
   * Unsandboxed blocks for temporary data stored on the executing thread.
   * @constructor
   */
  class UnsandboxedTemporaryDataBlocks {
    constructor() {
      /**
       * The extension identifier of this block package.
       */
      this.extId = "usbTemporaryData";

      /**
       * The Scratch Virtual Machine instance.
       */
      this.vm = Scratch.vm;

      /**
       * The runtime instantiating this block package.
       */
      this.runtime = this.vm.runtime;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: this.extId,
        name: Scratch.translate("Temporary Data"),
        color1: "#bc4749",
        blocks: [
          {
            opcode: "activeVariables",
            blockType: Scratch.BlockType.ARRAY,
            text: Scratch.translate("active variables"),
          },
          "---",
          {
            opcode: "set",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("set [VAR] to [VALUE]"),
            arguments: {
              VAR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("variable"),
                menu: "variables",
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
              }
            }
          },
          {
            opcode: "change",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("change [VAR] by [VALUE]"),
            arguments: {
              VAR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("variable"),
                menu: "variables",
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER,
              }
            }
          },
          {
            opcode: "get",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("value of [VAR]"),
            arguments: {
              VAR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("variable"),
                menu: "variables",
              }
            }
          },
          "---",
          {
            opcode: "forKeyValue",
            blockType: Scratch.BlockType.LOOP,
            text: Scratch.translate("for [KEY] [VALUE] in [OBJECT]"),
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("key"),
                menu: "variables",
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("value"),
                menu: "variables",
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              },
            }
          },
          {
            opcode: "forItem",
            blockType: Scratch.BlockType.LOOP,
            text: Scratch.translate("for [ITEM] [INDEX] in [ARRAY]"),
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("item"),
                menu: "variables",
              },
              INDEX: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("index"),
                menu: "variables",
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY,
              },
            }
          },
        ],
        menus: {
          variables: {
            items: "_getAccessibleVariables",
            acceptReporters: true,
            acceptText: true,
          }
        }
      };
    }

    _initVariables(thread) {
      if (!thread.variables) {
        thread.variables = Object.create(null);
      };

      return thread.variables;
    }

    set(args, util) {
      const variables = this._initVariables(util.thread);
      const name = cast.toString(args.VAR);
      variables[name] = args.VALUE;
    }

    change(args, util) {
      const variables = this._initVariables(util.thread);
      const name = cast.toString(args.VAR);

      const castedValue = cast.toNumber(variables[name]);
      const dValue = cast.toNumber(args.VALUE);
      const newValue = castedValue + dValue;
      variables[name] = newValue;
    }

    get(args, util) {
      const variables = this._initVariables(util.thread);
      const name = cast.toString(args.VAR);
      return variables[name] ?? "";
    }

    _getAccessibleVariables(targetId, menuState) {
      const target = this.runtime.getTargetById(targetId);
      if (!target) return [""];

      const sourceBlock = menuState.sourceBlock;
      if (!sourceBlock) return [""];

      const container = target.blocks;
      const script = container.getTopLevelScript(sourceBlock.id);

      const values = Object.values(container._blocks)
        .filter(block => block.opcode === `${this.extId}_menu_variables`)
        .filter(block => container.getTopLevelScript(block.id) === script)
        .map(block => block.fields.variables.value)
        .sort(this._compareStrings);

      if (values.length == 0) return [""];
      return [...new Set(values)];
    }
      
    // an abridged version of Scratch's native comparison script
    // TODO: is there somewhere in the vm we can point to for this instead?
    _compareStrings(str1, str2) {
      return str1.localeCompare(str2, [], {
        sensitivity: "base",
        numeric: true,
      });
    }
  }

  Scratch.extensions.register(new UnsandboxedTemporaryDataBlocks());
})(Scratch);