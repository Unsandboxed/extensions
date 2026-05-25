(function (Scratch) {
  "use strict";

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
          }
        ]
      };
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
  }

  Scratch.extensions.register(new UnsandboxedTypesBlocks());
})(Scratch);
