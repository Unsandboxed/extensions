(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const stringUtil = Scratch.UnsandboxedMod.Strings;
  const translate = Scratch.translate;

  /**
   * Unsandboxed blocks for temporary lists stored on the executing thread, runtime, target, or sprite.
   * @constructor
   */
  class UnsandboxedTemporaryListsBlocks {
    /**
     * Extension id used to prefix all block opcodes.
     * @type {string}
     */
    static extensionId = "usbTemporaryLists";

    /**
     * Supported temporary-list storage scopes.
     * @type {string[]}
     */
    static listTypeValues = [
      "thread",
      "runtime",
      "target",
      "targetParentAndClones"
    ];

    /**
     * Runtime-level store key for lists.
     * @type {string}
     */
    static runtimeListsKey = "__usbTemporaryDataRuntimeLists";

    /**
     * Runtime registry key for remembered list scope by name.
     * @type {string}
     */
    static runtimeTypeRegistryKey = "__usbTemporaryDataListTypeRegistry";

    /**
     * Per-target store key for lists.
     * @type {string}
     */
    static targetListsKey = "__usbTemporaryDataTargetLists";

    /**
     * Shared sprite-and-clones store key for lists.
     * @type {string}
     */
    static spriteListsKey = "__usbTemporaryDataSpriteLists";

    /**
     * Non-strict list items getter opcode id.
     * @type {string}
     */
    static getOpcode = `${UnsandboxedTemporaryListsBlocks.extensionId}_getItems`;

    /**
     * Strict list items getter opcode id.
     * @type {string}
     */
    static getStrictOpcode = `${UnsandboxedTemporaryListsBlocks.extensionId}_getItemsStrict`;

    /**
     * Opcodes that declare/modify temporary lists.
     * @type {Set<string>}
     */
    static mutationOpcodes = new Set([
      `${UnsandboxedTemporaryListsBlocks.extensionId}_add`,
      `${UnsandboxedTemporaryListsBlocks.extensionId}_delete`,
      `${UnsandboxedTemporaryListsBlocks.extensionId}_deleteAll`,
      `${UnsandboxedTemporaryListsBlocks.extensionId}_insert`,
      `${UnsandboxedTemporaryListsBlocks.extensionId}_replace`
    ]);

    /**
     * Opcodes considered valid menu owners for context-sensitive lookups.
     * @type {Set<string>}
     */
    static menuOwnerOpcodes = new Set([
      `${UnsandboxedTemporaryListsBlocks.extensionId}_add`,
      `${UnsandboxedTemporaryListsBlocks.extensionId}_delete`,
      `${UnsandboxedTemporaryListsBlocks.extensionId}_deleteAll`,
      `${UnsandboxedTemporaryListsBlocks.extensionId}_insert`,
      `${UnsandboxedTemporaryListsBlocks.extensionId}_replace`,
      `${UnsandboxedTemporaryListsBlocks.extensionId}_contains`,
      `${UnsandboxedTemporaryListsBlocks.extensionId}_itemOfList`,
      `${UnsandboxedTemporaryListsBlocks.extensionId}_itemNumOfList`,
      `${UnsandboxedTemporaryListsBlocks.extensionId}_length`,
      UnsandboxedTemporaryListsBlocks.getOpcode,
      UnsandboxedTemporaryListsBlocks.getStrictOpcode
    ]);

    static initTemporaryLists(thread) {
      if (!thread.lists) {
        thread.lists = Object.create(null);
      }
      return thread.lists;
    }

    static initRuntimeLists(runtime) {
      if (!runtime[UnsandboxedTemporaryListsBlocks.runtimeListsKey]) {
        runtime[UnsandboxedTemporaryListsBlocks.runtimeListsKey] = Object.create(null);
      }
      return runtime[UnsandboxedTemporaryListsBlocks.runtimeListsKey];
    }

    static initRuntimeTypeRegistry(runtime) {
      if (!runtime[UnsandboxedTemporaryListsBlocks.runtimeTypeRegistryKey]) {
        runtime[UnsandboxedTemporaryListsBlocks.runtimeTypeRegistryKey] = Object.create(null);
      }
      return runtime[UnsandboxedTemporaryListsBlocks.runtimeTypeRegistryKey];
    }

    static initTargetLists(target) {
      if (!target) return null;
      if (!target[UnsandboxedTemporaryListsBlocks.targetListsKey]) {
        target[UnsandboxedTemporaryListsBlocks.targetListsKey] = Object.create(null);
      }
      return target[UnsandboxedTemporaryListsBlocks.targetListsKey];
    }

    static initSpriteLists(target) {
      if (!target) return null;
      const owner = target.sprite || target;
      if (!owner[UnsandboxedTemporaryListsBlocks.spriteListsKey]) {
        owner[UnsandboxedTemporaryListsBlocks.spriteListsKey] = Object.create(null);
      }
      return owner[UnsandboxedTemporaryListsBlocks.spriteListsKey];
    }

    static getExecutingBlockId(util, preferredOpcodes = null) {
      const container = util?.target?.blocks;
      const thread = util?.thread;

      const stackFrame = util?.thread?.peekStackFrame && util.thread.peekStackFrame();
      const fromFrameOp = stackFrame?.op?.id;
      if (typeof fromFrameOp === "string" && fromFrameOp) {
        if (!preferredOpcodes) {
          return fromFrameOp;
        }
        const opBlock = container ? container.getBlock(fromFrameOp) : null;
        if (!opBlock || preferredOpcodes.has(opBlock.opcode)) {
          return fromFrameOp;
        }
      }

      if (thread?.compatibilityStackFrame && Array.isArray(thread.stack)) {
        const compatibilityBlockId = thread.stack[0];
        if (typeof compatibilityBlockId === "string" && compatibilityBlockId) {
          if (!preferredOpcodes) {
            return compatibilityBlockId;
          }
          const compatibilityBlock = container ? container.getBlock(compatibilityBlockId) : null;
          if (!compatibilityBlock || preferredOpcodes.has(compatibilityBlock.opcode)) {
            return compatibilityBlockId;
          }
        }
      }

      if (container && thread && preferredOpcodes && Array.isArray(thread.stack)) {
        for (let i = thread.stack.length - 1; i >= 0; i--) {
          const blockId = thread.stack[i];
          const block = blockId ? container.getBlock(blockId) : null;
          if (block && preferredOpcodes.has(block.opcode)) {
            return blockId;
          }
        }
      }

      const fromPeekStack = util?.thread?.peekStack && util.thread.peekStack();
      if (typeof fromPeekStack === "string" && fromPeekStack) {
        return fromPeekStack;
      }

      return null;
    }

    static getListsByType(type, util, create = true) {
      const normalizedType = UnsandboxedTemporaryListsBlocks.normalizeListType(type);
      const thread = util?.thread || null;
      const target = util?.target || null;
      const runtime = target?.runtime || null;

      switch (normalizedType) {
      case "runtime":
        if (!runtime) return null;
        return create
          ? UnsandboxedTemporaryListsBlocks.initRuntimeLists(runtime)
          : (runtime[UnsandboxedTemporaryListsBlocks.runtimeListsKey] || null);
      case "target":
        if (!target) return null;
        return create
          ? UnsandboxedTemporaryListsBlocks.initTargetLists(target)
          : (target[UnsandboxedTemporaryListsBlocks.targetListsKey] || null);
      case "targetParentAndClones": {
        if (!target) return null;
        const owner = target.sprite || target;
        return create
          ? UnsandboxedTemporaryListsBlocks.initSpriteLists(target)
          : (owner[UnsandboxedTemporaryListsBlocks.spriteListsKey] || null);
      }
      case "thread":
      default:
        if (!thread) return null;
        return create
          ? UnsandboxedTemporaryListsBlocks.initTemporaryLists(thread)
          : (thread.lists || null);
      }
    }

    static getOrCreateList(listName, type, util, create = true) {
      const name = Cast.toString(listName);
      const lists = UnsandboxedTemporaryListsBlocks.getListsByType(type, util, create);
      if (!lists) return null;

      if (!lists[name]) {
        if (!create) return null;
        lists[name] = [];
      }

      if (util && util.target && util.target.runtime) {
        const typeRegistry = UnsandboxedTemporaryListsBlocks.initRuntimeTypeRegistry(util.target.runtime);
        typeRegistry[name] = type;
      }

      return lists[name];
    }

    static normalizeListType(value) {
      const casted = Cast.toString(value);
      return UnsandboxedTemporaryListsBlocks.listTypeValues.includes(casted) ? casted : "thread";
    }

    static resolveInputValue(container, block, inputName) {
      if (!container || !block) return "";

      const modelBlock = block.id && container.getBlock
        ? (container.getBlock(block.id) || block)
        : block;

      if (modelBlock.fields && modelBlock.fields[inputName]) {
        return Cast.toString(modelBlock.fields[inputName].value);
      }

      if (!modelBlock.inputs || !modelBlock.inputs[inputName]) return "";
      const input = modelBlock.inputs[inputName];
      const inputId = input.block || input.shadow;
      if (!inputId) return "";

      const inputBlock = container.getBlock(inputId);
      if (!inputBlock || !inputBlock.fields) return "";

      const fieldKey = Object.keys(inputBlock.fields)[0];
      if (!fieldKey || !inputBlock.fields[fieldKey]) return "";
      return Cast.toString(inputBlock.fields[fieldKey].value);
    }

    static resolveMenuOwnerBlock(container, sourceBlock, allowedOpcodes = null) {
      if (!container || !sourceBlock) return null;

      let modelBlock = sourceBlock.id && container.getBlock
        ? (container.getBlock(sourceBlock.id) || sourceBlock)
        : sourceBlock;

      while (modelBlock) {
        if (!allowedOpcodes || allowedOpcodes.has(modelBlock.opcode)) {
          return modelBlock;
        }
        if (!modelBlock.parent) break;
        modelBlock = container.getBlock(modelBlock.parent);
      }

      return null;
    }

    static collectScriptListEntries(container, scriptId) {
      const entries = [];
      if (!container || !scriptId) return entries;

      const seen = new Set();
      const blocks = Object.values(container._blocks)
        .filter(block => UnsandboxedTemporaryListsBlocks.mutationOpcodes.has(block.opcode))
        .filter(block => container.getTopLevelScript(block.id) === scriptId);

      for (const block of blocks) {
        const name = Cast.toString(UnsandboxedTemporaryListsBlocks.resolveInputValue(container, block, "LIST")).trim();
        const type = UnsandboxedTemporaryListsBlocks.normalizeListType(
          UnsandboxedTemporaryListsBlocks.resolveInputValue(container, block, "TYPE")
        );
        if (!name) continue;

        const key = `${type}|${name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({name, type});
      }

      return entries;
    }

    static collectWorkspaceListEntries(container) {
      const entries = [];
      if (!container || !container._blocks) return entries;

      const seen = new Set();
      const blocks = Object.values(container._blocks)
        .filter(block => UnsandboxedTemporaryListsBlocks.mutationOpcodes.has(block.opcode));

      for (const block of blocks) {
        const name = Cast.toString(UnsandboxedTemporaryListsBlocks.resolveInputValue(container, block, "LIST")).trim();
        const type = UnsandboxedTemporaryListsBlocks.normalizeListType(
          UnsandboxedTemporaryListsBlocks.resolveInputValue(container, block, "TYPE")
        );
        if (!name) continue;

        const key = `${type}|${name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({name, type});
      }

      return entries;
    }

    static collectScriptDeclarations(container, scriptId) {
      const declarations = new Map();
      const entries = UnsandboxedTemporaryListsBlocks.collectScriptListEntries(container, scriptId);

      for (const entry of entries) {
        const {name, type} = entry;
        if (!name) continue;

        if (!declarations.has(name)) {
          declarations.set(name, type);
        }
      }

      return declarations;
    }

    static resolveDeclaredType(name, util) {
      const listName = Cast.toString(name).trim();
      if (!listName) return null;

      const container = util?.target?.blocks;
      const blockId = UnsandboxedTemporaryListsBlocks.getExecutingBlockId(util, UnsandboxedTemporaryListsBlocks.menuOwnerOpcodes);
      if (!container || !blockId) return null;

      const scriptId = container.getTopLevelScript(blockId);
      const declarations = UnsandboxedTemporaryListsBlocks.collectScriptDeclarations(container, scriptId);
      if (declarations.has(listName)) {
        return declarations.get(listName);
      }

      const runtime = util?.target?.runtime;
      if (!runtime) return null;
      const typeRegistry = runtime[UnsandboxedTemporaryListsBlocks.runtimeTypeRegistryKey] || null;
      return typeRegistry && typeRegistry[listName] ? typeRegistry[listName] : null;
    }

    constructor() {
      /**
       * The Scratch Virtual Machine instance.
       * @type {VirtualMachine}
       */
      this.vm = Scratch.vm;

      /**
       * The runtime instantiating this block package.
       * @type {Runtime}
       */
      this.runtime = this.vm.runtime;
      this.blockly = null;
      this._strictSyncListenerAttached = false;

      if (Scratch.gui && Scratch.gui.getBlockly) {
        Scratch.gui.getBlockly().then(Blockly => {
          this.blockly = Blockly;

          const transformations = Blockly && Blockly.SecretTransformations;
          if (!transformations || typeof transformations.addGroup !== "function") {
            return;
          }

          const group = [
            UnsandboxedTemporaryListsBlocks.getOpcode,
            UnsandboxedTemporaryListsBlocks.getStrictOpcode
          ];

          const groups = transformations.groups_;
          const alreadyRegistered = Array.isArray(groups) && groups.some(existing => (
            Array.isArray(existing) &&
            existing.length === group.length &&
            existing.every((type, i) => type === group[i])
          ));

          if (!alreadyRegistered) {
            transformations.addGroup(group);
          }

          const workspace = Blockly && typeof Blockly.getMainWorkspace === "function"
            ? Blockly.getMainWorkspace()
            : null;
          const events = Blockly && Blockly.Events;
          if (!workspace || !events || this._strictSyncListenerAttached) {
            return;
          }

          workspace.addChangeListener(event => {
            if (!event || event.isUiEvent) return;
            if (event.type !== events.BLOCK_CHANGE) return;
            if (event.element !== "field" || event.name !== "TYPE") return;
            if (!event.blockId) return;

            this._syncStrictGetterListForBlockId(event.blockId, event.newValue);
          });

          this._strictSyncListenerAttached = true;
        });
      }
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedTemporaryListsBlocks.extensionId,
        name: translate("Temporary Lists"),
        color1: "#cc6600",
        color2: "#b85c00",
        color3: "#a35200",
        blocks: [
          {
            opcode: "activeLists",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("active [TYPE] lists"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "listTypes"
              }
            }
          },
          "---",
          {
            opcode: "add",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("add [ITEM] to [LIST] in [TYPE]"),
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thing")
              },
              LIST: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("list"),
                menu: "listsByType"
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "listTypes"
              }
            }
          },
          {
            opcode: "delete",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("delete [INDEX] of [LIST] in [TYPE]"),
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              },
              LIST: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("list"),
                menu: "listsByType"
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "listTypes"
              }
            }
          },
          {
            opcode: "deleteAll",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("delete all of [LIST] in [TYPE]"),
            arguments: {
              LIST: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("list"),
                menu: "listsByType"
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "listTypes"
              }
            }
          },
          {
            opcode: "insert",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("insert [ITEM] at [INDEX] of [LIST] in [TYPE]"),
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thing")
              },
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              },
              LIST: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("list"),
                menu: "listsByType"
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "listTypes"
              }
            }
          },
          {
            opcode: "replace",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("replace item [INDEX] of [LIST] in [TYPE] with [ITEM]"),
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              },
              LIST: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("list"),
                menu: "listsByType"
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "listTypes"
              },
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thing")
              }
            }
          },
          "---",
          {
            opcode: "itemOfList",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("item [INDEX] of [LIST] in [TYPE]"),
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              },
              LIST: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("list"),
                menu: "listsByType"
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "listTypes"
              }
            }
          },
          {
            opcode: "itemNumOfList",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("item # of [ITEM] in [LIST] in [TYPE]"),
            arguments: {
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thing")
              },
              LIST: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("list"),
                menu: "listsByType"
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "listTypes"
              }
            }
          },
          {
            opcode: "length",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("length of [LIST] in [TYPE]"),
            arguments: {
              LIST: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("list"),
                menu: "listsByType"
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "listTypes"
              }
            }
          },
          {
            opcode: "contains",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("[LIST] in [TYPE] contains [ITEM]?"),
            arguments: {
              LIST: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("list"),
                menu: "listsByType"
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "listTypes"
              },
              ITEM: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thing")
              }
            }
          },
          "---",
          {
            opcode: "getItems",
            color1: "#cc6600",
            color2: "#b85c00",
            color4: "#a35200",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("[LIST]"),
            arguments: {
              LIST: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("list"),
                menu: "listGetter"
              }
            }
          },
          {
            opcode: "getItemsStrict",
            color1: "#cc6600",
            color2: "#b85c00",
            color4: "#a35200",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("[LIST] in [TYPE]"),
            hideFromPalette: true,
            arguments: {
              LIST: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("list"),
                menu: "listsByType"
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "listTypes"
              }
            }
          },
          "---"
        ],
        menus: {
          lists: {
            items: "_getAccessibleLists",
            acceptReporters: true,
            acceptText: true
          },
          listsByType: {
            items: "_getAccessibleListsByType",
            acceptReporters: true,
            acceptText: true
          },
          listGetter: {
            items: "_getAccessibleLists",
            acceptReporters: true
          },
          listTypes: {
            items: "_listTypesMenu",
            acceptReporters: false
          }
        }
      };
    }

    _resolveDeclaredType(name, util) {
      return UnsandboxedTemporaryListsBlocks.resolveDeclaredType(name, util);
    }

    _findExistingTypesForName(name, util) {
      const listName = Cast.toString(name);
      if (!listName) return [];

      const types = [];
      for (const type of UnsandboxedTemporaryListsBlocks.listTypeValues) {
        const lists = UnsandboxedTemporaryListsBlocks.getListsByType(type, util, false);
        if (lists && Object.prototype.hasOwnProperty.call(lists, listName)) {
          types.push(type);
        }
      }
      return types;
    }

    _resolveTypeForName(name, util) {
      const listName = Cast.toString(name);
      if (!listName) return "thread";

      const declaredType = this._resolveDeclaredType(listName, util);
      if (declaredType) {
        return declaredType;
      }

      const existingTypes = this._findExistingTypesForName(listName, util);
      if (existingTypes.length > 0) {
        return existingTypes[0];
      }

      return "thread";
    }

    _typeLabel(type) {
      switch (type) {
      case "runtime":
        return translate("runtime");
      case "target":
        return translate("this target");
      case "targetParentAndClones":
        return translate("sprite + clones");
      case "thread":
      default:
        return translate("thread");
      }
    }

    _getListTypeItems() {
      return [
        {
          text: translate("thread"),
          value: "thread"
        },
        {
          text: translate("runtime"),
          value: "runtime"
        },
        {
          text: translate("this target"),
          value: "target"
        },
        {
          text: translate("sprite + clones"),
          value: "targetParentAndClones"
        }
      ];
    }

    _getFirstField(block, preferredName = null) {
      if (!block || typeof block.getField !== "function") return null;

      if (preferredName) {
        const preferred = block.getField(preferredName);
        if (preferred) return preferred;
      }

      if (!Array.isArray(block.inputList)) return null;
      for (const input of block.inputList) {
        const fields = input && Array.isArray(input.fieldRow) ? input.fieldRow : null;
        if (!fields) continue;
        for (const field of fields) {
          if (field && typeof field.getValue === "function" && typeof field.setValue === "function") {
            return field;
          }
        }
      }

      return null;
    }

    _ensureStrictTypeDependentMenu(targetId, typeSourceBlock) {
      if (!typeSourceBlock || typeof typeSourceBlock.getParent !== "function") return;

      const ownerBlock = typeSourceBlock.getParent();
      if (!ownerBlock || ownerBlock.type !== UnsandboxedTemporaryListsBlocks.getStrictOpcode) {
        return;
      }

      const typeField = this._getFirstField(typeSourceBlock, "TYPE");
      if (!typeField) {
        return;
      }

      if (typeField.__usbTemporaryListTypeValidatorInstalled) {
        return;
      }

      const previousValidator = typeof typeField.getValidator === "function"
        ? typeField.getValidator()
        : null;

      typeField.setValidator((acceptedType) => {
        let nextType = acceptedType;
        if (typeof previousValidator === "function") {
          nextType = previousValidator.call(typeField, acceptedType);
        }

        if (nextType === null) {
          return null;
        }

        this._syncStrictGetterListForOwner(targetId, ownerBlock, nextType);

        return nextType;
      });

      typeField.__usbTemporaryListTypeValidatorInstalled = true;
    }

    _listTypesMenu(targetId, menuState) {
      this._ensureStrictTypeDependentMenu(targetId, menuState && menuState.sourceBlock);
      return this._getListTypeItems();
    }

    _syncStrictGetterListForOwner(targetId, ownerBlock, forcedType = null) {
      if (!ownerBlock || ownerBlock.type !== UnsandboxedTemporaryListsBlocks.getStrictOpcode) {
        return;
      }

      const listMenuBlock = ownerBlock.getInputTargetBlock
        ? ownerBlock.getInputTargetBlock("LIST")
        : null;
      const listField = this._getFirstField(listMenuBlock, "LIST");
      if (!listField || typeof listField.getValue !== "function" || typeof listField.setValue !== "function") {
        return;
      }

      const validValues = this._getAccessibleListsByType(targetId, {
        sourceBlock: listMenuBlock || ownerBlock,
        forcedType,
        skipCurrentFallback: true
      })
        .map(option => (typeof option === "string" ? option : option.value))
        .filter(value => typeof value === "string" && value.length > 0);

      if (validValues.length === 0) {
        return;
      }

      const currentValue = Cast.toString(listField.getValue());
      if (!validValues.includes(currentValue)) {
        listField.setValue(validValues[0]);
      }
    }

    _syncStrictGetterListForBlockId(blockId, forcedType = null) {
      const target = this.runtime.getEditingTarget && this.runtime.getEditingTarget();
      if (!target || !target.blocks || !blockId) return;

      const modelBlock = target.blocks.getBlock(blockId);
      if (!modelBlock || modelBlock.opcode !== UnsandboxedTemporaryListsBlocks.getStrictOpcode) {
        return;
      }

      const workspace = this.blockly && this.blockly.getMainWorkspace
        ? this.blockly.getMainWorkspace()
        : null;
      if (!workspace || typeof workspace.getBlockById !== "function") return;

      const ownerBlock = workspace.getBlockById(blockId);
      if (!ownerBlock) return;

      this._syncStrictGetterListForOwner(target.id, ownerBlock, forcedType);
    }

    _parseGetterSelection(rawValue, util) {
      const raw = Cast.toString(rawValue).trim();
      if (!raw) {
        return {name: "", type: null};
      }

      for (const type of UnsandboxedTemporaryListsBlocks.listTypeValues) {
        const suffix = ` (${this._typeLabel(type)})`;
        if (!raw.endsWith(suffix)) continue;

        const baseName = raw.slice(0, raw.length - suffix.length).trim();
        if (!baseName) continue;

        const lists = UnsandboxedTemporaryListsBlocks.getListsByType(type, util, false);
        if (lists && Object.prototype.hasOwnProperty.call(lists, baseName)) {
          return {name: baseName, type};
        }
      }

      return {name: raw, type: null};
    }

    activeLists(args, util) {
      const selectedType = UnsandboxedTemporaryListsBlocks.normalizeListType(args.TYPE);
      const lists = UnsandboxedTemporaryListsBlocks.getListsByType(selectedType, util, false);
      if (!lists) return [];
      return Object.keys(lists).sort(stringUtil.compareStrings);
    }

    add(args, util) {
      const listName = Cast.toString(args.LIST);
      const requestedType = UnsandboxedTemporaryListsBlocks.normalizeListType(args.TYPE);
      const list = UnsandboxedTemporaryListsBlocks.getOrCreateList(listName, requestedType, util, true);
      if (!list) return;

      list.push(args.ITEM);
    }

    delete(args, util) {
      const listName = Cast.toString(args.LIST);
      const requestedType = UnsandboxedTemporaryListsBlocks.normalizeListType(args.TYPE);
      const list = UnsandboxedTemporaryListsBlocks.getOrCreateList(listName, requestedType, util, false);
      if (!list || list.length === 0) return;

      const index = Math.round(Cast.toNumber(args.INDEX));
      if (index === "all") {
        list.length = 0;
        return;
      }

      if (index < 1 || index > list.length) return;
      list.splice(index - 1, 1);
    }

    deleteAll(args, util) {
      const listName = Cast.toString(args.LIST);
      const requestedType = UnsandboxedTemporaryListsBlocks.normalizeListType(args.TYPE);
      const list = UnsandboxedTemporaryListsBlocks.getOrCreateList(listName, requestedType, util, false);
      if (!list) return;
      list.length = 0;
    }

    insert(args, util) {
      const listName = Cast.toString(args.LIST);
      const requestedType = UnsandboxedTemporaryListsBlocks.normalizeListType(args.TYPE);
      const list = UnsandboxedTemporaryListsBlocks.getOrCreateList(listName, requestedType, util, true);
      if (!list) return;

      const index = Math.round(Cast.toNumber(args.INDEX));
      if (index < 1 || index > list.length + 1) return;
      list.splice(index - 1, 0, args.ITEM);
    }

    replace(args, util) {
      const listName = Cast.toString(args.LIST);
      const requestedType = UnsandboxedTemporaryListsBlocks.normalizeListType(args.TYPE);
      const list = UnsandboxedTemporaryListsBlocks.getOrCreateList(listName, requestedType, util, false);
      if (!list || list.length === 0) return;

      const index = Math.round(Cast.toNumber(args.INDEX));
      if (index < 1 || index > list.length) return;
      list[index - 1] = args.ITEM;
    }

    itemOfList(args, util) {
      const listName = Cast.toString(args.LIST);
      const requestedType = UnsandboxedTemporaryListsBlocks.normalizeListType(args.TYPE);
      const list = UnsandboxedTemporaryListsBlocks.getOrCreateList(listName, requestedType, util, false);
      if (!list || list.length === 0) return "";

      const index = Math.round(Cast.toNumber(args.INDEX));
      if (index < 1 || index > list.length) return "";
      return list[index - 1];
    }

    itemNumOfList(args, util) {
      const listName = Cast.toString(args.LIST);
      const requestedType = UnsandboxedTemporaryListsBlocks.normalizeListType(args.TYPE);
      const list = UnsandboxedTemporaryListsBlocks.getOrCreateList(listName, requestedType, util, false);
      if (!list || list.length === 0) return 0;

      const targetItem = args.ITEM;
      for (let i = 0; i < list.length; i++) {
        if (String(list[i]) === String(targetItem)) {
          return i + 1;
        }
      }
      return 0;
    }

    length(args, util) {
      const listName = Cast.toString(args.LIST);
      const requestedType = UnsandboxedTemporaryListsBlocks.normalizeListType(args.TYPE);
      const list = UnsandboxedTemporaryListsBlocks.getOrCreateList(listName, requestedType, util, false);
      if (!list) return 0;
      return list.length;
    }

    contains(args, util) {
      const listName = Cast.toString(args.LIST);
      const requestedType = UnsandboxedTemporaryListsBlocks.normalizeListType(args.TYPE);
      const list = UnsandboxedTemporaryListsBlocks.getOrCreateList(listName, requestedType, util, false);
      if (!list || list.length === 0) return false;

      const targetItem = args.ITEM;
      for (let i = 0; i < list.length; i++) {
        if (String(list[i]) === String(targetItem)) {
          return true;
        }
      }
      return false;
    }

    getItems(args, util) {
      const parsed = this._parseGetterSelection(args.LIST, util);
      const name = parsed.name;
      const resolvedType = parsed.type || this._resolveTypeForName(name, util);
      const list = UnsandboxedTemporaryListsBlocks.getOrCreateList(name, resolvedType, util, true);
      if (!list) return "";
      return list.join(" ");
    }

    getItemsStrict(args, util) {
      const name = Cast.toString(args.LIST);
      const type = UnsandboxedTemporaryListsBlocks.normalizeListType(args.TYPE);
      const list = UnsandboxedTemporaryListsBlocks.getOrCreateList(name, type, util, true);
      if (!list) return "";
      return list.join(" ");
    }

    _getAccessibleLists(targetId, menuState) {
      const target = this.runtime.getTargetById(targetId);
      if (!target) return [""];

      const sourceBlock = menuState.sourceBlock;
      if (!sourceBlock) return [""];

      const container = target.blocks;
      const owner = UnsandboxedTemporaryListsBlocks.resolveMenuOwnerBlock(container, sourceBlock, UnsandboxedTemporaryListsBlocks.menuOwnerOpcodes);

      if (owner && owner.opcode === UnsandboxedTemporaryListsBlocks.getStrictOpcode) {
        return this._getAccessibleListsByType(targetId, menuState);
      }

      const ownerId = owner ? owner.id : sourceBlock.id;
      const script = container.getTopLevelScript(ownerId);

      const pairMap = new Map();
      const addPair = (name, type) => {
        const cleanName = Cast.toString(name).trim();
        const cleanType = UnsandboxedTemporaryListsBlocks.normalizeListType(type);
        if (!cleanName) return;
        const key = `${cleanType}|${cleanName}`;
        if (!pairMap.has(key)) {
          pairMap.set(key, {name: cleanName, type: cleanType});
        }
      };

      const entries = UnsandboxedTemporaryListsBlocks.collectScriptListEntries(container, script);
      for (const entry of entries) {
        addPair(entry.name, entry.type);
      }

      for (const entry of UnsandboxedTemporaryListsBlocks.collectWorkspaceListEntries(container)) {
        if (entry.type !== "thread") {
          addPair(entry.name, entry.type);
        }
      }

      for (const type of UnsandboxedTemporaryListsBlocks.listTypeValues) {
        if (type === "thread") continue;
        const lists = UnsandboxedTemporaryListsBlocks.getListsByType(type, {target}, false);
        if (!lists) continue;
        for (const name of Object.keys(lists)) {
          addPair(name, type);
        }
      }

      const groupsByName = new Map();
      for (const pair of pairMap.values()) {
        const list = groupsByName.get(pair.name) || [];
        list.push(pair.type);
        groupsByName.set(pair.name, list);
      }

      const options = [];
      for (const pair of pairMap.values()) {
        const group = groupsByName.get(pair.name) || [];
        if (group.length > 1) {
          options.push({
            text: `${pair.name} (${this._typeLabel(pair.type)})`,
            value: `${pair.name} (${this._typeLabel(pair.type)})`
          });
        } else {
          options.push({
            text: pair.name,
            value: pair.name
          });
        }
      }

      options.sort((a, b) => stringUtil.compareStrings(Cast.toString(a.text), Cast.toString(b.text)));

      const currentName = Cast.toString(
        UnsandboxedTemporaryListsBlocks.resolveInputValue(container, owner || sourceBlock, "LIST")
      ).trim();

      if (currentName && !options.some(option => option.value === currentName)) {
        const currentTypes = groupsByName.get(currentName) || [];
        if (currentTypes.length <= 1) {
          options.unshift({text: currentName, value: currentName});
        }
      }

      if (options.length === 0) return [""];
      return options;
    }

    _getAccessibleListsByType(targetId, menuState) {
      const target = this.runtime.getTargetById(targetId);
      if (!target) return [""];

      const sourceBlock = menuState.sourceBlock;
      if (!sourceBlock) return [""];

      const container = target.blocks;
      const owner = UnsandboxedTemporaryListsBlocks.resolveMenuOwnerBlock(container, sourceBlock, UnsandboxedTemporaryListsBlocks.menuOwnerOpcodes);
      const isStrictOwner = owner && owner.opcode === UnsandboxedTemporaryListsBlocks.getStrictOpcode;
      const ownerId = owner ? owner.id : sourceBlock.id;
      const script = container.getTopLevelScript(ownerId);
      const selectedType = UnsandboxedTemporaryListsBlocks.normalizeListType(
        (menuState && menuState.forcedType) ||
        UnsandboxedTemporaryListsBlocks.resolveInputValue(container, owner || sourceBlock, "TYPE") ||
        "thread"
      );

      const entries = UnsandboxedTemporaryListsBlocks.collectScriptListEntries(container, script);
      const valueSet = new Set();
      const values = [];
      for (const entry of entries) {
        if (entry.type === selectedType && entry.type && !valueSet.has(entry.name)) {
          values.push(entry.name);
          valueSet.add(entry.name);
        }
      }
      values.sort(stringUtil.compareStrings);

      if (selectedType !== "thread") {
        for (const entry of UnsandboxedTemporaryListsBlocks.collectWorkspaceListEntries(container)) {
          if (entry.type === selectedType && !valueSet.has(entry.name)) {
            values.push(entry.name);
            valueSet.add(entry.name);
          }
        }
        values.sort(stringUtil.compareStrings);
      }

      if (selectedType !== "thread") {
        const persisted = UnsandboxedTemporaryListsBlocks.getListsByType(selectedType, {target}, false);
        if (persisted) {
          for (const name of Object.keys(persisted)) {
            if (!valueSet.has(name)) {
              values.push(name);
              valueSet.add(name);
            }
          }
          values.sort(stringUtil.compareStrings);
        }
      }

      const currentName = Cast.toString(
        UnsandboxedTemporaryListsBlocks.resolveInputValue(container, owner || sourceBlock, "LIST")
      ).trim();

      if (!isStrictOwner && !menuState?.skipCurrentFallback && currentName && !valueSet.has(currentName)) {
        values.unshift(currentName);
      }

      if (isStrictOwner && currentName && !valueSet.has(currentName) && values.length > 0) {
        const listField = this._getFirstField(sourceBlock, "LIST");
        if (listField && typeof listField.setValue === "function") {
          listField.setValue(values[0]);
        }
      }

      if (values.length === 0) return [""];
      return values;
    }
  }

  Scratch.extensions.register(new UnsandboxedTemporaryListsBlocks());
})(Scratch);
