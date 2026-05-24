(function (Scratch) {
  "use strict";

  const translate = Scratch.translate;

  class AppendToControlDemoBlocks {
    static extensionId = "usbAppendToControlDemo";

    constructor() {
      this.counter = 0;
    }

    getInfo() {
      return {
        id: AppendToControlDemoBlocks.extensionId,
        name: translate("Append To Control Demo"),

        // New behavior: place this extension's blocks inside an existing category.
        appendTo: "control",

        // Use control-like colors so appended blocks visually match the category.
        color1: "#ffab19",
        color2: "#ec9c13",
        color3: "#cf8b17",

        blocks: [
          {
            opcode: "incrementCounter",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("increment control demo counter")
          },
          {
            opcode: "resetCounter",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("reset control demo counter")
          },
          {
            opcode: "getCounter",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("control demo counter")
          }
        ]
      };
    }

    incrementCounter() {
      this.counter += 1;
    }

    resetCounter() {
      this.counter = 0;
    }

    getCounter() {
      return this.counter;
    }
  }

  Scratch.extensions.register(new AppendToControlDemoBlocks());
})(Scratch);
