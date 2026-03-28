(function (Scratch) {
  "use strict";

  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const cast = Scratch.Cast;

  class EventsTest {
    constructor() {
      this.lastValues = Object.create(null);
      runtime.on("BEFORE_EXECUTE", () => {
        runtime.startHats("lmsEvent_whenValueChanged");
      });
    }

    getInfo() {
      return {
        id: "lmsEvent",
        name: "More Events 2 (real)",
        blocks: [
          {
            opcode: "whenIReceive",
            blockType: Scratch.BlockType.EVENT,
            text: "when I receive [MESSAGE] with [DATA]",
            isEdgeActivated: false,
            arguments: {
              MESSAGE: {
                type: Scratch.ArgumentType.STRING,
                acceptReporters: false,
                defaultValue: "message1"
              },
              DATA: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "data",
              }
            },
            extensions: ["colours_event"],
          },
          {
            opcode: "broadcast",
            blockType: Scratch.BlockType.COMMAND,
            text: "broadcast [MESSAGE] with data [DATA]",
            arguments: {
              MESSAGE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "message1"
              },
              DATA: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "hello!",
              }
            },
            extensions: ["colours_event"],
          },
          "---",
          {
            opcode: "whenValueChanged",
            blockType: Scratch.BlockType.HAT,
            text: "when [VALUE] is changed [OLD]",
            isEdgeActivated: false,
            arguments: {
              VALUE: {
                // Intentional:
                // Encourages people to place a block
                // (as opposed to typing a value)
                type: null,
              },
              OLD: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "old value",
              }
            },
            extensions: ["colours_event"],
          },
          "---",
          {
            opcode: "forEach",
            blockType: Scratch.BlockType.LOOP,
            text: "for each [ITEM] [NUMBER] in [LIST]",
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "item",
              },
              NUMBER: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "#",
              },
              LIST: {
                type: Scratch.ArgumentType.VARIABLE,
                variableTypes: "list"
              }
            },
            extensions: ["colours_data_lists"],
          },
        ],
      };
    }

    broadcast(args, util) {
      const message = cast.toString(args.MESSAGE);
      const data = cast.toString(args.DATA);
      runtime.startHats("lmsEvent_whenIReceive", {MESSAGE: message}, null, {data: data});
    }

    whenValueChanged(args, util) {
      const blockId = util.thread.peekStack() ?? util.thread.peekStackFrame().op.id;
      if (!this.lastValues[blockId])
      this.lastValues[blockId] = Scratch.Cast.toString(args.VALUE);
      if (this.lastValues[blockId] !== Scratch.Cast.toString(args.VALUE)) {
        util.thread.initParams();
        util.thread.pushParam("old value", this.lastValues[blockId]);
        this.lastValues[blockId] = Scratch.Cast.toString(args.VALUE);
        return true;
      }
      return false;
    }
  }

  Scratch.extensions.register(new EventsTest());
})(Scratch);
