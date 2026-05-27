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
        color1: "#FFAB19",
        color2: "#EC9C13",
        color3: "#CF8B17",
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
            opcode: "createCloneOfWithTagsThen",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("create clone of [TARGET] with tags [TAGS] then"),
            branchCount: 1,
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
            opcode: "runInTarget",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("in sprite [SPRITE] then"),
            branchCount: 1,
            arguments: {
              SPRITE: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          },
          "---",
          {
            opcode: "deleteClonesOf",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("delete clones for [TARGET]"),
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
            text: translate("delete clones for [TARGET] with any tag in [TAGS]"),
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
            text: translate("number of [TYPE] for [TARGET] with any tag in [TAGS]"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "types",
                defaultValue: "clone"
              },
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
          {
            opcode: "cloneCountOf",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("number of [TYPE] for [TARGET]"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "types",
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
            opcode: "thisTarget",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("this sprite")
          },
          {
            opcode: "targetFromMenu",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("sprite target [TARGET]"),
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "clonesOf",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("[TYPE] for [TARGET]"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "types",
                defaultValue: "clone"
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "clonesOfWithAnyTags",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("[TYPE] for [TARGET] with any tag in [TAGS]"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "types",
                defaultValue: "clone"
              },
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
          {
            opcode: "clonesOfTouchingMe",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("[TYPE] for [TARGET] touching me"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "types",
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
            opcode: "targetExists",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("sprite [SPRITE] exists?"),
            arguments: {
              SPRITE: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          },
          {
            opcode: "targetProperty",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("[PROPERTY] of [SPRITE]"),
            arguments: {
              PROPERTY: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetProperties",
                defaultValue: "x position"
              },
              SPRITE: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          },
          "---",
          {
            opcode: "deleteTarget",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("delete clone [SPRITE]"),
            arguments: {
              SPRITE: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          },
          {
            opcode: "stopScriptsInTarget",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("stop scripts in sprite [SPRITE]"),
            arguments: {
              SPRITE: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          },
          "---"
        ],
        menus: {
          types: {
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
                text: translate("any target"),
                value: "anything"
              }
            ]
          },
          targets: {
            acceptReporters: true,
            items: "_getTargets"
          },
          targetProperties: {
            acceptReporters: false,
            items: [
              "x position",
              "y position",
              "position",
              "direction",
              "costume #",
              "costume name",
              "size",
              "volume"
            ]
          }
        }
      };
    }

    cloneCountOf(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!target) return 0;
      return this._filterTargetsByType(target, args.TYPE).length;
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

    createCloneOfWithTagsThen(args, util) {
      const sourceTopBlockId = this._getBranchTopBlockId(util);
      if (!sourceTopBlockId) return;

      const sourceBlocks = util?.target?.blocks;
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!sourceBlocks || !target || target.isStage) return;

      const tags = this._parseTagArray(args.TAGS);
      const newClone = this._createCloneWithTags(target, tags);
      if (!newClone || !newClone.blocks) return;

      const clonedTopBlockId = this._cloneSubstackOnTarget(sourceBlocks, sourceTopBlockId, newClone);
      if (!clonedTopBlockId) return;

      return this._runThreadOnTarget(clonedTopBlockId, newClone);
    }

    runInTarget(args, util) {
      const sourceTopBlockId = this._getBranchTopBlockId(util);
      if (!sourceTopBlockId) return;

      const sourceBlocks = util?.target?.blocks;
      const target = this._toSpriteTarget(this._spriteArg(args));
      if (!sourceBlocks || !target || !target.blocks) return;

      const clonedTopBlockId = this._cloneSubstackOnTarget(sourceBlocks, sourceTopBlockId, target);
      if (!clonedTopBlockId) return;

      return this._runThreadOnTarget(clonedTopBlockId, target);
    }

    deleteClonesOfWithAnyTag(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!target) return;

      const tags = this._parseTagArray(args.TAGS);
      if (tags.length === 0) return;

      const candidates = this._filterTargetsByType(target, "clone");
      for (const candidate of candidates) {
        if (!candidate || candidate.isOriginal) continue;
        this._ensureTags(candidate);
        if (!tags.some(tag => candidate.tags.includes(tag))) continue;
        this.runtime.disposeTarget(candidate);
        this.runtime.stopForTarget(candidate);
      }
    }

    deleteClonesOf(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!target) return;

      const candidates = this._filterTargetsByType(target, "clone");
      for (const candidate of candidates) {
        if (!candidate || candidate.isOriginal) continue;
        this.runtime.disposeTarget(candidate);
        this.runtime.stopForTarget(candidate);
      }
    }

    cloneCountOfWithAnyTag(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!target) return 0;

      const tags = this._parseTagArray(args.TAGS);
      if (tags.length === 0) return 0;

      const candidates = this._filterTargetsByType(target, args.TYPE);
      return candidates.filter(candidate => {
        if (!candidate) return false;
        this._ensureTags(candidate);
        return tags.some(tag => candidate.tags.includes(tag));
      }).length;
    }

    thisTarget(args, util) {
      return util && util.target && typeof util.target.toValue === "function" ? util.target.toValue() : null;
    }

    targetFromMenu(args, util) {
      const target = this._getTargetFromMenu(Cast.toString(args.TARGET), util);
      return target && typeof target.toValue === "function" ? target.toValue() : null;
    }

    clonesOf(args, util) {
      const target = this._getTargetFromMenu(Cast.toString(args.TARGET), util);
      if (!target) {
        return [];
      }

      return this._filterTargetsByType(target, args.TYPE)
        .filter(candidate => candidate && typeof candidate.toValue === "function")
        .map(candidate => candidate.toValue());
    }

    clonesOfWithAnyTags(args, util) {
      const target = this._getTargetFromMenu(Cast.toString(args.TARGET), util);
      if (!target) {
        return [];
      }

      const tags = this._parseTagArray(args.TAGS);
      if (tags.length === 0) {
        return [];
      }

      return this._filterTargetsByType(target, args.TYPE)
        .filter(candidate => {
          if (!candidate || typeof candidate.toValue !== "function") {
            return false;
          }
          this._ensureTags(candidate);
          return tags.some(tag => candidate.tags.includes(tag));
        })
        .map(candidate => candidate.toValue());
    }

    clonesOfTouchingMe(args, util) {
      const currentTarget = util && util.target;
      if (!currentTarget) {
        return [];
      }

      const target = this._getTargetFromMenu(Cast.toString(args.TARGET), util);
      if (!target) {
        return [];
      }

      return this._filterTargetsByType(target, args.TYPE)
        .filter(candidate => this._isTouchingTarget(currentTarget, candidate))
        .map(candidate => candidate.toValue());
    }

    targetExists(args) {
      return this._toSpriteTarget(this._spriteArg(args)) !== null;
    }

    targetProperty(args) {
      const sprite = this._toSpriteTarget(this._spriteArg(args));
      if (!sprite) {
        return 0;
      }

      const property = Cast.toString(args.PROPERTY);
      if (sprite.isStage) {
        switch (property) {
        case "backdrop #":
          return sprite.currentCostume + 1;
        case "backdrop name":
          return sprite.getCostumes()[sprite.currentCostume].name;
        case "volume":
          return sprite.volume;
        }
      } else {
        switch (property) {
        case "position":
          return this.runtime.createBuiltInCustomTypeValue("position", [sprite.x, sprite.y]);
        case "x position":
          return sprite.x;
        case "y position":
          return sprite.y;
        case "direction":
          return sprite.direction;
        case "costume #":
          return sprite.currentCostume + 1;
        case "costume name":
          return sprite.getCostumes()[sprite.currentCostume].name;
        case "size":
          return sprite.size;
        case "volume":
          return sprite.volume;
        }
      }

      const variable = sprite.lookupVariableByNameAndType(property, "", true);
      if (variable) {
        return variable.value;
      }

      return 0;
    }

    deleteTarget(args) {
      const sprite = this._toSpriteTarget(this._spriteArg(args));
      if (!sprite || sprite.isOriginal) {
        return;
      }
      this.runtime.disposeTarget(sprite);
      this.runtime.stopForTarget(sprite);
    }

    stopScriptsInTarget(args) {
      const sprite = this._toSpriteTarget(this._spriteArg(args));
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

    _getTargetFromMenu(targetName, util) {
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
        this.runtime.getCustomTypeIdForValue(inputSprite) === "target"
      ) {
        return Cast.toString(inputSprite.spriteId || "");
      }

      return Cast.toString(inputSprite.spriteId || "");
    }

    _toSpriteTarget(inputSprite) {
      const spriteId = this._spriteIdFromAny(inputSprite);
      if (!spriteId) {
        return null;
      }
      return this.runtime.getTargetById(spriteId) || null;
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
