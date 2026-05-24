(function (Scratch) {
  "use strict";

  const Cast = Scratch.Cast || (Scratch.UnsandboxedMod && Scratch.UnsandboxedMod.Cast);
  const translate = Scratch.translate;
  const vm = Scratch.vm;
  const runtime = vm && vm.runtime;

  class CustomTypesDemo {
    static extensionId = "usbCustomTypesDemo";

    getInfo() {
      return {
        id: CustomTypesDemo.extensionId,
        name: translate("Custom Types Demo"),
        color1: "#a05ad6",
        color2: "#8a48bf",
        color3: "#6f3b9a",
        blocks: [
          {
            blockType: Scratch.BlockType.LABEL,
            text: translate("Type registration")
          },
          {
            opcode: "registeredTypeIds",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("registered custom type ids")
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: translate("Capture from util.target")
          },
          {
            opcode: "snapshotOfThisTarget",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("snapshot of this target")
          },
          {
            opcode: "snapshotOfEditingTarget",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("snapshot of editing target")
          },
          {
            opcode: "currentCostumeValue",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("current costume value")
          },
          {
            opcode: "firstSoundValue",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("first sound value")
          },
          {
            opcode: "variableValueById",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("variable value with id [ID]"),
            arguments: {
              ID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: ""
              }
            }
          },
          {
            opcode: "listValueById",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("list value with id [ID]"),
            arguments: {
              ID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: ""
              }
            }
          },
          {
            opcode: "spriteExists",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("target still exists for [S]"),
            arguments: {
              S: {
                type: Scratch.ArgumentType.OBJECT,
                defaultValue: {spriteId: "", snapshot: {name: "Sprite1", x: 0, y: 0}}
              }
            }
          },
          {
            opcode: "spriteName",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("name of [S]"),
            arguments: {
              S: {
                type: Scratch.ArgumentType.OBJECT,
                defaultValue: {spriteId: "", snapshot: {name: "Sprite1", x: 0, y: 0}}
              }
            }
          },
          {
            opcode: "spriteX",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("x of [S]"),
            arguments: {
              S: {
                type: Scratch.ArgumentType.OBJECT,
                defaultValue: {spriteId: "", snapshot: {name: "Sprite1", x: 0, y: 0}}
              }
            }
          },
          {
            opcode: "spriteY",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("y of [S]"),
            arguments: {
              S: {
                type: Scratch.ArgumentType.OBJECT,
                defaultValue: {spriteId: "", snapshot: {name: "Sprite1", x: 0, y: 0}}
              }
            }
          },
          {
            opcode: "spriteId",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("id of [S]"),
            arguments: {
              S: {
                type: Scratch.ArgumentType.OBJECT,
                defaultValue: {spriteId: "", snapshot: {name: "Sprite1", x: 0, y: 0}}
              }
            }
          },
          {
            opcode: "describeValue",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("describe [S]"),
            arguments: {
              S: {
                type: Scratch.ArgumentType.OBJECT,
                defaultValue: {spriteId: "", snapshot: {name: "Sprite1", x: 0, y: 0}}
              }
            }
          }
        ]
      };
    }

    registeredTypeIds() {
      if (runtime && typeof runtime.getCustomTypeIds === "function") {
        return JSON.stringify(runtime.getCustomTypeIds());
      }
      if (typeof Scratch.getCustomTypeIds === "function") {
        return JSON.stringify(Scratch.getCustomTypeIds());
      }
      return "[]";
    }

    snapshotOfThisTarget(args, util) {
      return util.target.toValue();
    }

    snapshotOfEditingTarget() {
      return runtime && typeof runtime.getEditingTarget === "function" ? runtime.getEditingTarget().toValue() : null;
    }

    currentCostumeValue(args, util) {
      if (!runtime || typeof runtime.createBuiltInCustomTypeValue !== "function") {
        return "";
      }
      return runtime.createBuiltInCustomTypeValue("costume", util?.target || null);
    }

    firstSoundValue(args, util) {
      if (!runtime || typeof runtime.createBuiltInCustomTypeValue !== "function") {
        return "";
      }
      return runtime.createBuiltInCustomTypeValue("sound", util?.target || null);
    }

    variableValueById(args) {
      if (!runtime || typeof runtime.createBuiltInCustomTypeValue !== "function") {
        return "";
      }
      return runtime.createBuiltInCustomTypeValue("variable", {
        variableId: Cast.toString(args.ID || "")
      });
    }

    listValueById(args) {
      if (!runtime || typeof runtime.createBuiltInCustomTypeValue !== "function") {
        return "";
      }
      return runtime.createBuiltInCustomTypeValue("list", {
        listId: Cast.toString(args.ID || "")
      });
    }

    _getSpriteValue(value) {
      if (!value || typeof value !== "object") {
        return {spriteId: "", snapshot: Object.create(null), deleted: true};
      }
      return value;
    }

    spriteExists(args) {
      const v = this._getSpriteValue(args.S);
      return Boolean(
        v.spriteId &&
        runtime &&
        typeof runtime.getTargetById === "function" &&
        runtime.getTargetById(v.spriteId)
      );
    }

    spriteName(args) {
      const v = this._getSpriteValue(args.S);
      const snapshot = v.snapshot || Object.create(null);
      const name = Cast.toString(snapshot.name || "");
      const exists = Boolean(v.spriteId && runtime && typeof runtime.getTargetById === "function" && runtime.getTargetById(v.spriteId));
      return exists ? name : (name ? `${name} (deleted)` : "(deleted target)");
    }

    spriteX(args) {
      const v = this._getSpriteValue(args.S);
      return Cast.toNumber((v.snapshot && v.snapshot.x) || 0);
    }

    spriteY(args) {
      const v = this._getSpriteValue(args.S);
      return Cast.toNumber((v.snapshot && v.snapshot.y) || 0);
    }

    spriteId(args) {
      return Cast.toString(this._getSpriteValue(args.S).spriteId || "");
    }

    describeValue(args) {
      const v = this._getSpriteValue(args.S);
      const snapshot = v.snapshot || Object.create(null);
      const name = Cast.toString(snapshot.name || "");
      const x = Cast.toNumber(snapshot.x || 0);
      const y = Cast.toNumber(snapshot.y || 0);
      const exists = Boolean(v.spriteId && runtime && typeof runtime.getTargetById === "function" && runtime.getTargetById(v.spriteId));
      return `exists:${exists ? "yes" : "no"} deleted:${v.deleted ? "yes" : "no"} id:${Cast.toString(v.spriteId || "")} name:${name} x:${x} y:${y}`;
    }
  }

  Scratch.extensions.register(new CustomTypesDemo());
})(Scratch);
