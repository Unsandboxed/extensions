(function (Scratch) {
  "use strict";

  const translate = Scratch.translate;
  const data = require("./data.json");

  class UnsandboxedRequireDemoBlocks {
    static extensionId = "usbRequireDemo";

    getInfo() {
      return {
        id: UnsandboxedRequireDemoBlocks.extensionId,
        name: translate("Require Demo"),
        color1: "#2f8f83",
        blocks: [
          {
            opcode: "getMessage",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("require test message")
          },
          {
            opcode: "getValue",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("require test value")
          }
        ]
      };
    }

    getMessage() {
      return data.message;
    }

    getValue() {
      return data.value;
    }
  }

  Scratch.extensions.register(new UnsandboxedRequireDemoBlocks());
})(Scratch);
