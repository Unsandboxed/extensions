(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const Clone = Scratch.UnsandboxedMod.Clone.structured;
  const uid = Scratch.UnsandboxedMod.helpers.uid;
  const translate = Scratch.translate;

  class UnsandboxedClonesPlusBlocks {
    static extensionId = "usbClonesPlus";

    constructor() {
      this.vm = Scratch.vm;
      this.runtime = this.vm.runtime;
    }

    getInfo() {
      return {
        id: UnsandboxedClonesPlusBlocks.extensionId,
        name: translate("Clones Plus"),
        // should use "control" colors
        color1: "#62a84f",
        color2: "#549342",
        color3: "#467c37",
        blocks: [
          {
            opcode: "createCloneOfWithTags",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("create clone of [TARGET] with tags [TAGS]"),
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              },
              TAGS: {
                type: Scratch.ArgumentType.ARRAY
              }
            }
          },
          {
            opcode: "createCloneOfThen",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("create clone of [TARGET] then"),
            branchCount: 1,
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "deleteClonesOf",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("delete clones of [TARGET]"),
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "deleteClonesOfWithAnyTag",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("delete clones of [TARGET] with any tag in [TAGS]"),
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              },
              TAGS: {
                type: Scratch.ArgumentType.ARRAY
              }
            }
          },
          {
            opcode: "cloneCountOfWithAnyTag",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("clone count of [TARGET] with any tag in [TAGS]"),
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              },
              TAGS: {
                type: Scratch.ArgumentType.ARRAY
              }
            }
          },
          "---",
          // always the last blocks in the list
          {
            opcode: "cloneCountOf",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("clone count of [TARGET]"),
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "isClone",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("is clone?")
          }
        ],
        menus: {
          targets: {
            acceptReporters: true,
            items: "_getTargets"
          }
        }
      };
    }

    cloneCountOf(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!target || !target.sprite || !Array.isArray(target.sprite.clones)) return 0;
      return target.sprite.clones.filter(clone => clone && !clone.isOriginal).length;
    }

    isClone(args, util) {
      return Boolean(util && util.target && !util.target.isOriginal);
    }

    createCloneOfWithTags(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!target || target.isStage) return;

      const tags = this._parseTagArray(args.TAGS);
      this._createCloneWithTags(target, tags);
    }

    createCloneOfThen(args, util) {
      const sourceTopBlockId = this._getBranchTopBlockId(util);
      if (!sourceTopBlockId) return;

      const sourceBlocks = util?.target?.blocks;
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!sourceBlocks || !target || target.isStage) return;

      const newClone = this._createCloneWithTags(target, []);
      if (!newClone || !newClone.blocks) return;

      const clonedTopBlockId = this._cloneSubstackOnTarget(sourceBlocks, sourceTopBlockId, newClone);
      if (!clonedTopBlockId) return;

      return this._runThreadOnTarget(clonedTopBlockId, newClone);
    }

    deleteClonesOfWithAnyTag(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!target || !target.sprite || !Array.isArray(target.sprite.clones)) return;

      const tags = this._parseTagArray(args.TAGS);
      if (tags.length === 0) return;

      const clones = target.sprite.clones.slice();
      for (const clone of clones) {
        if (!clone || clone.isOriginal) continue;
        this._ensureTags(clone);
        if (!tags.some(tag => clone.tags.includes(tag))) continue;
        this.runtime.disposeTarget(clone);
        this.runtime.stopForTarget(clone);
      }
    }

    deleteClonesOf(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!target || !target.sprite || !Array.isArray(target.sprite.clones)) return;

      const clones = target.sprite.clones.slice();
      for (const clone of clones) {
        if (!clone || clone.isOriginal) continue;
        this.runtime.disposeTarget(clone);
        this.runtime.stopForTarget(clone);
      }
    }

    cloneCountOfWithAnyTag(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!target || !target.sprite || !Array.isArray(target.sprite.clones)) return 0;

      const tags = this._parseTagArray(args.TAGS);
      if (tags.length === 0) return 0;

      return target.sprite.clones.filter(clone => {
        if (!clone || clone.isOriginal) return false;
        this._ensureTags(clone);
        return tags.some(tag => clone.tags.includes(tag));
      }).length;
    }

    _getTargets() {
      const spriteNames = [{ text: translate("myself"), value: "_myself_" }];
      const targets = this.runtime.targets;
      for (const target of targets) {
        if (target.isOriginal && !target.isStage) {
          const targetName = target.getName();
          spriteNames.push({
            text: targetName,
            value: targetName
          });
        }
      }
      return spriteNames;
    }

    _getTargetFromMenu(targetName, util) {
      let target = this.runtime.getSpriteTargetByName(targetName);
      if (targetName === "_myself_") target = util.target;
      if (targetName === "_stage_") target = this.runtime.getTargetForStage();
      return target;
    }

    _parseTagArray(rawValue) {
      const values = Cast.toArray(rawValue);
      const tags = [];
      const seen = new Set();
      for (const value of values) {
        const tag = Cast.toString(value).trim();
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        tags.push(tag);
      }
      return tags;
    }

    _createCloneWithTags(target, tags) {
      const newClone = target.makeClone();
      if (!newClone) return null;

      this.runtime.addTarget(newClone);
      newClone.goBehindOther(target);
      newClone.tags = Clone(tags);
      this._notifyTagsChanged(newClone);
      return newClone;
    }

    _getBranchTopBlockId(util) {
      const blockId = util?.thread?.peekStack && util.thread.peekStack();
      if (!blockId) return "";

      const block = util?.target?.blocks?.getBlock(blockId);
      return block?.inputs?.SUBSTACK?.block || "";
    }

    _createEphemeralBlockId(seed) {
      return `usbClonesPlus_${seed}_${uid()}`;
    }

    _collectStackGraph(blockContainer, topBlockId) {
      const discovered = [];
      const visited = new Set();

      const walk = blockId => {
        if (!blockId || visited.has(blockId)) return;

        const block = blockContainer.getBlock(blockId);
        if (!block) return;

        visited.add(blockId);
        discovered.push(block);

        if (block.next) walk(block.next);

        const inputNames = Object.keys(block.inputs || {});
        for (const inputName of inputNames) {
          const inputData = block.inputs[inputName] || {};
          if (inputData.block) walk(Cast.toString(inputData.block));
          if (inputData.shadow) walk(Cast.toString(inputData.shadow));
        }
      };

      walk(topBlockId);
      return discovered;
    }

    _cloneSubstackOnTarget(sourceBlocks, topBlockId, target) {
      const sourceGraph = this._collectStackGraph(sourceBlocks, topBlockId);
      if (sourceGraph.length === 0) return "";

      const validIds = new Set(sourceGraph.map(block => block.id));
      const idMap = new Map();
      for (const sourceBlock of sourceGraph) {
        idMap.set(sourceBlock.id, this._createEphemeralBlockId(sourceBlock.id));
      }

      const remapId = blockId => {
        if (!blockId || !validIds.has(blockId)) return null;
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

    _ensureTags(target) {
      if (!target) return;
      if (!Array.isArray(target.tags)) target.tags = [];
    }

    _notifyTagsChanged(target) {
      if (!target) return;

      const payload = {
        targetId: target.id,
        tags: Clone(target.tags || [])
      };

      this.runtime.requestTargetsUpdate(target);
      this.vm.emit("SPRITE_TAGS_CHANGED", payload);
      this.runtime.emit("TARGETS_UPDATE", false);
      this.vm.emitTargetsUpdate(false);
      this.runtime.emitProjectChanged();
    }
  }

  Scratch.extensions.register(new UnsandboxedClonesPlusBlocks());
})(Scratch);