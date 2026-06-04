(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  // We need some very handy methods to resolve the error parameter.
  const IterationExtension = require("../iteration");

  /**
   * Unsandboxed blocks for try/catch style script control flow.
   * @constructor
   */
  class UnsandboxedTryCatchBlocks {
    /**
     * The extension identifier of this block package.
     * @type {string}
     */
    static extensionId = "usbTryCatch";

    /**
     * Per-thread key for the most recently thrown error string.
     * @type {string}
     */
    static threadErrorKey = "__usbTryCatchError";

    /**
     * Per-thread key for nested try branch depth tracking.
     * @type {string}
     */
    static threadTryDepthKey = "__usbTryCatchTryDepth";

    /**
     * Define extension metadata and block descriptors.
     * @returns {object} Extension info for the runtime.
     */
    getInfo() {
      return {
        id: UnsandboxedTryCatchBlocks.extensionId,
        name: translate("Try/Catch"),
        color1: "#FFAB19",
        color2: "#EC9C13",
        color3: "#CF8B17",
        blocks: [
          {
            opcode: "tryCatch",
            blockType: Scratch.BlockType.CONDITIONAL,
            text: [translate("try"), translate("catch [ERROR]")],
            branchCount: 2,
            arguments: {
              ERROR: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: translate("error"),
              }
            }
          },
          {
            opcode: "throwError",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("throw [TYPE] [ERROR]"),
            isDynamic: true,
            isTerminal: true,
            dynamicTerminalField: "TYPE",
            terminalValues: ["error"],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("error"),
                menu: "errorTypes"
              },
              ERROR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("Something went wrong")
              }
            }
          }
        ],
        menus: {
          errorTypes: {
            acceptReporters: false,
            items: [
              {
                text: translate("error"),
                value: "error"
              },
              {
                text: translate("warning"),
                value: "warning"
              }
            ]
          }
        }
      };
    }

    _getThreadError(thread) {
      if (!thread) {
        return "";
      }
      const value = thread[UnsandboxedTryCatchBlocks.threadErrorKey];
      return typeof value === "string" ? value : "";
    }

    _setThreadError(thread, value) {
      if (!thread) {
        return;
      }
      thread[UnsandboxedTryCatchBlocks.threadErrorKey] = Cast.toString(value);
    }

    _clearThreadError(thread) {
      if (!thread) {
        return;
      }
      delete thread[UnsandboxedTryCatchBlocks.threadErrorKey];
    }

    /**
     * Get the current nested try depth for a thread.
     * @param {object} thread Runtime thread.
     * @returns {number} Active try branch depth.
     */
    _getTryDepth(thread) {
      if (!thread) {
        return 0;
      }
      const value = thread[UnsandboxedTryCatchBlocks.threadTryDepthKey];
      return Number.isFinite(value) && value > 0 ? value : 0;
    }

    /**
     * Enter a try branch context for the thread.
     * @param {object} thread Runtime thread.
     */
    _enterTryBranch(thread) {
      if (!thread) {
        return;
      }
      thread[UnsandboxedTryCatchBlocks.threadTryDepthKey] =
        this._getTryDepth(thread) + 1;
    }

    /**
     * Exit a try branch context for the thread.
     * @param {object} thread Runtime thread.
     */
    _exitTryBranch(thread) {
      if (!thread) {
        return;
      }
      const nextDepth = this._getTryDepth(thread) - 1;
      if (nextDepth > 0) {
        thread[UnsandboxedTryCatchBlocks.threadTryDepthKey] = nextDepth;
      } else {
        delete thread[UnsandboxedTryCatchBlocks.threadTryDepthKey];
      }
    }

    /**
     * Resolve a parameter input target as either a parameter name or reporter block.
     * @param {object} util Block utility.
     * @param {string} inputName Input identifier.
     * @param {string} [fallback=""] Fallback reporter label.
     * @returns {string|object} Resolved parameter target.
     */
    _resolveParameterTarget(util, inputName, fallback = "") {
      return IterationExtension.resolveReporter(util, inputName, fallback);
    }

    /**
     * Assign a value to a previously resolved parameter target.
     * @param {string|object} target Parameter name or reporter block.
     * @param {*} value Value to assign.
     * @param {object} util Block utility.
     */
    _assignResolvedParameterValue(target, value, util) {
      IterationExtension.assignResolvedParameterValue(target, value, util);
    }

    /**
     * Normalize throw type values to the supported UI severity set.
     * @param {*} value Raw type input.
     * @returns {"error"|"warning"} Normalized severity.
     */
    _normalizeErrorType(value) {
      const type = Cast.toString(value).trim().toLowerCase();
      return type === "warning" ? "warning" : "error";
    }

    /**
     * Execute try/catch control flow.
     * @param {object} args Block arguments.
     * @param {object} util Block utility.
     */
    tryCatch(args, util) {
      if (!util || !util.thread || !util.stackFrame) {
        return;
      }

      if (!util.stackFrame.usbTryCatchPhase) {
        this._clearThreadError(util.thread);
        util.stackFrame.usbTryCatchPhase = "try";
        this._enterTryBranch(util.thread);
        util.startBranch(1, true);
        return;
      }

      if (util.stackFrame.usbTryCatchPhase === "try") {
        this._exitTryBranch(util.thread);
        const errorMessage = this._getThreadError(util.thread);
        if (errorMessage) {
          util.stackFrame.usbTryCatchPhase = "catch";
          util.thread.initParams();
          const errorTarget = this._resolveParameterTarget(
            util,
            "ERROR",
            translate("error")
          );
          this._assignResolvedParameterValue(errorTarget, errorMessage, util);
          util.startBranch(2, false);
          return;
        }

        this._clearThreadError(util.thread);
        util.stackFrame.weakScriptTop = false;
        util.stackFrame.usbTryCatchPhase = "done";
        return;
      }

      if (util.stackFrame.usbTryCatchPhase === "catch") {
        this._clearThreadError(util.thread);
        util.stackFrame.weakScriptTop = false;
        util.stackFrame.usbTryCatchPhase = "done";
        return;
      }
    }

    /**
     * Check whether throw execution is currently inside a try branch.
     * @param {object} util Block utility.
     * @returns {boolean} True when current thread is inside a try branch.
     */
    _isInsideTryCatch(util) {
      return this._getTryDepth(util && util.thread) > 0;
    }

    /**
     * Throw an error for try/catch handling or GUI reporting.
     * @param {object} args Block arguments.
     * @param {object} util Block utility.
     */
    throwError(args, util) {
      if (!util || !util.thread) {
        return;
      }

      const errorType = this._normalizeErrorType(args.TYPE);
      const errorMessage = Cast.toString(args.ERROR);

      if (errorType === "warning") {
        const spriteName =
          util.target && typeof util.target.getName === "function"
            ? util.target.getName()
            : util.target && util.target.sprite && util.target.sprite.name
            ? util.target.sprite.name
            : "";
        const blockId =
          util.thread && typeof util.thread.peekStack === "function"
            ? util.thread.peekStack()
            : null;
        if (
          Scratch.gui &&
          typeof Scratch.gui.throwExtensionError === "function"
        ) {
          Scratch.gui.throwExtensionError(
            spriteName,
            errorMessage,
            blockId,
            errorType
          );
        }
        return;
      }

      const isInsideTryCatch = this._isInsideTryCatch(util);
      this._setThreadError(util.thread, errorMessage);

      // Only trigger compatibility-layer branch unwinding when a try branch can catch it.
      if (isInsideTryCatch && util.stackFrame) {
        util.stackFrame.weakScriptTop = true;
      }

      if (!isInsideTryCatch) {
        const spriteName =
          util.target && typeof util.target.getName === "function"
            ? util.target.getName()
            : util.target && util.target.sprite && util.target.sprite.name
            ? util.target.sprite.name
            : "";
        const blockId =
          util.thread && typeof util.thread.peekStack === "function"
            ? util.thread.peekStack()
            : null;
        if (
          Scratch.gui &&
          typeof Scratch.gui.throwExtensionError === "function"
        ) {
          Scratch.gui.throwExtensionError(
            spriteName,
            errorMessage,
            blockId,
            errorType
          );
        }
      }

      if (typeof util.stopThisScript === "function") {
        util.stopThisScript(true);
      }
    }
  }

  Scratch.extensions.register(new UnsandboxedTryCatchBlocks());
})(Scratch);
