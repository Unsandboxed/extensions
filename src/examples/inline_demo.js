(function (Scratch) {
  "use strict";

  const Cast = Scratch.Cast;
  const translate = Scratch.translate;

  class UnsandboxedInlineDemoExample {
    static extensionId = "usbInlineDemo";

    getInfo() {
      return {
        id: UnsandboxedInlineDemoExample.extensionId,
        name: translate("Inline Demo"),
        color1: "#57c257",
        color2: "#46aa46",
        color3: "#3c943c",
        blocks: [
          {
            opcode: "inline",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("inline"),
            branchCount: 1
          }
        ]
      };
    }

    inline(args, util) {
      if (!util.stackFrame.started) {
        util.stackFrame.started = true;
        // Let `return` inside the substack stop only this inline frame.
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

  Scratch.extensions.register(new UnsandboxedInlineDemoExample());
})(Scratch);
