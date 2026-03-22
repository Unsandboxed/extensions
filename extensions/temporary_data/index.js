(function (Scratch) {
  "use strict";

  const cast = Scratch.UnsandboxedMod.Cast;
  const stringUtil = Scratch.UnsandboxedMod.Strings;

  /**
   * Unsandboxed blocks for temporary data stored on the executing thread.
   * @constructor
   */
  class UnsandboxedTemporaryDataBlocks {
    /**
     * The extension identifier of this block package.
     */
    static extensionId = "usbTemporaryData";

    constructor() {
      /**
       * The Scratch Virtual Machine instance.
       */
      this.vm = Scratch.vm;

      /**
       * The runtime instantiating this block package.
       */
      this.runtime = this.vm.runtime;
    };

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedTemporaryDataBlocks.extensionId,
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
            opcode: "get",
            color1: "#bc4749",
            color2: "#bc4749",
            color4: "#bc4749",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("[VAR]"),
            arguments: {
              VAR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("variable"),
                menu: "variableGetter",
              },
            },
          },
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
              },
            },
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
                defaultValue: 1,
              },
            },
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
            },
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
            },
          },
          "---",
          {
            opcode: "newScope",
            blockType: Scratch.BlockType.CONDITIONAL,
            text: Scratch.translate("new scope"),
            hideFromPalette: true,
          },
        ],
        menus: {
          variables: {
            items: "_getAccessibleVariables",
            acceptReporters: true,
            acceptText: true,
          },
          variableGetter: {
            items: "_getAccessibleVariables",
            acceptReporters: true,
          }
        }
      };
    };

    /**
     * Initialise variables for this thread.
     * @param {?Thread} thread The thread to initialise variables on.
     * @returns The variable object.
     */
    _initVariables(thread) {
      if (!thread.variables) {
        thread.variables = Object.create(null);
      };

      return thread.variables;
    };

    activeVariables(args, util) {
      const variables = this._initVariables(util.thread);
      return Object.keys(variables);
    };

    set(args, util) {
      const variables = this._initVariables(util.thread);
      const name = cast.toString(args.VAR);
      variables[name] = args.VALUE;
    };

    change(args, util) {
      const variables = this._initVariables(util.thread);
      const name = cast.toString(args.VAR);

      const castedValue = cast.toNumber(variables[name]);
      const dValue = cast.toNumber(args.VALUE);
      const newValue = castedValue + dValue;
      variables[name] = newValue;
    };

    get(args, util) {
      const variables = this._initVariables(util.thread);
      const name = cast.toString(args.VAR);

      return variables[name] ?? "";
    };

    forKeyValue(args, util) {
      const variables = this._initVariables(util.thread);
      const keyName = cast.toString(args.KEY);
      const valueName = cast.toString(args.VALUE);

      if (typeof util.stackFrame.index === "undefined") {
        util.stackFrame.index = 0;
      }

      const keys = Object.keys(cast.toObject(args.OBJECT));
      const values = Object.values(cast.toObject(args.OBJECT));

      if (util.stackFrame.index < keys.length) {
        variables[keyName] = keys[util.stackFrame.index];
        variables[valueName] = values[util.stackFrame.index];
        util.stackFrame.index++;
        return true;
      }
    };

    forItem(args, util) {
      const variables = this._initVariables(util.thread);
      const itemName = cast.toString(args.ITEM);
      const indexName = cast.toString(args.INDEX);

      if (typeof util.stackFrame.index === "undefined") {
        util.stackFrame.index = 0;
      }

      const array = cast.toArray(args.ARRAY);

      if (util.stackFrame.index < array.length) {
        variables[itemName] = array[util.stackFrame.index];
        variables[indexName] = util.stackFrame.index + 1;
        util.stackFrame.index++;
        return true;
      }
    };

    /**
     * Menu constructor for all accessible thread variables.
     * @param {string} targetId The editing target this menu was initialised from.
     * @param {?object} menuState An object containing useful info about the menu.
     * @returns An array containing the known thread variables in this script.
     */
    _getAccessibleVariables(targetId, menuState) {
      const target = this.runtime.getTargetById(targetId);
      if (!target) return [""];

      const sourceBlock = menuState.sourceBlock;
      if (!sourceBlock) return [""];

      const container = target.blocks;
      const script = container.getTopLevelScript(sourceBlock.id);

      const fields = [
        `${this.extId}_menu_variables`,
        `${this.extId}_menu_variableGetter`
      ]

      const values = Object.values(container._blocks)
        .filter(block => fields.includes(block.opcode))
        .filter(block => container.getTopLevelScript(block.id) === script)
        .map(block => block.fields[block.opcode
          .replace(`${this.extId}_menu_`, '')].value)
        .sort(stringUtil.compareStrings);

      if (values.length == 0) return [""];
      return [...new Set(values)];
    };
  }

  Scratch.extensions.register(new UnsandboxedTemporaryDataBlocks());
})(Scratch);
