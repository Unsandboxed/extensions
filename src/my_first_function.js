(function (Scratch) {
  "use strict";

  const Cast = Scratch.Cast;
  const translate = Scratch.translate;

  class MyFirstFunctionInlineBlocks {
    static extensionId = "myFirstFunctionInlineBlocks";

    getInfo() {
      return {
        id: MyFirstFunctionInlineBlocks.extensionId,
        name: translate("My First Function Inline Blocks"),
        color1: "#4a90e2",
        color2: "#357abd",
        color3: "#2a5f9e",
        blocks: [
          {
            opcode: "inlineBlock",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("run [NAME] with [INPUT]"),
            branchCount: 1,
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "func"
              },
              INPUT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "value"
              }
            }
          }
        ]
      };
    }

    inlineBlock(args, util) {
      if (!util.stackFrame.started) {
        util.stackFrame.started = true;
        util.thread.peekStackFrame().weakScriptTop = true;
        util.startBranch(1, false);
        return;
      }

      const fromReturnBlock = util.stackFrame.returnValue;
      if (typeof fromReturnBlock !== "undefined") {
        delete util.stackFrame.returnValue;
        return fromReturnBlock;
      }

      const reported = util.thread.justReported;
      if (reported === null || typeof reported === "undefined") {
        return "";
      }
      return Cast.toString(reported);
    }
  }

  Scratch.extensions.register(new MyFirstFunctionInlineBlocks());
})(Scratch);

