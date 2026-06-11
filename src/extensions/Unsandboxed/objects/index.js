(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;
  const IterationExtension = require("../iteration");

  /**
   * Unsandboxed blocks for working with JSON Objects.
   * @constructor
   */
  class UnsandboxedObjectsBlocks {
    /**
     * The extension identifier of this block package.
     * @type {string}
     */
    static extensionId = "usbObjects";

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
          renamer.register(`${UnsandboxedObjectsBlocks.extensionId}_mapValues`, ["KEY", "VALUE"], {
            KEY: translate("key"),
            VALUE: translate("value")
          });
        }
      }
    }

    /**
     * Deep-clone an object and preserve its contents.
     * Functions, classes, and all types will be preserved.
     * We cannot use standard clone because it'll break our
     * custom types implementation.
     * @param {object} value The object to clone
     * @returns {object} The cloned object
     */
    complexClone(value) {
      return { ...value }
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
        id: UnsandboxedObjectsBlocks.extensionId,
        name: translate("Objects"),
        color1: "#e765a8",
        provides: {
          usbIteration: [
            "mapValues"
          ],
        },
        blocks: [
          {
            opcode: "newObject",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("new object"),
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("fruit"),
                label: translate("key")
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("apple"),
                label: translate("value")
              }
            },
            extendable: {
              proceeds: [
                {
                  argument: "KEY",
                  includeValue: true
                },
                {
                  argument: "VALUE",
                  includeValue: true
                }
              ],
              minProceedGroups: 0
            }
          },
          {
            opcode: "stringToObject",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("[STRING] to object"),
            arguments: {
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: `{"${translate("fruit")}": "${translate("apple")}"}`,
              }
            }
          },
          {
            opcode: "concat",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("join"),
            arguments: {
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            },
            extendable: {
              starts: ["OBJECT"],
              proceeds: ["OBJECT"],
              minProceedGroups: 0,
              initialExtendCount: 1
            }
          },
          "---",
          {
            opcode: "getKey",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("[KEY] in [OBJECT]"),
            allowDropAnywhere: true,
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("fruit"),
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          },
          {
            opcode: "getPath",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("path [PATH] in [OBJECT]"),
            allowDropAnywhere: true,
            arguments: {
              PATH: {
                type: Scratch.ArgumentType.ARRAY,
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          },
          {
            opcode: "getKeysValues",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("all [THING] in [OBJECT]"),
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
            text: translate("set [KEY] to [VALUE] in [OBJECT]"),
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("fruit"),
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("apple"),
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            },
          },
          {
            opcode: "setPath",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("set path [PATH] to [VALUE] in [OBJECT]"),
            arguments: {
              PATH: {
                type: Scratch.ArgumentType.ARRAY,
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("apple"),
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            },
          },
          {
            opcode: "deleteKey",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("delete [KEY] in [OBJECT]"),
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("fruit"),
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            },
          },
          {
            opcode: "deletePath",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("delete path [PATH] in [OBJECT]"),
            arguments: {
              PATH: {
                type: Scratch.ArgumentType.ARRAY,
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
            text: translate("set keys [KEYS] to [VALUE] in [OBJECT]"),
            arguments: {
              KEYS: {
                type: Scratch.ArgumentType.ARRAY,
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("apple"),
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            },
          },
          {
            opcode: "deleteKeys",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("delete keys [KEYS] in [OBJECT]"),
            arguments: {
              KEYS: {
                type: Scratch.ArgumentType.ARRAY,
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            },
          },
          "---",
          {
            opcode: "mapValues",
            blockType: Scratch.BlockType.OBJECT,
            output: "Object",
            text: translate("for each [KEY] [VALUE] in [OBJECT]"),
            branchCount: 1,
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
                type: Scratch.ArgumentType.OBJECT,
              }
            }
          },
          {
            opcode: "isValidObject",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("is [OBJECT] valid?"),
            arguments: {
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT,
              }
            }
          },
          {
            opcode: "canParseObject",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("is [OBJECT] parsable?"),
            arguments: {
              OBJECT: {
                type: Scratch.ArgumentType.STRING,
              }
            }
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

    newObject(args) {
      const entries = Scratch.getOrderedExtendableValues(args, ["TEXT"], "");
      const object = {};

      for (let i = 0; i < entries.length; i += 2) {
        const key = Scratch.Cast.toString(entries[i]);
        const value = entries[i + 1];
        if (!key) continue;
        object[key] = value;
      }

      return object;
    }

    stringToObject(args) {
      const object = this.complexClone(Cast.toObject(args.STRING));
      return object;
    }

    concat(args) {
      const objects = Scratch.getOrderedExtendableValues(args, ["OBJECT"], {})
        .map(value => this.complexClone(Cast.toObject(value)));

      return objects.reduce((result, current) => ({ ...result, ...current }), {});
    }

    getKey(args) {
      const object = this.complexClone(Cast.toObject(args.OBJECT));
      const key = Cast.sanitize(args.KEY);

      return object[key] ?? "";
    }

    getPath(args) {
      const object = this.complexClone(Cast.toObject(args.OBJECT));
      const path = this._toSafeArray(args.PATH);

      let current = object;
      for (const rawSegment of path) {
        if (current === null || typeof current !== "object") {
          return "";
        }

        const segment = this._normalizePathSegment(rawSegment, current);
        if (!(segment in current)) {
          return "";
        }

        current = current[segment];
      }

      return typeof current === "undefined" ? "" : current;
    }

    getKeysValues(args) {
      const object = this.complexClone(Cast.toObject(args.OBJECT));
      const thing = Cast.toString(args.THING).toLowerCase();

      if (thing === "keys") {
        return Object.keys(object);
      } else {
        return Object.values(object);
      }
    }

    setKey(args) {
      const object = this.complexClone(Cast.toObject(args.OBJECT));
      const key = Cast.sanitize(args.KEY);
      const value = args.VALUE;

      object[key] = value;
      return object;
    }

    setPath(args) {
      const object = this.complexClone(Cast.toObject(args.OBJECT));
      const path = this._toSafeArray(args.PATH);
      const value = args.VALUE;

      if (path.length === 0) {
        return object;
      }

      let current = object;
      for (let i = 0; i < path.length - 1; i++) {
        const segment = this._normalizePathSegment(path[i], current);
        const nextSegment = path[i + 1];
        const existing = current[segment];

        if (existing === null || typeof existing !== "object") {
          const shouldCreateArray = this._isArrayPathSegment(nextSegment);
          current[segment] = shouldCreateArray ? [] : {};
        }

        current = current[segment];
      }

      const lastSegment = this._normalizePathSegment(path[path.length - 1], current);
      current[lastSegment] = value;
      return object;
    }

    deleteKey(args) {
      const object = this.complexClone(Cast.toObject(args.OBJECT));
      const key = Cast.sanitize(args.KEY);

      delete object[key];
      return object;
    }

    deletePath(args) {
      const object = this.complexClone(Cast.toObject(args.OBJECT));
      const path = this._toSafeArray(args.PATH);

      if (path.length === 0) {
        return object;
      }

      let current = object;
      for (let i = 0; i < path.length - 1; i++) {
        if (current === null || typeof current !== "object") {
          return object;
        }

        const segment = this._normalizePathSegment(path[i], current);
        if (!(segment in current)) {
          return object;
        }

        current = current[segment];
      }

      if (current === null || typeof current !== "object") {
        return object;
      }

      const lastSegment = this._normalizePathSegment(path[path.length - 1], current);
      if (Array.isArray(current) && Number.isInteger(lastSegment) && lastSegment >= 0) {
        current.splice(lastSegment, 1);
      } else {
        delete current[lastSegment];
      }

      return object;
    }

    setKeys(args) {
      const object = this.complexClone(Cast.toObject(args.OBJECT));
      const keys = this._toSafeArray(args.KEYS);
      const value = args.VALUE;

      for (const key of keys) {
        object[key] = value;
      }

      return object;
    }

    deleteKeys(args) {
      const object = this.complexClone(Cast.toObject(args.OBJECT));
      const keys = this._toSafeArray(args.KEYS);

      for (const key of keys) {
        delete object[key];
      }

      return object;
    }

    mapValues(args, util) {
      const keyTarget = this._resolveParameterTarget(util, "KEY", args.KEY);
      const valueTarget = this._resolveParameterTarget(util, "VALUE", args.VALUE);

      if (typeof util.stackFrame.index === "undefined") {
        const source = Cast.toObject(args.OBJECT);
        util.stackFrame.index = 0;
        util.stackFrame.source = source;
        util.stackFrame.keys = Object.keys(source);
        util.stackFrame.result = {};
        util.thread.peekStackFrame().weakScriptTop = true;
      }

      if (typeof util.stackFrame.pendingKey !== "undefined") {
        const reported = this._consumeBranchReturn(util);
        util.stackFrame.result[util.stackFrame.pendingKey] = reported;
        delete util.stackFrame.pendingKey;
      }

      if (util.stackFrame.index < util.stackFrame.keys.length) {
        const key = util.stackFrame.keys[util.stackFrame.index];
        const value = util.stackFrame.source[key];
        util.stackFrame.pendingKey = key;
        util.stackFrame.index++;

        util.thread.initParams();
        this._assignResolvedParameterValue(keyTarget, key, util);
        this._assignResolvedParameterValue(valueTarget, value, util);
        util.startBranch(1, true);
      } else {
        return util.stackFrame.result;
      }
    }

    isValidObject(args) {
      const value = args.OBJECT;
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    canParseObject(value) {
      if (typeof value === "object" && !Array.isArray(value)) return true;
      if (typeof value !== "string") return false;
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === "object" && !Array.isArray(parsed);
      } catch {
        return false;
      }
    }

    _normalizePathSegment(segment, container) {
      if (Array.isArray(container) && this._isArrayPathSegment(segment)) {
        return Math.max(0, Math.floor(Cast.toNumber(segment)));
      }
      return Cast.sanitize(segment);
    }

    _isArrayPathSegment(segment) {
      if (typeof segment === "number") {
        return Number.isFinite(segment);
      }
      if (typeof segment !== "string") {
        return false;
      }
      const trimmed = segment.trim();
      return /^-?\d+$/.test(trimmed);
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
  }

  Scratch.extensions.register(new UnsandboxedObjectsBlocks());
})(Scratch);
