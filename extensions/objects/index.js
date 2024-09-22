(function (Scratch) {
  "use strict";

  const cast = Scratch.Util.Cast;
  const clone = Scratch.Util.Clone.structured;

  class UnsandboxedObjectsBlocks {
    constructor() {
    }

    getInfo() {
      return {
        id: "objects",
        name: "Objects",
        color1: "#e765a8",
        blocks: [
          {
            opcode: "newObject",
            blockType: Scratch.BlockType.OBJECT,
            text: "new object",
          },
          {
            opcode: "stringToObject",
            blockType: Scratch.BlockType.OBJECT,
            text: "[STRING] to object",
            arguments: {
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: `{"fruit": "apple"}`,
              }
            }
          },
          {
            opcode: "concat",
            blockType: Scratch.BlockType.OBJECT,
            text: "join [OBJECT1] [OBJECT2]",
            arguments: {
              OBJECT1: {
                type: Scratch.ArgumentType.OBJECT
              },
              OBJECT2: {
                type: Scratch.ArgumentType.OBJECT
              },
            },
          },
          "---",
          {
            opcode: "getKey",
            blockType: Scratch.BlockType.REPORTER,
            text: "[KEY] in [OBJECT]",
            allowDropAnywhere: true,
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "fruit"
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            }
          },
          {
            opcode: "getKeysValues",
            blockType: Scratch.BlockType.ARRAY,
            text: "all [THING] in [OBJECT]",
            arguments: {
              THING: {
                type: Scratch.ArgumentType.STRING,
                menu: "keyValue"
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            },
          },
          "---",
          {
            opcode: "setKey",
            blockType: Scratch.BlockType.OBJECT,
            text: "set [KEY] to [VALUE] in [OBJECT]",
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "fruit",
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "apple",
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            },
          },
          {
            opcode: "deleteKey",
            blockType: Scratch.BlockType.OBJECT,
            text: "delete [KEY] in [OBJECT]",
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "fruit",
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            },
          },
          "---",
          {
            opcode: "setKeys",
            blockType: Scratch.BlockType.OBJECT,
            text: "set keys [KEYS] to [VALUE] in [OBJECT]",
            arguments: {
              KEYS: {
                type: Scratch.ArgumentType.ARRAY,
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "apple",
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            },
          },
          {
            opcode: "deleteKeys",
            blockType: Scratch.BlockType.OBJECT,
            text: "delete keys [KEYS] in [OBJECT]",
            arguments: {
              KEYS: {
                type: Scratch.ArgumentType.ARRAY,
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            },
          },
        ],
        menus: {
          keyValue: {
            acceptReporters: true,
            items: [
              "keys",
              "values",
            ]
          },
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

    newObject() {
      return new Object;
    }

    stringToObject(args) {
      const object = clone(cast.toObject(args.STRING));
      return object;
    }

    concat(args) {
      const object1 = clone(cast.toObject(args.OBJECT1));
      const object2 = clone(cast.toObject(args.OBJECT2));

      return {...object1, ...object2};
    }

    getKey(args) {
      const object = clone(cast.toObject(args.OBJECT));
      const key = cast.sanitize(args.KEY);

      return object[key] ?? "";
    }

    getKeysValues(args) {
      const object = clone(cast.toObject(args.OBJECT));
      const thing = cast.toString(args.THING).toLowerCase();

      if (thing === "keys") {
        return Object.keys(object);
      } else {
        return Object.values(object);
      }
    }

    setKey(args) {
      const object = clone(cast.toObject(args.OBJECT));
      const key = cast.sanitize(args.KEY);
      const value = args.VALUE;

      object[key] = value;
      return object;
    }

    deleteKey(args) {
      const object = clone(cast.toObject(args.OBJECT));
      const key = cast.sanitize(args.KEY);

      delete object[key];
      return object;
    }

    setKeys(args) {
      const object = clone(cast.toObject(args.OBJECT));
      const keys = clone(cast.toArray(args.KEYS));
      const value = args.VALUE;

      for (const key of keys) {
        object[key] = value;
      }

      return object;
    }

    deleteKeys(args) {
      const object = clone(cast.toObject(args.OBJECT));
      const keys = clone(cast.toArray(args.KEYS));

      for (const key of keys) {
        delete object[key];
      }

      return object;
    }
  }

  Scratch.extensions.register(new UnsandboxedObjectsBlocks());
})(Scratch);
