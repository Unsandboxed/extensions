(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const uid = Scratch.UnsandboxedMod.helpers.uid;
  const translate = Scratch.translate;

  class UnsandboxedControlProxyBlocks {
    static extensionId = "usbControlProxy";

    constructor() {
      this.vm = Scratch.vm;
      this.runtime = this.vm.runtime;
    }

    getInfo() {
      return {
        id: UnsandboxedControlProxyBlocks.extensionId,
        name: translate("Control Proxy"),
        appendTo: "control",
        color1: "#FFAB19",
        color2: "#EC9C13",
        color3: "#CF8B17",
        blocks: [
          {
            opcode: "runAsTarget",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("as [TARGET]"),
            branchCount: 1,
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
                defaultValue: "_myself_"
              }
            }
          },
          {
            opcode: "runAsTaggedTargets",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("as sprites with tags [TAGS]"),
            branchCount: 1,
            arguments: {
              TAGS: {
                type: Scratch.ArgumentType.ARRAY
              }
            }
          },
          {
            opcode: "inlineAsTarget",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("inline as [TARGET]"),
            branchCount: 1,
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
                defaultValue: "_myself_"
              }
            }
          },
          {
            opcode: "remoteInlineFrame",
            blockType: Scratch.BlockType.COMMAND,
            hideFromPalette: true,
            text: "this block doesn't do anything, stop crying",
            branchCount: 1
          }
        ],
        menus: {
          targets: {
            acceptReporters: true,
            items: "_getTargetsMenu"
          }
        }
      };
    }

    _getBranchTopBlockId(util) {
      const blockId = util?.thread?.peekStack && util.thread.peekStack();
      if (!blockId) {
        return "";
      }

      const block = util?.target?.blocks?.getBlock(blockId);
      return block?.inputs?.SUBSTACK?.block || "";
    }

    _getTargetsMenu() {
      const items = [
        {
          text: translate("myself"),
          value: "_myself_"
        }
      ];

      const seen = new Set();
      const targets = this.runtime?.targets || [];
      for (const target of targets) {
        if (!target || !target.isOriginal || !target.id) {
          continue;
        }

        if (seen.has(target.id)) {
          continue;
        }
        seen.add(target.id);

        let name = "";
        if (typeof target.getName === "function") {
          name = target.getName();
        } else if (target.sprite && target.sprite.name) {
          name = target.sprite.name;
        }

        if (!name) {
          continue;
        }

        items.push({
          text: name,
          value: target.id
        });
      }

      return items;
    }

    _resolveTarget(rawTarget, util) {
      const value = Cast.toString(rawTarget);
      if (value === "_myself_") {
        return util?.target || null;
      }

      return this.runtime.getTargetById(value) || util?.target || null;
    }

    _parseTagList(rawValue) {
      const values = Array.isArray(rawValue)
        ? rawValue
        : Cast.toArray(rawValue);

      const unique = [];
      const seen = new Set();
      for (const value of values) {
        const tag = Cast.toString(value).trim();
        if (!tag || seen.has(tag)) {
          continue;
        }
        seen.add(tag);
        unique.push(tag);
      }
      return unique;
    }

    _getTargetsByAnyTag(tags) {
      if (!Array.isArray(tags) || tags.length === 0) {
        return [];
      }

      return this.runtime.targets.filter(target => {
        if (!target || target.isStage || !target.isOriginal) {
          return false;
        }

        if (!Array.isArray(target.tags) || target.tags.length === 0) {
          return false;
        }

        return tags.some(tag => target.tags.includes(tag));
      });
    }

    _createEphemeralBlockId(seed) {
      return `usbControlProxy_${seed}_${uid()}`;
    }

    _collectStackGraph(blockContainer, topBlockId) {
      const discovered = [];
      const visited = new Set();

      const walk = blockId => {
        if (!blockId || visited.has(blockId)) {
          return;
        }

        const block = blockContainer.getBlock(blockId);
        if (!block) {
          return;
        }

        visited.add(blockId);
        discovered.push(block);

        if (block.next) {
          walk(block.next);
        }

        const inputNames = Object.keys(block.inputs || {});
        for (const inputName of inputNames) {
          const inputData = block.inputs[inputName] || {};
          if (inputData.block) {
            walk(Cast.toString(inputData.block));
          }
          if (inputData.shadow) {
            walk(Cast.toString(inputData.shadow));
          }
        }
      };

      walk(topBlockId);
      return discovered;
    }

    _cloneSubstackOnTarget(sourceBlocks, topBlockId, target) {
      const sourceGraph = this._collectStackGraph(sourceBlocks, topBlockId);
      if (sourceGraph.length === 0) {
        return "";
      }

      const validIds = new Set(sourceGraph.map(block => block.id));
      const idMap = new Map();
      for (const sourceBlock of sourceGraph) {
        idMap.set(sourceBlock.id, this._createEphemeralBlockId(sourceBlock.id));
      }

      const remapId = blockId => {
        if (!blockId || !validIds.has(blockId)) {
          return null;
        }
        return idMap.get(blockId) || null;
      };

      for (const sourceBlock of sourceGraph) {
        const clonedBlock = {
          ...sourceBlock,
          id: idMap.get(sourceBlock.id),
          parent: remapId(sourceBlock.parent),
          next: remapId(sourceBlock.next),
          topLevel: sourceBlock.id === topBlockId,
          x: sourceBlock.id === topBlockId ? sourceBlock.x : undefined,
          y: sourceBlock.id === topBlockId ? sourceBlock.y : undefined,
          inputs: {},
          fields: sourceBlock.fields && typeof sourceBlock.fields === "object"
            ? JSON.parse(JSON.stringify(sourceBlock.fields))
            : {},
          mutation: sourceBlock.mutation && typeof sourceBlock.mutation === "object"
            ? JSON.parse(JSON.stringify(sourceBlock.mutation))
            : null
        };

        const inputNames = Object.keys(sourceBlock.inputs || {});
        for (const inputName of inputNames) {
          const sourceInput = sourceBlock.inputs[inputName] || {};
          const clonedInput = JSON.parse(JSON.stringify(sourceInput));
          clonedInput.block = remapId(sourceInput.block);
          clonedInput.shadow = remapId(sourceInput.shadow);
          clonedBlock.inputs[inputName] = clonedInput;
        }

        target.blocks.createBlock(clonedBlock);
      }

      return idMap.get(topBlockId) || "";
    }

    _runThreadOnTarget(topBlockId, target) {
      const thread = this.runtime._pushThread(topBlockId, target, {stackClick: false});

      return new Promise(resolve => {
        const cleanup = () => {
          this.runtime.removeListener("AFTER_EXECUTE", handleAfterExecute);

          if (target.blocks.getBlock(topBlockId)) {
            target.blocks.deleteBlock(topBlockId);
          }
        };

        const handleAfterExecute = () => {
          if (!this.runtime.isActiveThread(thread)) {
            cleanup();
            resolve();
          }
        };

        this.runtime.on("AFTER_EXECUTE", handleAfterExecute);
      });
    }

    _runSubstackOnTargets(sourceBlocks, sourceTopBlockId, targets) {
      if (!sourceBlocks || !sourceTopBlockId || !Array.isArray(targets) || targets.length === 0) {
        return;
      }

      let chain = Promise.resolve();
      for (const target of targets) {
        chain = chain.then(() => {
          const clonedTopBlockId = this._cloneSubstackOnTarget(sourceBlocks, sourceTopBlockId, target);
          if (!clonedTopBlockId) {
            return;
          }
          return this._runThreadOnTarget(clonedTopBlockId, target);
        });
      }

      return chain;
    }

    _runInlineOnTarget(remoteSubstackTopId, target) {
      const runnerTopId = this._createEphemeralBlockId("inline_runner");

      // Start at a hidden stack block so the remote thread has a proper SUBSTACK
      // frame where we can capture `procedures_return` values.
      target.blocks.createBlock({
        id: runnerTopId,
        opcode: `${UnsandboxedControlProxyBlocks.extensionId}_remoteInlineFrame`,
        next: null,
        parent: null,
        inputs: {
          SUBSTACK: {
            name: "SUBSTACK",
            block: remoteSubstackTopId,
            shadow: null
          }
        },
        fields: {},
        shadow: false,
        topLevel: true,
        x: 0,
        y: 0
      });

      const thread = this.runtime._pushThread(runnerTopId, target, {stackClick: false});

      return new Promise(resolve => {
        const cleanup = () => {
          this.runtime.removeListener("AFTER_EXECUTE", handleAfterExecute);

          if (target.blocks.getBlock(runnerTopId)) {
            target.blocks.deleteBlock(runnerTopId);
          }

          if (target.blocks.getBlock(remoteSubstackTopId)) {
            target.blocks.deleteBlock(remoteSubstackTopId);
          }
        };

        const handleAfterExecute = () => {
          if (!this.runtime.isActiveThread(thread)) {
            const result = Object.prototype.hasOwnProperty.call(thread, "__usbControlProxyInlineReturn")
              ? thread.__usbControlProxyInlineReturn
              : "";
            cleanup();
            resolve(typeof result === "undefined" ? "" : result);
          }
        };

        this.runtime.on("AFTER_EXECUTE", handleAfterExecute);
      });
    }

    remoteInlineFrame(args, util) {
      if (!util.stackFrame.started) {
        util.stackFrame.started = true;
        // Keep `return` inside this substack scoped to this inline runner.
        util.thread.peekStackFrame().weakScriptTop = true;
        util.startBranch(1, false);
        return;
      }

      // Mirror inline behavior: explicit procedures_return wins, then fall back
      // to justReported when no return block is used.
      const fromReturnBlock = util.stackFrame.returnValue;
      if (typeof fromReturnBlock !== "undefined") {
        delete util.stackFrame.returnValue;
        util.thread.__usbControlProxyInlineReturn = fromReturnBlock;
        return;
      }

      const reported = util.thread.justReported;
      util.thread.__usbControlProxyInlineReturn =
        reported === null || typeof reported === "undefined" ? "" : reported;
    }

    runAsTarget(args, util) {
      const sourceTopBlockId = this._getBranchTopBlockId(util);
      if (!sourceTopBlockId) {
        return;
      }

      const sourceBlocks = util?.target?.blocks;
      const target = this._resolveTarget(args.TARGET, util);
      if (!sourceBlocks || !target || !target.blocks) {
        return;
      }

      const clonedTopBlockId = this._cloneSubstackOnTarget(sourceBlocks, sourceTopBlockId, target);
      if (!clonedTopBlockId) {
        return;
      }

      return this._runThreadOnTarget(clonedTopBlockId, target);
    }

    runAsTaggedTargets(args, util) {
      const sourceTopBlockId = this._getBranchTopBlockId(util);
      if (!sourceTopBlockId) {
        return;
      }

      const sourceBlocks = util?.target?.blocks;
      if (!sourceBlocks) {
        return;
      }

      const tags = this._parseTagList(args.TAGS);
      if (tags.length === 0) {
        return;
      }

      const targets = this._getTargetsByAnyTag(tags);
      if (targets.length === 0) {
        return;
      }

      return this._runSubstackOnTargets(sourceBlocks, sourceTopBlockId, targets);
    }

    inlineAsTarget(args, util) {
      if (!util.stackFrame.started) {
        util.stackFrame.started = true;

        const sourceTopBlockId = this._getBranchTopBlockId(util);
        if (!sourceTopBlockId) {
          util.stackFrame.result = "";
          return "";
        }

        const sourceBlocks = util?.target?.blocks;
        const target = this._resolveTarget(args.TARGET, util);
        if (!sourceBlocks || !target || !target.blocks) {
          util.stackFrame.result = "";
          return "";
        }

        const clonedTopBlockId = this._cloneSubstackOnTarget(sourceBlocks, sourceTopBlockId, target);
        if (!clonedTopBlockId) {
          util.stackFrame.result = "";
          return "";
        }

        util.stackFrame.pendingPromise = this._runInlineOnTarget(clonedTopBlockId, target)
          .then(value => {
            util.stackFrame.result = value;
            return value;
          });

        return util.stackFrame.pendingPromise;
      }

      if (Object.prototype.hasOwnProperty.call(util.stackFrame, "result")) {
        const value = util.stackFrame.result;
        delete util.stackFrame.result;
        delete util.stackFrame.started;
        delete util.stackFrame.pendingPromise;
        return value;
      }

      if (util.stackFrame.pendingPromise) {
        return util.stackFrame.pendingPromise;
      }

      delete util.stackFrame.started;
      return "";
    }
  }

  Scratch.extensions.register(new UnsandboxedControlProxyBlocks());
})(Scratch);