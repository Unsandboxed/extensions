/**!
 * Inline Block
 * @author 0znzw <meow@miyo.icu> (@link https://scratch.mit.edu/users/0znzw/)
 * @version 1.0
 * @license MIT AND LGPL-3.0
 * Do not remove this comment
 */
(function (Scratch) {
  'use strict';
  const extId = `0znzwUNSBinlineblock`;
  if (!Scratch.extensions.unsandboxed) {
    throw new Error(`"${extId}" must be ran unsandboxed.`);
  }
  if (!Scratch.UnsandboxedMod) {
    throw new Error(`"${extId}" must be ran on the mod "Unsandboxed".`);
  }
  const { Cast, BlockType, ArgumentType, vm } = Scratch;
  const { runtime } = vm;

  class extension {
    static exports = {};
    constructor() { }
    getInfo() {
      return {
        id: extId,
        name: 'Inline Block',
        blocks: [
          {
            blockType: BlockType.INLINE,
            opcode: 'inline',
            text: 'inline',
            branchCount: 1,
          }, 
          {
            blockType: BlockType.REPORTER,
            opcode: 'unendingstory',
            text: 'unending story',
          }, 
          {
            blockType: BlockType.REPORTER,
            opcode: 'markframe',
            text: 'mark stackframe',
          }, 
          {
            blockType: BlockType.CONDITIONAL,
            opcode: 'runboth',
            text: 'run both',
            branchCount: 2,
          }, 
          {
            blockType: BlockType.COMMAND,
            opcode: 'pause',
            text: 'pause thread (dbg value: [DBGVAL])',
            arguments: { DBGVAL: { type: null } },
          }
        ], 
        menus: {

        },
      };
    }

    runboth(args, util) {
      util.startBranch(2);
      util.startBranch(1);
    }

    pause(_, util) {
      Scratch.vm.runtime._pauseThread(util.thread);
    }

    markframe(_, util) {
      util.thread.peekStackFrame().marked = Date.now();
    }

    unendingstory(_, util) {
      console.log(util);
      return new Promise(() => (void 0));
    }

    inline(_, util) {
      const stackFrame = util.stackFrame;

      if (stackFrame.executed) {
        const returnValue = stackFrame.returnValue;
        delete stackFrame.returnValue;
        delete stackFrame.executed;
        return returnValue;
      } else {
        util.thread.peekStackFrame().waitingReporter = true;
        util.yield();
      }

      stackFrame.executed = true;

      util.thread.peekStackFrame().waitingReporter = true;
      stackFrame.returnValue = '';

      util.startBranch(1);
    }
  }

  Scratch.extensions.register(runtime[`cext_${extId}`] = new extension());
})(Scratch);