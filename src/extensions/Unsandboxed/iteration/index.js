(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  /**
   * Unsandboxed blocks for iterating arrays and objects.
   * @constructor
   */
  class UnsandboxedIterationBlocks {
    /**
     * The extension identifier of this block package.
     * @type {string}
     */
    static extensionId = "usbIteration";

    constructor() {
      this.vm = Scratch.vm;
      this.runtime = this.vm.runtime;

      this._refreshTimer = null;
      this._isUpdatingReporterNames = false;
      this._loopParameterNames = new Map();
      this._reporterOwnership = new Map();

      this._parameterDefaults = {
        KEY: translate("key"),
        VALUE: translate("value"),
        ITEM: translate("item")
      };

      this._queueRefresh = this._queueRefresh.bind(this);

      // Keep parameter labels unique for nested loops in the active workspace.
      Scratch.gui.getBlockly().then(Blockly => {
        this.blockly = Blockly;

        const workspace = Blockly.getMainWorkspace();
        if (!workspace) return;

        workspace.addChangeListener(event => {
          if (this._isUpdatingReporterNames) return;

          if (this._shouldDelayRefresh(event, workspace)) {
            this._queueRefresh(120);
            return;
          }

          this._queueRefresh();
        });

        this._queueRefresh();
      });
    }

    _queueRefresh(delayMs = 0) {
      if (this._refreshTimer) {
        clearTimeout(this._refreshTimer);
      }

      this._refreshTimer = setTimeout(() => {
        this._refreshTimer = null;
        this._refreshParameterReporters();
      }, delayMs);
    }

    _isWorkspaceDragging(workspace) {
      if (!workspace) return false;

      if (typeof workspace.isDragging === "function" && workspace.isDragging()) {
        return true;
      }

      if (this.blockly && typeof this.blockly.dragMode_ === "number" && this.blockly.dragMode_ !== 0) {
        return true;
      }

      return false;
    }

    _shouldDelayRefresh(event, workspace) {
      if (this._isWorkspaceDragging(workspace)) {
        return true;
      }

      if (!event || !this.blockly || !this.blockly.Events) {
        return false;
      }

      if (event.isUiEvent) {
        return true;
      }

      return event.type === this.blockly.Events.MOVE || event.type === this.blockly.Events.BLOCK_DRAG;
    }

    _refreshParameterReporters() {
      if (!this.blockly) return;

      const target = this.runtime.getEditingTarget();
      if (!target || !target.blocks) return;

      const workspace = this.blockly.getMainWorkspace();
      if (!workspace) return;

      if (this._isWorkspaceDragging(workspace)) {
        this._queueRefresh(120);
        return;
      }

      const blocks = Object.values(target.blocks._blocks)
        .filter(model => this._isIterationOpcode(model.opcode))
        .sort((left, right) => this._getDepthForBlock(left, target.blocks) - this._getDepthForBlock(right, target.blocks));

      this._refreshReporterOwnership(workspace);

      const liveBlockIds = new Set(blocks.map(model => model.id));
      const events = this.blockly.Events;
      const previousGroup = events && typeof events.getGroup === "function" ? events.getGroup() : null;

      this._isUpdatingReporterNames = true;
      try {
        if (!previousGroup && events && typeof events.setGroup === "function") {
          events.setGroup(true);
        }

        for (const block of blocks) {
          const workspaceBlock = workspace.getBlockById(block.id);
          if (!workspaceBlock) continue;

          const previousNames = this._loopParameterNames.get(block.id) || Object.create(null);
          const currentNames = Object.create(null);
          const forbiddenNames = this._getAncestorParameterLabels(workspaceBlock);

          for (const inputName of this._getLoopParameterInputs(block.opcode)) {
            const inputReporter = this._getLoopInputReporterBlock(workspaceBlock, inputName);
            const rawLabel = inputReporter ? Cast.toString(inputReporter.getFieldValue("VALUE")) : "";

            const previousLabel = rawLabel || previousNames[inputName] || this._parameterDefaults[inputName] || "";
            const baseLabel = this._removeTrailingNumbers(previousLabel);
            const nextLabel = this._makeUniqueLabel(baseLabel, forbiddenNames);
            currentNames[inputName] = nextLabel;
            forbiddenNames.add(nextLabel);

            if (previousLabel !== nextLabel) {
              this._renameOwnedLoopReporterUsages(workspaceBlock, previousLabel, nextLabel);
            }

            this._setLoopInputReporterLabel(workspaceBlock, inputName, nextLabel);
          }

          this._loopParameterNames.set(block.id, currentNames);
        }

        for (const trackedId of Array.from(this._loopParameterNames.keys())) {
          if (!liveBlockIds.has(trackedId)) {
            this._loopParameterNames.delete(trackedId);
          }
        }
      } finally {
        if (!previousGroup && events && typeof events.setGroup === "function") {
          events.setGroup(false);
        }
        this._isUpdatingReporterNames = false;
      }
    }

    _getLoopParameterInputs(opcode) {
      if (opcode === `${UnsandboxedIterationBlocks.extensionId}_forKeyValue`) {
        return ["KEY", "VALUE"];
      }
      if (opcode === `${UnsandboxedIterationBlocks.extensionId}_forItem`) {
        return ["ITEM", "INDEX"];
      }
      if (opcode === `${UnsandboxedIterationBlocks.extensionId}_forRange`) {
        return ["INDEX"];
      }
      if (opcode === `${UnsandboxedIterationBlocks.extensionId}_repeatWith`) {
        return ["INDEX"];
      }
      if (opcode === `${UnsandboxedIterationBlocks.extensionId}_forChar`) {
        return ["CHAR", "INDEX"];
      }
      return [];
    }

    _getLoopInputReporterBlock(loopBlock, inputName) {
      const inputBlock = loopBlock.getInputTargetBlock(inputName);
      if (!inputBlock) return null;
      if (inputBlock.type !== "argument_reporter_string_number") return null;
      return inputBlock;
    }

    _setLoopInputReporterLabel(loopBlock, inputName, label) {
      const reporter = this._getLoopInputReporterBlock(loopBlock, inputName);
      if (!reporter) return;
      if (Cast.toString(reporter.getFieldValue("VALUE")) === label) return;
      reporter.setFieldValue(label, "VALUE");

      this._reporterOwnership.set(reporter.id, {
        label,
        ownerLoopId: loopBlock.id
      });
    }

    _refreshReporterOwnership(workspace) {
      const allReporters = workspace
        .getAllBlocks(false)
        .filter(block => block.type === "argument_reporter_string_number");

      const liveIds = new Set(allReporters.map(block => block.id));
      for (const trackedId of Array.from(this._reporterOwnership.keys())) {
        if (!liveIds.has(trackedId)) {
          this._reporterOwnership.delete(trackedId);
        }
      }

      for (const reporter of allReporters) {
        const label = Cast.toString(reporter.getFieldValue("VALUE"));
        const previous = this._reporterOwnership.get(reporter.id);

        if (this._isLoopParameterDeclarationReporter(reporter)) {
          const ownerLoop = reporter.getParent();
          this._reporterOwnership.set(reporter.id, {
            label,
            ownerLoopId: ownerLoop ? ownerLoop.id : null
          });
          continue;
        }

        if (previous && previous.label === label) {
          const ownerStillExists = previous.ownerLoopId ? workspace.getBlockById(previous.ownerLoopId) : null;
          if (ownerStillExists) {
            continue;
          }
        }

        this._reporterOwnership.set(reporter.id, {
          label,
          ownerLoopId: this._computeNearestOwnerLoopId(reporter, label)
        });
      }
    }

    _computeNearestOwnerLoopId(reporter, label) {
      let current = reporter;
      while (current) {
        if (this._isIterationOpcode(current.type)) {
          const labels = this._getLoopParameterLabels(current);
          if (labels.has(label)) {
            return current.id;
          }
        }
        current = current.getSurroundParent();
      }
      return null;
    }

    _renameOwnedLoopReporterUsages(loopBlock, previousLabel, nextLabel) {
      if (!previousLabel || previousLabel === nextLabel) return;

      for (const block of loopBlock.getDescendants()) {
        if (block.type !== "argument_reporter_string_number") continue;
        if (this._isLoopParameterDeclarationReporter(block)) continue;

        const current = Cast.toString(block.getFieldValue("VALUE"));
        if (current !== previousLabel) continue;

        const ownership = this._reporterOwnership.get(block.id);
        if (!ownership || ownership.ownerLoopId !== loopBlock.id) continue;

        block.setFieldValue(nextLabel, "VALUE");
        this._reporterOwnership.set(block.id, {
          label: nextLabel,
          ownerLoopId: loopBlock.id
        });
      }
    }

    _getAncestorParameterLabels(loopBlock) {
      const labels = new Set();
      let current = loopBlock.getSurroundParent();

      while (current) {
        if (this._isIterationOpcode(current.type)) {
          const ancestorLabels = this._getLoopParameterLabels(current);
          for (const label of ancestorLabels) {
            labels.add(label);
          }
        }
        current = current.getSurroundParent();
      }

      return labels;
    }

    _makeUniqueLabel(preferredLabel, forbiddenNames) {
      const preferred = Cast.toString(preferredLabel || "");
      if (!forbiddenNames.has(preferred)) {
        return preferred;
      }

      const base = this._removeTrailingNumbers(preferred) || preferred;
      let suffix = 2;
      let candidate = `${base}${suffix}`;
      while (forbiddenNames.has(candidate)) {
        suffix++;
        candidate = `${base}${suffix}`;
      }
      return candidate;
    }

    _getLoopParameterLabels(loopBlock) {
      const labels = new Set();
      const block = loopBlock;

      for (const inputName of this._getLoopParameterInputs(block.type)) {
        const reporter = this._getLoopInputReporterBlock(block, inputName);
        if (!reporter) continue;
        labels.add(Cast.toString(reporter.getFieldValue("VALUE")));
      }

      return labels;
    }

    _isLoopParameterDeclarationReporter(block) {
      if (!block || block.type !== "argument_reporter_string_number") return false;

      const parent = block.getParent();
      if (!parent || !this._isIterationOpcode(parent.type)) return false;

      for (const inputName of this._getLoopParameterInputs(parent.type)) {
        const reporter = this._getLoopInputReporterBlock(parent, inputName);
        if (reporter && reporter.id === block.id) {
          return true;
        }
      }

      return false;
    }

    _isIterationOpcode(opcode) {
      return opcode === `${UnsandboxedIterationBlocks.extensionId}_forKeyValue` ||
        opcode === `${UnsandboxedIterationBlocks.extensionId}_forItem` ||
        opcode === `${UnsandboxedIterationBlocks.extensionId}_repeatWith` ||
        opcode === `${UnsandboxedIterationBlocks.extensionId}_forRange` ||
        opcode === `${UnsandboxedIterationBlocks.extensionId}_forChar`;
    }

    _getDepthForBlock(block, container) {
      let previous = block;
      let depth = 0;

      while (previous) {
        if (previous.opcode === block.opcode) {
          depth++;
        }
        previous = this._getOuterParent(previous, container);
      }

      return depth;
    }

    _getOuterParent(block, container) {
      let previousId;
      do {
        previousId = block.id;
        block = container.getBlock(block.parent);
        if (!block) {
          return null;
        }
      } while (block.next === previousId);
      return block;
    }

    _removeTrailingNumbers(value) {
      let text = Cast.toString(value);
      if (!text) return text;

      let index = text.length - 1;
      while (index >= 0) {
        const char = text[index];
        if (char < "0" || char > "9") break;
        index--;
      }

      return text.slice(0, index + 1);
    }

    _getParameterName(util, inputName, fallback = "") {
      const blockId = util?.thread?.peekStack && util.thread.peekStack();
      if (!blockId) return Cast.toString(fallback);

      const block = util.target?.blocks?.getBlock(blockId);
      if (!block || !block.inputs || !block.inputs[inputName]) {
        return Cast.toString(fallback);
      }

      const inputId = block.inputs[inputName].block;
      const inputBlock = util.target.blocks.getBlock(inputId);
      const fieldValue = inputBlock?.fields?.VALUE?.value;
      if (typeof fieldValue === "undefined" || fieldValue === null) {
        return Cast.toString(fallback);
      }

      return Cast.toString(fieldValue);
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedIterationBlocks.extensionId,
        name: translate("Iteration"),
        color1: "#FFAB19",
        blocks: [
          {
            opcode: "forKeyValue",
            blockType: Scratch.BlockType.LOOP,
            text: translate("for [KEY] [VALUE] in [OBJECT]"),
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: translate("key")
              },
              VALUE: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: translate("value")
              },
              OBJECT: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          },
          {
            opcode: "forItem",
            blockType: Scratch.BlockType.LOOP,
            text: translate("for [ITEM] [INDEX] in [ARRAY]"),
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: translate("item")
              },
              INDEX: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "#"
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              }
            }
          },
          "---",
          {
            opcode: "repeatWith",
            blockType: Scratch.BlockType.LOOP,
            text: translate("repeat [COUNT] times with [INDEX]"),
            arguments: {
              COUNT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              },
              INDEX: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "i"
              }
            }
          },
          {
            opcode: "forRange",
            blockType: Scratch.BlockType.LOOP,
            text: translate("for [INDEX] from [START] to [END] by [STEP]"),
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "i"
              },
              START: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              },
              END: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              },
              STEP: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: "forChar",
            blockType: Scratch.BlockType.LOOP,
            text: translate("for [CHAR] [INDEX] in [TEXT]"),
            arguments: {
              CHAR: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: translate("char")
              },
              INDEX: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "#"
              },
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("text")
              }
            }
          }
        ],
        menus: {}
      };
    }

    /**
     * Iterate key/value pairs from an object.
     * @param {object} args Block arguments.
     * @param {object} util Block utility object.
     * @returns {boolean|undefined} Truthy while loop should continue.
     */
    forKeyValue(args, util) {
      const keyName = this._getParameterName(util, "KEY", args.KEY);
      const valueName = this._getParameterName(util, "VALUE", args.VALUE);

      if (typeof util.stackFrame.index === "undefined") {
        util.stackFrame.index = 0;
      }

      const source = Cast.toObject(args.OBJECT);
      const keys = Object.keys(source);
      const values = Object.values(source);

      if (util.stackFrame.index < keys.length) {
        util.thread.initParams();
        util.thread.pushParam(keyName, keys[util.stackFrame.index]);
        util.thread.pushParam(valueName, values[util.stackFrame.index]);
        util.stackFrame.index++;
        util.startBranch(1, true);
      } else {
        util.startBranch(2, false);
      }
    }

    /**
     * Iterate items from an array.
     * @param {object} args Block arguments.
     * @param {object} util Block utility object.
     * @returns {boolean|undefined} Truthy while loop should continue.
     */
    forItem(args, util) {
      const itemName = this._getParameterName(util, "ITEM", args.ITEM);
      const indexName = this._getParameterName(util, "INDEX", args.INDEX);

      if (typeof util.stackFrame.index === "undefined") {
        util.stackFrame.index = 0;
      }

      const array = Cast.toArray(args.ARRAY);

      if (util.stackFrame.index < array.length) {
        util.thread.initParams();
        util.thread.pushParam(itemName, array[util.stackFrame.index]);
        util.thread.pushParam(indexName, util.stackFrame.index + 1);
        util.stackFrame.index++;
        util.startBranch(1, true);
      } else {
        util.startBranch(2, false);
      }
    }

    repeatWith(args, util) {
      const indexName = this._getParameterName(util, "INDEX", args.INDEX);

      if (typeof util.stackFrame.index === "undefined") {
        util.stackFrame.index = 0;
      }

      const count = Math.max(0, Math.floor(Cast.toNumber(args.COUNT)));
      if (util.stackFrame.index < count) {
        util.thread.initParams();
        util.thread.pushParam(indexName, util.stackFrame.index + 1);
        util.stackFrame.index++;
        util.startBranch(1, true);
      } else {
        util.startBranch(2, false);
      }
    }

    forRange(args, util) {
      const indexName = this._getParameterName(util, "INDEX", args.INDEX);

      if (typeof util.stackFrame.initialized === "undefined") {
        const start = Cast.toNumber(args.START);
        const end = Cast.toNumber(args.END);
        let step = Cast.toNumber(args.STEP);

        if (!Number.isFinite(start) || !Number.isFinite(end)) {
          util.startBranch(2, false);
          return;
        }

        if (!Number.isFinite(step) || step === 0) {
          step = start <= end ? 1 : -1;
        }

        util.stackFrame.initialized = true;
        util.stackFrame.current = start;
        util.stackFrame.end = end;
        util.stackFrame.step = step;
      }

      const current = util.stackFrame.current;
      const end = util.stackFrame.end;
      const step = util.stackFrame.step;
      const inRange = step > 0 ? current <= end : current >= end;

      if (inRange) {
        util.thread.initParams();
        util.thread.pushParam(indexName, current);
        util.stackFrame.current = current + step;
        util.startBranch(1, true);
      } else {
        util.startBranch(2, false);
      }
    }

    forChar(args, util) {
      const charName = this._getParameterName(util, "CHAR", args.CHAR);
      const indexName = this._getParameterName(util, "INDEX", args.INDEX);

      if (typeof util.stackFrame.index === "undefined") {
        util.stackFrame.index = 0;
      }

      const text = Cast.toString(args.TEXT);
      if (util.stackFrame.index < text.length) {
        util.thread.initParams();
        util.thread.pushParam(charName, text[util.stackFrame.index]);
        util.thread.pushParam(indexName, util.stackFrame.index + 1);
        util.stackFrame.index++;
        util.startBranch(1, true);
      } else {
        util.startBranch(2, false);
      }
    }
  }

  Scratch.extensions.register(new UnsandboxedIterationBlocks());
})(Scratch);