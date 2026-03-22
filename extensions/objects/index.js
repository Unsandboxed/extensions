(function (Scratch) {
  "use strict";

  const cast = Scratch.UnsandboxedMod.Cast;

  /**
   * Unsandboxed blocks for working with JSON Objects.
   * @constructor
   */
  class UnsandboxedObjectsBlocks {
    /**
     * The extension identifier of this block package.
     */
    static extensionId = "objects";

    /**
     * Deep-clone an object and preserve its contents.
     * Functions, classes, and all types will be preserved.
     * We cannot use standard clone because it'll break our
     * custom types implementation.
     * @param {object} value The object to clone
     * @returns {object} The cloned object
     */
    complexClone (value) {
      return {...value}
    };

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedObjectsBlocks.extensionId,
        name: Scratch.translate("Objects"),
        color1: "#e765a8",
        blocks: [
          {
            opcode: "newObject",
            blockType: Scratch.BlockType.OBJECT,
            text: Scratch.translate("new object"),
          },
          {
            opcode: "stringToObject",
            blockType: Scratch.BlockType.OBJECT,
            text: Scratch.translate("[STRING] to object"),
            arguments: {
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: `{"${Scratch.translate("fruit")}": "${Scratch.translate("apple")}"}`,
              }
            }
          },
          {
            opcode: "concat",
            blockType: Scratch.BlockType.OBJECT,
            text: Scratch.translate("join [OBJECT1] [OBJECT2]"),
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
            text: Scratch.translate("[KEY] in [OBJECT]"),
            allowDropAnywhere: true,
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("fruit"),
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            }
          },
          {
            opcode: "getKeysValues",
            blockType: Scratch.BlockType.ARRAY,
            text: Scratch.translate("all [THING] in [OBJECT]"),
            arguments: {
              THING: {
                type: Scratch.ArgumentType.STRING,
                menu: "keyValue",
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
            text: Scratch.translate("set [KEY] to [VALUE] in [OBJECT]"),
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("fruit"),
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("apple"),
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            },
          },
          {
            opcode: "deleteKey",
            blockType: Scratch.BlockType.OBJECT,
            text: Scratch.translate("delete [KEY] in [OBJECT]"),
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("fruit"),
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
            text: Scratch.translate("set keys [KEYS] to [VALUE] in [OBJECT]"),
            arguments: {
              KEYS: {
                type: Scratch.ArgumentType.ARRAY,
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("apple"),
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            },
          },
          {
            opcode: "deleteKeys",
            blockType: Scratch.BlockType.OBJECT,
            text: Scratch.translate("delete keys [KEYS] in [OBJECT]"),
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
          // TODO: translate
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
                text: Scratch.translate("last"),
                value: "_last_",
              },
              {
                text: Scratch.translate("random"),
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
                text: Scratch.translate("last"),
                value: "_last_",
              },
              {
                text: Scratch.translate("all"),
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
      const object = this.complexClone(cast.toObject(args.STRING));
      return object;
    }

    concat(args) {
      const object1 = this.complexClone(cast.toObject(args.OBJECT1));
      const object2 = this.complexClone(cast.toObject(args.OBJECT2));

      return {...object1, ...object2};
    }

    getKey(args) {
      const object = this.complexClone(cast.toObject(args.OBJECT));
      const key = cast.sanitize(args.KEY);

      return object[key] ?? "";
    }

    getKeysValues(args) {
      const object = this.complexClone(cast.toObject(args.OBJECT));
      const thing = cast.toString(args.THING).toLowerCase();

      if (thing === "keys") {
        return Object.keys(object);
      } else {
        return Object.values(object);
      }
    }

    setKey(args) {
      const object = this.complexClone(cast.toObject(args.OBJECT));
      const key = cast.sanitize(args.KEY);
      const value = args.VALUE;

      object[key] = value;
      return object;
    }

    deleteKey(args) {
      const object = this.complexClone(cast.toObject(args.OBJECT));
      const key = cast.sanitize(args.KEY);

      delete object[key];
      return object;
    }

    setKeys(args) {
      const object = this.complexClone(cast.toObject(args.OBJECT));
      const keys = this.complexClone(cast.toArray(args.KEYS));
      const value = args.VALUE;

      for (const key of keys) {
        object[key] = value;
      }

      return object;
    }

    deleteKeys(args) {
      const object = this.complexClone(cast.toObject(args.OBJECT));
      const keys = this.complexClone(cast.toArray(args.KEYS));

      for (const key of keys) {
        delete object[key];
      }

      return object;
    }
  }

  Scratch.extensions.register(new UnsandboxedObjectsBlocks());
})(Scratch);
