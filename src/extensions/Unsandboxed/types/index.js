(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  class UnsandboxedTypesBlocks {
    static extensionId = "usbTypes";

    constructor() {
      this.runtime = Scratch.vm && Scratch.vm.runtime;
    }

    getInfo() {
      return {
        id: UnsandboxedTypesBlocks.extensionId,
        name: translate("Types"),
        color1: "#5a8dee",
        blocks: [
          {
            opcode: "typeOf",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("type of [VALUE]"),
            arguments: {
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("hello")
              }
            }
          },
          {
            opcode: "isType",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("is [VALUE] a [TYPE]?"),
            arguments: {
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("hello")
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "supportedTypes",
                defaultValue: "string"
              }
            }
          }
        ],
        menus: {
          supportedTypes: {
            acceptReporters: false,
            items: "_getSupportedTypeMenu"
          }
        }
      };
    }

    isType(args) {
      const expectedType = Cast.toString(args.TYPE).trim().toLowerCase();
      if (!expectedType) {
        return false;
      }

      const actualType = this.typeOf({ VALUE: args.VALUE });
      return Cast.toString(actualType).trim().toLowerCase() === expectedType;
    }

    typeOf(args) {
      const value = args.VALUE;

      if (value === null) {
        return "null";
      }

      if (Array.isArray(value)) {
        return "array";
      }

      const customTypeId = this._getCustomTypeId(value);
      if (customTypeId) {
        return customTypeId;
      }

      if (Number.isNaN(value)) {
        return "nan";
      }

      const primitiveType = typeof value;
      if (primitiveType !== "object") {
        return primitiveType;
      }

      const constructorName = value && value.constructor && value.constructor.name;
      if (typeof constructorName === "string" && constructorName && constructorName !== "Object") {
        return constructorName;
      }

      return "object";
    }

    _getCustomTypeId(value) {
      if (!value || typeof value !== "object") {
        return null;
      }

      if (this.runtime && typeof this.runtime.getCustomTypeIdForValue === "function") {
        try {
          return this.runtime.getCustomTypeIdForValue(value);
        } catch (e) {
          // Fall back to legacy lookup.
        }
      }

      const registry = this.runtime && this.runtime._customTypeRegistry;
      if (!(registry instanceof Map)) {
        return null;
      }

      for (const [typeId, registration] of registry.entries()) {
        if (!registration || typeof registration.test !== "function") {
          continue;
        }

        try {
          if (registration.test(value)) {
            return typeId;
          }
        } catch (e) {
          // Ignore matcher errors so other registrations still run.
        }
      }

      return null;
    }

    _getSupportedTypeMenu() {
      const standardTypes = ["string", "number", "boolean", "object", "array"];
      const vmBuiltInTypes = this._getVmBuiltInTypeIds();
      const merged = Array.from(new Set([...standardTypes, ...vmBuiltInTypes]));
      return merged.map(typeId => ({ text: typeId, value: typeId }));
    }

    _getVmBuiltInTypeIds() {
      const ids = this.runtime && this.runtime._builtInCustomTypeIds;
      if (!Array.isArray(ids)) {
        return [];
      }

      const keys = [];
      for (const typeId of ids) {
        if (typeof typeId === "string" && typeId.length > 0) {
          keys.push(typeId);
        }
      }
      return keys.sort((a, b) => a.localeCompare(b));
    }
  }

  Scratch.extensions.register(new UnsandboxedTypesBlocks());
})(Scratch);
