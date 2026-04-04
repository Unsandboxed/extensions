(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  /**
   * Unsandboxed blocks for working with JSON Arrays.
   * @constructor
   */
  class UnsandboxedArraysBlocks {
    /**
     * The extension identifier of this block package.
     * @type {string}
     */
    static extensionId = "arrays";

    /**
     * Deep-clone an array and preserve its contents.
     * Functions, classes, and all types will be preserved.
     * We cannot use standard clone because it'll break our
     * custom types implementation.
     * @param {object} value The array to clone
     * @returns {object} The cloned array
     */
    complexClone(value) {
      return [...value]
    };

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedArraysBlocks.extensionId,
        name: translate("Arrays"),
        color1: "#737fff",
        blocks: [
          {
            opcode: "newArray",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("new array"),
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
            text: translate("join [ARRAY1] [ARRAY2]"),
            arguments: {
              ARRAY1: {
                type: Scratch.ArgumentType.ARRAY
              },
              ARRAY2: {
                type: Scratch.ArgumentType.ARRAY
              },
            },
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

    newArray() {
      return new Array;
    }

    stringToArray(args) {
      const array = this.complexClone(Cast.toArray(args.STRING));
      return array;
    }

    concat(args) {
      const array1 = this.complexClone(Cast.toArray(args.ARRAY1)) ?? [];
      const array2 = this.complexClone(Cast.toArray(args.ARRAY2)) ?? [];

      return array1.concat(array2);
    }

    addItem(args) {
      const array = this.complexClone(Cast.toArray(args.ARRAY)) ?? [];
      const item = args.ITEM ?? "";

      array.push(item);
      return array;
    }

    deleteItem(args) {
      const array = this.complexClone(Cast.toArray(args.ARRAY)) ?? [];
      const index = this._getIndex(args.INDEX, array.length);

      if (index === "_all_") return [];

      array.splice(index, 1);
      return array;
    }

    insertItem(args) {
      const array = this.complexClone(Cast.toArray(args.ARRAY)) ?? [];
      const item = args.ITEM ?? "";
      const index = this._getIndex(args.INDEX, array.length);

      array.splice(index, 0, item);
      return array;
    }

    replaceItem(args) {
      const array = this.complexClone(Cast.toArray(args.ARRAY)) ?? [];
      const item = args.ITEM ?? "";
      const index = this._getIndex(args.INDEX, array.length);

      if (typeof array[index] !== "undefined") array[index] = item;
      return array;
    }

    itemAtIndex(args) {
      const array = Cast.toArray(args.ARRAY) ?? [];
      const index = this._getIndex(args.INDEX, array.length);

      return array[index] ?? "";
    }

    itemNumber(args) {
      const array = this.complexClone(Cast.toArray(args.ARRAY)) ?? [];
      const item = args.ITEM ?? "";

      return array.indexOf(item);
    }

    length(args) {
      const array = this.complexClone(Cast.toArray(args.ARRAY)) ?? [];

      return array.length;
    }

    contains(args) {
      const array = this.complexClone(Cast.toArray(args.ARRAY)) ?? [];
      const item = args.ITEM ?? "";

      return array.includes(item);
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