// UNFINISHED

(function (Scratch) {
  "use strict";

  class JSONtest {
    constructor() {
    }

    getInfo() {
      return {
        id: "arrays",
        name: "Arrays",
        color1: "#737fff",
        blocks: [
          {
            opcode: "newArray",
            blockType: Scratch.BlockType.ARRAY,
            text: "new array",
          },
          {
            opcode: "stringToArray",
            blockType: Scratch.BlockType.ARRAY,
            text: "[STRING] to array",
            arguments: {
              STRING: {
                type: Scratch.ArgumentType.STRING,
                text: "['thing']",
              }
            }
          },
          {
            opcode: "concat",
            blockType: Scratch.BlockType.ARRAY,
            text: "join [ARRAY1] [ARRAY2]",
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
            text: "add [ITEM] to [ARRAY]",
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "thing",
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
            },
          },
          {
            opcode: "deleteItem",
            blockType: Scratch.BlockType.ARRAY,
            text: "delete [INDEX] of [ARRAY]",
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
            text: "insert [ITEM] at [INDEX] of [ARRAY]",
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "thing",
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
            text: "replace item [INDEX] of [ARRAY] with [ITEM]",
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
                defaultValue: "thing",
              },
            },
          },
          "---",
          {
            opcode: "itemAtIndex",
            blockType: Scratch.BlockType.REPORTER,
            text: "item [INDEX] of [ARRAY]",
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
            text: "item # of [ITEM] in [ARRAY]",
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "thing",
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
            },
          },
          {
            opcode: "length",
            blockType: Scratch.BlockType.REPORTER,
            text: "length of [ARRAY]",
            arguments: {
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
            },
          },
          {
            opcode: "contains",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[ARRAY] contains [ITEM]?",
            arguments: {
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              },
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "thing",
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
                text: "last",
                value: "_last_",
              },
              {
                text: "random",
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
                text: "last",
                value: "_last_",
              },
              {
                text: "all",
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
      const array = Scratch.Cast.toArray(args.STRING);
      console.log(array, args.STRING);
      return array;
    }

    concat(args) {
      const array1 = args.ARRAY1 ?? [];
      const array2 = args.ARRAY2 ?? [];

      return array1.concat(array2);
    }

    stringify(args) {
      try {
        return JSON.stringify(args.JSON)
      } catch (error) {
        return "{}";
      }
    }

    parse(args) {
      try {
        return JSON.parse(args.STRING)
      } catch (error) {
        return {};
      }
    }
  }

  Scratch.extensions.register(new JSONtest());
})(Scratch);
