(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const Clone = Scratch.UnsandboxedMod.Clone.structured;
  const uid = Scratch.UnsandboxedMod.helpers.uid;
  const translate = Scratch.translate;

  class UnsandboxedSpriteTags {
    static extensionId = "usbSpriteTags";

    constructor() {
      this.vm = Scratch.vm;
      this.runtime = this.vm.runtime;
    }

    getInfo() {
      return {
        id: UnsandboxedSpriteTags.extensionId,
        name: translate("Sprite Tags"),
        color1: "#5cb1d6",
        provides: {
          usbClonesPlus: [
            "createCloneOfWithTags",
            "createCloneOfWithTagsThen",
            "---",
            "deleteClonesOfWithAnyTag",
            "cloneCountOfWithAnyTag",
            "clonesOfWithAnyTags",
            "---",
            "addTagsToTarget",
            "removeTagsFromTarget",
            "tagsOfTarget"
          ]
        },
        blocks: [
          {
            opcode: "addTag",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("add tag [TAG] to [TARGET]"),
            arguments: {
              TAG: {
                type: Scratch.ArgumentType.STRING
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "removeTag",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("remove tag [TAG] from [TARGET]"),
            arguments: {
              TAG: {
                type: Scratch.ArgumentType.STRING
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "removeAllTags",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("remove all tags from [TARGET]"),
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          "---",
          {
            opcode: "setTagsOfSprite",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set sprite tags of [TARGET] to [ARRAY]"),
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY
              }
            }
          },
          {
            opcode: "getTagsOfSprite",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("sprite tags of [TARGET]"),
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              }
            }
          },
          {
            opcode: "addTagsToTarget",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("add sprite tags [TAGS] to [SPRITE]"),
            hideFromPalette: true,
            arguments: {
              TAGS: {
                type: Scratch.ArgumentType.ARRAY
              },
              SPRITE: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          },
          {
            opcode: "removeTagsFromTarget",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("remove sprite tags [TAGS] from [SPRITE]"),
            hideFromPalette: true,
            arguments: {
              TAGS: {
                type: Scratch.ArgumentType.ARRAY
              },
              SPRITE: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          },
          {
            opcode: "tagsOfTarget",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("sprite tags of [SPRITE]"),
            hideFromPalette: true,
            arguments: {
              SPRITE: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          },
          {
            opcode: "createCloneOfWithTags",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("create clone of [TARGET] with tags [TAGS]"),
            hideFromPalette: true,
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
            opcode: "createCloneOfWithTagsThen",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("create clone of [TARGET] with tags [TAGS] then"),
            hideFromPalette: true,
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
            opcode: "deleteClonesOfWithAnyTag",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("delete clones of [TARGET] with any tag in [TAGS]"),
            hideFromPalette: true,
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
            text: translate("number of [TYPE] of [TARGET] with any tag in [TAGS]"),
            hideFromPalette: true,
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
          {
            opcode: "clonesOfWithAnyTags",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("[TYPE] of [TARGET] with any tag in [TAGS]"),
            hideFromPalette: true,
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
            opcode: "touchingTargetWithTag",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("touching [TYPE] of [TARGET] with tag [TAG]?"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "types"
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets"
              },
              TAG: {
                type: Scratch.ArgumentType.STRING
              }
            }
          },
          {
            opcode: "touchingWithTag",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("touching [TYPE] with tag [TAG]?"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "types"
              },
              TAG: {
                type: Scratch.ArgumentType.STRING
              }
            }
          }
        ],
        menus: {
          types: {
            acceptReporters: false,
            items: [
              {
                text: translate("parent"),
                value: "parent"
              },
              {
                text: translate("clone"),
                value: "clone"
              },
              {
                text: translate("anything"),
                value: "anything"
              }
            ]
          },
          targets: {
            acceptReporters: true,
            items: "_getTargets"
          }
        }
      };
    }

    addTag(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const tag = Cast.toString(args.TAG).trim();
      const target = this._getTargetFromMenu(targetName, util);
      if (!target) return;

      this._ensureTags(target);
      if (target.tags.includes(tag) || tag === "") return;

      target.tags.push(tag);
      this._notifyTagsChanged(target);
    }

    removeTag(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const tag = Cast.toString(args.TAG).trim();
      const target = this._getTargetFromMenu(targetName, util);
      if (!target) return;

      this._ensureTags(target);
      if (!target.tags.includes(tag)) return;

      const index = target.tags.indexOf(tag);
      target.tags.splice(index, 1);
      this._notifyTagsChanged(target);
    }

    removeAllTags(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!target) return;

      this._ensureTags(target);
      if (target.tags.length === 0) return;
      target.tags = [];
      this._notifyTagsChanged(target);
    }

    setTagsOfSprite(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!target) return;

      const array = Cast.toArray(args.ARRAY)
        .map(tag => Cast.toString(tag).trim())
        .filter(tag => tag.length > 0);
      target.tags = Clone(array);
      this._notifyTagsChanged(target);
    }

    getTagsOfSprite(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);

      if (!target) return [];
        this._ensureTags(target);
        return Clone(target.tags);
    }

    addTagsToTarget(args) {
      const sprite = this._toSpriteTarget(this._spriteArg(args));
      if (!sprite) {
        return;
      }
      const tags = this._parseTagArray(args.TAGS);
      if (tags.length === 0) {
        return;
      }

      this._ensureTags(sprite);
      let changed = false;
      for (const tag of tags) {
        if (!sprite.tags.includes(tag)) {
          sprite.tags.push(tag);
          changed = true;
        }
      }
      if (changed) {
        this._notifyTagsChanged(sprite);
      }
    }

    removeTagsFromTarget(args) {
      const sprite = this._toSpriteTarget(this._spriteArg(args));
      if (!sprite) {
        return;
      }
      const tags = this._parseTagArray(args.TAGS);
      if (tags.length === 0) {
        return;
      }

      this._ensureTags(sprite);
      const before = sprite.tags.length;
      sprite.tags = sprite.tags.filter(tag => !tags.includes(tag));
      if (sprite.tags.length !== before) {
        this._notifyTagsChanged(sprite);
      }
    }

    tagsOfTarget(args) {
      const sprite = this._toSpriteTarget(this._spriteArg(args));
      if (!sprite) {
        return [];
      }
      this._ensureTags(sprite);
      return Clone(sprite.tags);
    }

    createCloneOfWithTags(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const target = this._getTargetFromMenu(targetName, util);
      if (!target || target.isStage) return;

      const tags = this._parseTagArray(args.TAGS);
      this._createCloneWithTags(target, tags);
    }

    createCloneOfWithTagsThen(args, util) {
      const sourceTopBlockId = this._getBranchTopBlockId(util);
      if (!sourceTopBlockId) return;

      const sourceBlocks = util && util.target && util.target.blocks;
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

    touchingTargetWithTag(args, util) {
      const targetName = Cast.toString(args.TARGET);
      const type = Cast.toString(args.TYPE);
      const tag = Cast.toString(args.TAG).trim();
      const target = this._getTargetFromMenu(targetName, util);
      if (!target || !this.vm.renderer) return false;
      if (!tag) return false;

      const spriteTargets = target.sprite && target.sprite.clones ? target.sprite.clones : [];
      const candidates = this._filterTargetsByTypeAndTag(spriteTargets, type, tag, target);
      const drawableCandidates = candidates.map(candidate => candidate.drawableID).filter(id => typeof id === "number");
      if (drawableCandidates.length === 0 || !util.target) return false;

      return this.vm.renderer.isTouchingDrawables(util.target.drawableID, drawableCandidates);
    }

    touchingWithTag(args, util) {
      const type = Cast.toString(args.TYPE);
      const tag = Cast.toString(args.TAG).trim();
      if (!this.vm.renderer || !tag || !util.target) return false;

      const candidates = this._filterTargetsByTypeAndTag(this.runtime.targets, type, tag);
      const drawableCandidates = candidates.map(target => target.drawableID).filter(id => typeof id === "number");
      if (drawableCandidates.length === 0) return false;

      return this.vm.renderer.isTouchingDrawables(util.target.drawableID, drawableCandidates);
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
      this._ensureTags(target);
      return target;
    }

    _spriteArg(args) {
      return args.SPRITE || null;
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
      const blockId = util && util.thread && util.thread.peekStack && util.thread.peekStack();
      if (!blockId) return "";

      const block = util && util.target && util.target.blocks && util.target.blocks.getBlock(blockId);
      return (block && block.inputs && block.inputs.SUBSTACK && block.inputs.SUBSTACK.block) || "";
    }

    _createEphemeralBlockId(seed) {
      return `usbSpriteTags_${seed}_${uid()}`;
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
      if (!Array.isArray(target.tags)) {
        target.tags = [];
      }
    }

    _notifyTagsChanged(target) {
      if (!target) return;

      const payload = {
        targetId: target.id,
        tags: Clone(target.tags || [])
      };

      if (this.runtime && typeof this.runtime.requestTargetsUpdate === "function") {
        this.runtime.requestTargetsUpdate(target);
      }

      // Custom signal consumed by GUI to force-refresh target metadata.
      if (this.vm && typeof this.vm.emit === "function") {
        this.vm.emit("SPRITE_TAGS_CHANGED", payload);
      }

      // Fallback for contexts where VM helper methods are unavailable.
      if (this.runtime && typeof this.runtime.emit === "function") {
        this.runtime.emit("TARGETS_UPDATE", false);
      }

      if (this.vm && typeof this.vm.emitTargetsUpdate === "function") {
        this.vm.emitTargetsUpdate(false);
      }

      if (this.runtime && typeof this.runtime.emitProjectChanged === "function") {
        this.runtime.emitProjectChanged();
      }
    }

    _filterTargetsByTypeAndTag(targets, type, tag, parentTarget) {
      return targets.filter(target => {
        this._ensureTags(target);
        if (!target.tags.includes(tag)) {
          return false;
        }
        if (type === "parent") {
          if (parentTarget) {
            return target.id === parentTarget.id;
          }
          return target.isOriginal;
        }
        if (type === "clone") {
          return !target.isOriginal;
        }
        return true;
      });
    }
  }

  Scratch.extensions.register(new UnsandboxedSpriteTags());
})(Scratch);
