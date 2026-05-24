(function (Scratch) {
  "use strict";

  const Cast = Scratch.Cast;
  const translate = Scratch.translate;

  /**
   * This file demonstrates the shape of both metadata contracts:
   * - requires: import blocks from another extension into THIS flyout.
   * - provides: expose selected blocks from THIS extension inside another extension's flyout.
   *
   * Important: `provides` is cosmetic flyout composition only.
   * The provided block still belongs to this extension and keeps its original opcode/function.
   */
  class RequiresProvidesFormatExample {
    static extensionId = "usbRequiresProvidesFormatExample";

    getInfo() {
      return {
        id: RequiresProvidesFormatExample.extensionId,
        name: translate("Requires/Provides Format (POC)"),
        color1: "#5f88b7",
        color2: "#4b729c",
        color3: "#3c5c80",

        // `requires` format: { providerExtensionId: [providerOpcode, ...] }
        // If provider is not loaded, VM can mirror these into this category.
        requires: {
          usbVectors: ["vec2"]
        },

        // `provides` format: { targetExtensionId: [thisExtensionOpcode, ...] }
        // VM can show these blocks under target flyouts when both extensions are available.
        provides: {
          usbPathfinding: ["addTagToMyself", "firstTagOfMyself"]
        },

        blocks: [
          {
            blockType: Scratch.BlockType.LABEL,
            text: translate("local blocks")
          },
          {
            opcode: "addTagToMyself",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("add tag [TAG] to myself"),
            arguments: {
              TAG: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "solid"
              }
            }
          },
          {
            opcode: "firstTagOfMyself",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("first tag of myself")
          },
          {
            opcode: "tagCountOfMyself",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("tag count of myself")
          }
        ]
      };
    }

    addTagToMyself(args, util) {
      const tag = Cast.toString(args.TAG).trim();
      if (!tag) return;

      const target = util && util.target;
      if (!target) return;

      if (!target.__requiresProvidesExampleTags) {
        target.__requiresProvidesExampleTags = [];
      }

      target.__requiresProvidesExampleTags.push(tag);
    }

    firstTagOfMyself(args, util) {
      const tags = this._getTags(util);
      return tags.length > 0 ? tags[0] : "";
    }

    tagCountOfMyself(args, util) {
      return this._getTags(util).length;
    }

    _getTags(util) {
      const target = util && util.target;
      if (!target || !Array.isArray(target.__requiresProvidesExampleTags)) {
        return [];
      }
      return target.__requiresProvidesExampleTags;
    }
  }

  Scratch.extensions.register(new RequiresProvidesFormatExample());
})(Scratch);
