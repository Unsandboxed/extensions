(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  // We need some very handy methods to resolve the error parameter.
  const IterationExtension = require("../iteration");

  /**
   * Unsandboxed blocks for structured script error flow.
   * @constructor
   */
  class UnsandboxedErrorsBlocks {
    /**
     * The extension identifier of this block package.
     * @type {string}
     */
    static extensionId = "usbErrors";

    /**
     * Per-thread key for the most recently thrown error string.
     * @type {string}
     */
    static threadErrorKey = "__usbErrorsLastError";

    /**
     * Per-thread key for nested try branch depth tracking.
     * @type {string}
     */
    static threadErrorScopeDepthKey = "__usbErrorsScopeDepth";

    /**
     * Define extension metadata and block descriptors.
     * @returns {object} Extension info for the runtime.
     */
    getInfo() {
      return {
        id: UnsandboxedErrorsBlocks.extensionId,
        name: translate("Errors"),
        color1: "#FFAB19",
        color2: "#EC9C13",
        color3: "#CF8B17",
        blocks: [
          {
            opcode: "attemptHandle",
            blockType: Scratch.BlockType.CONDITIONAL,
            text: [translate("attempt"), translate("on error [ERROR]")],
            branchCount: 2,
            arguments: {
              ERROR: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: translate("error"),
              }
            }
          },
          {
            opcode: "raise",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("raise [TYPE] [ERROR]"),
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
      const value = thread[UnsandboxedErrorsBlocks.threadErrorKey];
      return typeof value === "string" ? value : "";
    }

    _setThreadError(thread, value) {
      if (!thread) {
        return;
      }
      thread[UnsandboxedErrorsBlocks.threadErrorKey] = Cast.toString(value);
    }

    _clearThreadError(thread) {
      if (!thread) {
        return;
      }
      delete thread[UnsandboxedErrorsBlocks.threadErrorKey];
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
      const value = thread[UnsandboxedErrorsBlocks.threadErrorScopeDepthKey];
      return Number.isFinite(value) && value > 0 ? value : 0;
    }

    /**
    * Enter an error scope context for the thread.
     * @param {object} thread Runtime thread.
     */
    _enterTryBranch(thread) {
      if (!thread) {
        return;
      }
      thread[UnsandboxedErrorsBlocks.threadErrorScopeDepthKey] =
        this._getTryDepth(thread) + 1;
    }

    /**
    * Exit an error scope context for the thread.
     * @param {object} thread Runtime thread.
     */
    _exitTryBranch(thread) {
      if (!thread) {
        return;
      }
      const nextDepth = this._getTryDepth(thread) - 1;
      if (nextDepth > 0) {
        thread[UnsandboxedErrorsBlocks.threadErrorScopeDepthKey] = nextDepth;
      } else {
        delete thread[UnsandboxedErrorsBlocks.threadErrorScopeDepthKey];
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
    * Execute error handling control flow.
     * @param {object} args Block arguments.
     * @param {object} util Block utility.
     */
      attemptHandle(args, util) {
      if (!util || !util.thread || !util.stackFrame) {
        return;
      }

      if (!util.stackFrame.usbErrorsPhase) {
        this._clearThreadError(util.thread);
        util.stackFrame.usbErrorsPhase = "attempt";
        this._enterTryBranch(util.thread);
        util.startBranch(1, true);
        return;
      }

      if (util.stackFrame.usbErrorsPhase === "attempt") {
        this._exitTryBranch(util.thread);
        const errorMessage = this._getThreadError(util.thread);
        if (errorMessage) {
          util.stackFrame.usbErrorsPhase = "handle";
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
        util.stackFrame.usbErrorsPhase = "done";
        return;
      }

      if (util.stackFrame.usbErrorsPhase === "handle") {
        this._clearThreadError(util.thread);
        util.stackFrame.weakScriptTop = false;
        util.stackFrame.usbErrorsPhase = "done";
        return;
      }
    }

    /**
     * Check whether raise execution is currently inside an error scope.
     * @param {object} util Block utility.
     * @returns {boolean} True when current thread is inside an error scope.
     */
    _isInsideErrorScope(util) {
      return this._getTryDepth(util && util.thread) > 0;
    }

    /**
    * Raise an error for in-script handling or GUI reporting.
     * @param {object} args Block arguments.
     * @param {object} util Block utility.
     */
      raise(args, util) {
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

      const isInsideErrorScope = this._isInsideErrorScope(util);
      this._setThreadError(util.thread, errorMessage);

      // Only trigger branch unwinding when an active error scope can handle it.
      if (isInsideErrorScope && util.stackFrame) {
        util.stackFrame.weakScriptTop = true;
      }

      if (!isInsideErrorScope) {
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

  Scratch.extensions.register(new UnsandboxedErrorsBlocks());
})(Scratch);
