(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const Clone = Scratch.UnsandboxedMod.Clone.structured;
  const uid = Scratch.UnsandboxedMod.helpers.uid;
  const translate = Scratch.translate;
  const DEFER_CLONE_START_HATS_FLAG = "__usbClonesPlusDeferCloneStartHats";
  const DEFER_VANILLA_CLONE_START_FLAG = "__usbClonesPlusDeferVanillaCloneStart";

  class UnsandboxedClonesPlusBlocks {
    static extensionId = "usbClonesPlus";

    constructor() {
      this.vm = Scratch.vm;
      this.runtime = this.vm.runtime;

      this.runtime.on("targetWasCreated", newTarget => {
        if (!newTarget || newTarget.isOriginal) {
          return;
        }

        if (newTarget[DEFER_CLONE_START_HATS_FLAG]) {
          return;
        }

        this._fireCloneStartHats(newTarget);
      });
    }

    getInfo() {
      return {
        id: UnsandboxedClonesPlusBlocks.extensionId,
        name: translate("Clones Plus"),
        color1: "#FFAB19",
        color2: "#EC9C13",
        color3: "#CF8B17",
        blocks: [
          {
            opcode: "whenCloneStarts",
            blockType: Scratch.BlockType.HAT,
            text: translate("when I start as a clone and [CONDITION]"),
            filter: [Scratch.TargetType.SPRITE],
            isEdgeActivated: false,
            arguments: {
              CLONE: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "clone"
              },
              CONDITION: {
                type: Scratch.ArgumentType.BOOLEAN
              }
            }
          },
          {
            opcode: "whenCloneOfSpriteStarts",
            blockType: Scratch.BlockType.HAT,
            text: translate("when [CLONE] of [TARGET] is created"),
            filter: [Scratch.TargetType.SPRITE],
            shouldRestartExistingThreads: true,
            isEdgeActivated: false,
            arguments: {
              CLONE: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "clone"
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          "---",
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
            opcode: "runInTarget",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("in sprite [SPRITE] then"),
            branchCount: 1,
            arguments: {
              SPRITE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          "---",
          {
            opcode: "thisTarget",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("this sprite")
          },
          {
            opcode: "targetFromMenu",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("sprite target [TARGET]"),
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          "---",
          {
            opcode: "targetExists",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("sprite [SPRITE] exists?"),
            arguments: {
              SPRITE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "targetIsType",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("[SPRITE] is [TYPE]?"),
            arguments: {
              SPRITE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "typesSingularWithDeleted",
                defaultValue: "clone"
              }
            }
          },
          "---",
          {
            opcode: "clonesOf",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("[TYPE] of [TARGET]"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "typesPlural",
                defaultValue: "clone"
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "cloneCountOf",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("number of [TYPE] of [TARGET]"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "typesPlural",
                defaultValue: "clone"
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "projectTargetCount",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("number of [TYPE]"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "typesPlural",
                defaultValue: "clone"
              }
            }
          },
          {
            opcode: "projectTargets",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("all [TYPE]"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "typesPlural",
                defaultValue: "anything"
              }
            }
          },
          "---",
          {
            opcode: "clonesOfTouchingMe",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("[TYPE] of [TARGET] touching me"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "typesPlural",
                defaultValue: "clone"
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "targetTypeTouchingMe",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("touching [TYPE] of [TARGET]?"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "typesSingular",
                defaultValue: "clone"
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "distanceToNearestTargetType",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("distance to nearest [TYPE] of [TARGET]"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "typesSingular",
                defaultValue: "clone"
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          "---",
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
            opcode: "deleteTarget",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("delete clone [SPRITE]"),
            arguments: {
              SPRITE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "stopScriptsInTarget",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("stop scripts in sprite [SPRITE]"),
            arguments: {
              SPRITE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          }
        ],
        menus: {
          typesPlural: {
            acceptReporters: false,
            items: [
              {
                text: translate("clones"),
                value: "clone"
              },
              {
                text: translate("parent"),
                value: "parent"
              },
              {
                text: translate("alive targets"),
                value: "anything"
              }
            ]
          },
          typesSingular: {
            acceptReporters: false,
            items: [
              {
                text: translate("clone"),
                value: "clone"
              },
              {
                text: translate("parent"),
                value: "parent"
              },
              {
                text: translate("alive"),
                value: "anything"
              }
            ]
          },
          targets: {
            acceptReporters: true,
            items: "_getTargets"
          },
          typesSingularWithDeleted: {
            acceptReporters: false,
            items: [
              {
                text: translate("clone"),
                value: "clone"
              },
              {
                text: translate("parent"),
                value: "parent"
              },
              {
                text: translate("alive"),
                value: "anything"
              },
              {
                text: translate("deleted"),
                value: "deleted"
              }
            ]
          },
        }
      };
    }

    whenCloneStarts(args, util) {
      if (!util || !util.target || util.target.isOriginal) {
        return false;
      }
      return Cast.toBoolean(args.CONDITION);
    }

    whenCloneOfSpriteStarts() {
      return true;
    }

    cloneCountOf(args, util) {
      const target = this._getTargetFromMenu(args.TARGET, util);
      if (!target) return 0;
      return this._filterTargetsByType(target, args.TYPE).length;
    }

    createCloneOfThen(args, util) {
      const sourceTopBlockId = this._getBranchTopBlockId(util);
      if (!sourceTopBlockId) return;

      const sourceBlocks = util?.target?.blocks;
      const target = this._getTargetFromMenu(args.TARGET, util);
      if (!sourceBlocks || !target || target.isStage) return;

      const newClone = this._createCloneWithTags(target, [], {
        deferCloneStartHats: true,
        deferVanillaCloneStart: true
      });
      if (!newClone || !newClone.blocks) return;

      const clonedTopBlockId = this._cloneSubstackOnTarget(sourceBlocks, sourceTopBlockId, newClone);
      if (!clonedTopBlockId) return;

      return this._runThreadOnTarget(clonedTopBlockId, newClone, () => {
        this._fireDeferredVanillaCloneStart(newClone);
        delete newClone[DEFER_CLONE_START_HATS_FLAG];
        this._fireCloneStartHats(newClone);
      });
    }

    runInTarget(args, util) {
      const sourceTopBlockId = this._getBranchTopBlockId(util);
      if (!sourceTopBlockId) return;

      const sourceBlocks = util?.target?.blocks;
      const target = this._toSpriteTarget(this._spriteArg(args), util);
      if (!sourceBlocks || !target || !target.blocks) return;

      const clonedTopBlockId = this._cloneSubstackOnTarget(sourceBlocks, sourceTopBlockId, target);
      if (!clonedTopBlockId) return;

      return this._runThreadOnTarget(clonedTopBlockId, target);
    }

    deleteClonesOf(args, util) {
      const target = this._getTargetFromMenu(args.TARGET, util);
      if (!target) return;

      const candidates = this._filterTargetsByType(target, "clone");
      for (const candidate of candidates) {
        if (!candidate || candidate.isOriginal) continue;
        this.runtime.disposeTarget(candidate);
        this.runtime.stopForTarget(candidate);
      }
    }

    thisTarget(args, util) {
      return util && util.target && typeof util.target.toValue === "function" ? util.target.toValue() : null;
    }

    targetFromMenu(args, util) {
      const target = this._getTargetFromMenu(args.TARGET, util);
      return target && typeof target.toValue === "function" ? target.toValue() : null;
    }

    clonesOf(args, util) {
      const target = this._getTargetFromMenu(args.TARGET, util);
      if (!target) {
        return [];
      }

      return this._filterTargetsByType(target, args.TYPE)
        .filter(candidate => candidate && typeof candidate.toValue === "function")
        .map(candidate => candidate.toValue());
    }

    clonesOfTouchingMe(args, util) {
      const currentTarget = util && util.target;
      if (!currentTarget) {
        return [];
      }

      const target = this._getTargetFromMenu(args.TARGET, util);
      if (!target) {
        return [];
      }

      return this._filterTargetsByType(target, args.TYPE)
        .filter(candidate => this._isTouchingTarget(currentTarget, candidate))
        .map(candidate => candidate.toValue());
    }

    targetExists(args, util) {
      return this._toSpriteTarget(this._spriteArg(args), util) !== null;
    }

    targetIsType(args, util) {
      const type = Cast.toString(args.TYPE || "clone").toLowerCase();
      const sprite = this._toSpriteTarget(this._spriteArg(args), util);
      if (!sprite) {
        return type === "deleted";
      }

      if (type === "clone") {
        return !sprite.isOriginal;
      }

      if (type === "parent") {
        return sprite.isOriginal;
      }

      if (type === "deleted") {
        return false;
      }

      return true;
    }

    targetTypeTouchingMe(args, util) {
      const currentTarget = util && util.target;
      if (!currentTarget) {
        return false;
      }

      const target = this._getTargetFromMenu(args.TARGET, util);
      if (!target) {
        return false;
      }

      return this._filterTargetsByType(target, args.TYPE)
        .some(candidate => this._isTouchingTarget(currentTarget, candidate));
    }

    distanceToNearestTargetType(args, util) {
      const currentTarget = util && util.target;
      if (!currentTarget) {
        return 10000;
      }

      const target = this._getTargetFromMenu(args.TARGET, util);
      if (!target) {
        return 10000;
      }

      var nearest = null;
      for (const candidate of this._filterTargetsByType(target, args.TYPE)) {
        if (!candidate || candidate.id === currentTarget.id) {
          continue;
        }
        const distance = this._distanceBetweenTargets(currentTarget, candidate);
        if (distance === null) {
          continue;
        }
        if (nearest === null || distance < nearest) {
          nearest = distance;
        }
      }

      return nearest === null ? 10000 : nearest;
    }

    projectTargetCount(args) {
      return this._projectTargetsByType(args.TYPE).length;
    }

    projectTargets(args) {
      return this._projectTargetsByType(args.TYPE)
        .filter(target => target && typeof target.toValue === "function")
        .map(target => target.toValue());
    }

    deleteTarget(args, util) {
      const sprite = this._toSpriteTarget(this._spriteArg(args), util);
      if (!sprite || sprite.isOriginal) {
        return;
      }
      this.runtime.disposeTarget(sprite);
      this.runtime.stopForTarget(sprite);
    }

    stopScriptsInTarget(args, util) {
      const sprite = this._toSpriteTarget(this._spriteArg(args), util);
      if (!sprite) {
        return;
      }
      this.runtime.stopForTarget(sprite);
    }

    _spriteArg(args) {
      return args.SPRITE || null;
    }

    _getTargets() {
      const spriteNames = [
        {text: translate("myself"), value: "_myself_"},
        {text: translate("stage"), value: "_stage_"}
      ];

      for (const target of this.runtime.targets) {
        if (target.isOriginal && !target.isStage) {
          const targetName = target.getName();
          spriteNames.push({text: targetName, value: targetName});
        }
      }

      return spriteNames;
    }

    _getTargetFromMenu(targetValue, util) {
      if (targetValue && typeof targetValue === "object") {
        const spriteTarget = this._toSpriteTarget(targetValue, util);
        if (spriteTarget) return spriteTarget;
      }

      const targetName = Cast.toString(targetValue);
      let target = this.runtime.getSpriteTargetByName(targetName);
      if (targetName === "_myself_") target = util && util.target;
      if (targetName === "_stage_") target = this.runtime.getTargetForStage();
      return target || null;
    }

    _filterTargetsByType(target, rawType) {
      const type = Cast.toString(rawType || "clone").toLowerCase();
      const spriteTargets = (target && target.sprite && Array.isArray(target.sprite.clones))
        ? target.sprite.clones.filter(Boolean)
        : [];

      if (spriteTargets.length === 0) {
        if (!target) {
          return [];
        }

        if (type === "clone") {
          return [];
        }

        return [target];
      }

      if (type === "parent") {
        return spriteTargets.filter(candidate => candidate.isOriginal);
      }

      if (type === "anything") {
        return spriteTargets;
      }

      return spriteTargets.filter(candidate => !candidate.isOriginal);
    }

    _spriteIdFromAny(inputSprite) {
      if (!inputSprite || typeof inputSprite !== "object") {
        return "";
      }

      if (
        this.runtime &&
        typeof this.runtime.getCustomTypeIdForValue === "function" &&
        (this.runtime.getCustomTypeIdForValue(inputSprite) === "sprite" ||
          this.runtime.getCustomTypeIdForValue(inputSprite) === "target")
      ) {
        return Cast.toString(inputSprite.spriteId || "");
      }

      return Cast.toString(inputSprite.spriteId || inputSprite.id || "");
    }

    _toSpriteTarget(inputSprite, util) {
      if (util && typeof util.resolveTarget === "function") {
        const resolved = util.resolveTarget(inputSprite);
        if (resolved) {
          return resolved;
        }
      }

      const spriteId = this._spriteIdFromAny(inputSprite);
      if (!spriteId) {
        if (typeof inputSprite === "string") {
          return this.runtime.getSpriteTargetByName(inputSprite) || null;
        }
        return null;
      }

      return this.runtime.getTargetById(spriteId) || this.runtime.getSpriteTargetByName(spriteId) || null;
    }

    _isTouchingTarget(currentTarget, candidate) {
      if (!this.vm.renderer || !currentTarget || !candidate) {
        return false;
      }
      if (candidate.id === currentTarget.id) {
        return false;
      }

      const currentDrawable = currentTarget.drawableID;
      const candidateDrawable = candidate.drawableID;
      if (typeof currentDrawable !== "number" || typeof candidateDrawable !== "number") {
        return false;
      }

      return this.vm.renderer.isTouchingDrawables(currentDrawable, [candidateDrawable]);
    }

    _distanceBetweenTargets(a, b) {
      if (!a || !b) {
        return null;
      }
      if (typeof a.x !== "number" || typeof a.y !== "number" ||
          typeof b.x !== "number" || typeof b.y !== "number") {
        return null;
      }

      var dx = a.x - b.x;
      var dy = a.y - b.y;
      return Math.sqrt((dx * dx) + (dy * dy));
    }

    _projectTargetsByType(rawType) {
      const type = Cast.toString(rawType || "clone").toLowerCase();
      const allTargets = Array.isArray(this.runtime.targets)
        ? this.runtime.targets.filter(target => target)
        : [];

      if (type === "stage") {
        return allTargets.filter(target => target.isStage);
      }

      const nonStageTargets = allTargets.filter(target => !target.isStage);
      if (type === "parent" || type === "sprite") {
        return nonStageTargets.filter(target => target.isOriginal);
      }
      if (type === "clone") {
        return nonStageTargets.filter(target => !target.isOriginal);
      }
      return nonStageTargets;
    }

    _createCloneWithTags(target, tags, options = {}) {
      const newClone = options.deferVanillaCloneStart
        ? this._makeCloneWithVanillaStartDeferred(target)
        : target.makeClone();
      if (!newClone) return null;

      if (options.deferCloneStartHats) {
        newClone[DEFER_CLONE_START_HATS_FLAG] = true;
      }

      this.runtime.addTarget(newClone);
      newClone.goBehindOther(target);
      newClone.tags = Clone(tags);
      this._notifyTagsChanged(newClone);
      return newClone;
    }

    _makeCloneWithVanillaStartDeferred(target) {
      const newClone = target.makeClone({deferCloneStartHats: true});
      if (newClone) {
        newClone[DEFER_VANILLA_CLONE_START_FLAG] = true;
      }
      return newClone;
    }

    _fireDeferredVanillaCloneStart(target) {
      if (!target || !target[DEFER_VANILLA_CLONE_START_FLAG]) {
        return;
      }

      delete target[DEFER_VANILLA_CLONE_START_FLAG];
      if (typeof target.startAsClone === "function") {
        target.startAsClone();
        return;
      }

      this.runtime.startHats("control_start_as_clone", null, target);
    }

    _fireCloneStartHats(newTarget) {
      if (!newTarget || newTarget.isOriginal) {
        return;
      }

      var cloneValue = newTarget.toValue ? newTarget.toValue() : null;
      const cloneStartThreads = this.runtime.startHats(
        `${UnsandboxedClonesPlusBlocks.extensionId}_whenCloneStarts`,
        {},
        newTarget,
        {clone: cloneValue}
      ) || [];

      for (const thread of cloneStartThreads) {
        this._drainThreadForCurrentFrame(thread);
      }

      var parentTarget =
        newTarget.sprite && Array.isArray(newTarget.sprite.clones)
          ? (newTarget.sprite.clones[0] || null)
          : null;
      if (!parentTarget) {
        return;
      }

      const cloneOfSpriteThreads = this.runtime.startHats(
        `${UnsandboxedClonesPlusBlocks.extensionId}_whenCloneOfSpriteStarts`,
        {TARGET: parentTarget.getName()},
        parentTarget,
        {clone: cloneValue}
      ) || [];

      for (const thread of cloneOfSpriteThreads) {
        this._drainThreadForCurrentFrame(thread);
      }
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

    _runThreadOnTarget(topBlockId, target, onComplete) {
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
            if (typeof onComplete === "function") {
              onComplete();
            }
            cleanup();
            resolve();
          }
        };

        this.runtime.on("AFTER_EXECUTE", handleAfterExecute);

        // Run as much of the spawned subthread as possible in this frame.
        // If it completes now, we'll resolve immediately and fire clone-start hats
        // in the same frame. If it blocks/yields, AFTER_EXECUTE will finish later.
        this._drainThreadForCurrentFrame(thread);

        if (!this.runtime.isActiveThread(thread)) {
          if (typeof onComplete === "function") {
            onComplete();
          }
          cleanup();
          resolve();
        }
      });
    }

    _drainThreadForCurrentFrame(thread) {
      const sequencer = this.runtime && this.runtime.sequencer;
      if (!thread || !sequencer || typeof sequencer.stepThread !== "function") {
        return;
      }

      let safety = 0;
      while (this.runtime.isActiveThread(thread) && safety < 256) {
        const ThreadClass = thread && thread.constructor;
        const STATUS_YIELD_TICK = ThreadClass && typeof ThreadClass.STATUS_YIELD_TICK === "number"
          ? ThreadClass.STATUS_YIELD_TICK
          : 3;
        const STATUS_RUNNING = ThreadClass && typeof ThreadClass.STATUS_RUNNING === "number"
          ? ThreadClass.STATUS_RUNNING
          : 0;

        // Resume single-tick yields immediately for this forced in-frame drain.
        if (thread.status === STATUS_YIELD_TICK) {
          thread.setStatus(STATUS_RUNNING);
        } else if (this.runtime.isWaitingThread(thread)) {
          break;
        }

        sequencer.stepThread(thread);
        safety++;
      }
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
