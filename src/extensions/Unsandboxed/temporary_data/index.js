(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const stringUtil = Scratch.UnsandboxedMod.Strings;
  const translate = Scratch.translate;

  /**
   * Unsandboxed blocks for temporary data stored on the executing thread.
   * @constructor
   */
  class UnsandboxedTemporaryDataBlocks {
    /**
     * The extension identifier of this block package.
     * @type {string}
     */
    /**
     * Extension id used to prefix all block opcodes.
     * @type {string}
     */
    static extensionId = "usbTemporaryData";

    /**
     * Supported temporary-variable storage scopes.
     * @type {string[]}
     */
    static variableTypeValues = [
      "thread",
      "runtime",
      "target",
      "targetParentAndClones"
    ];

    /**
     * Runtime-level store key.
     * @type {string}
     */
    static runtimeVariablesKey = "__usbTemporaryDataRuntimeVariables";

    /**
     * Runtime registry key for remembered variable scope by name.
     * @type {string}
     */
    static runtimeTypeRegistryKey = "__usbTemporaryDataTypeRegistry";

    /**
     * Per-target store key.
     * @type {string}
     */
    static targetVariablesKey = "__usbTemporaryDataTargetVariables";

    /**
     * Shared sprite-and-clones store key.
     * @type {string}
     */
    static spriteVariablesKey = "__usbTemporaryDataSpriteVariables";

    /**
     * Non-strict getter opcode id.
     * @type {string}
     */
    static getOpcode = `${UnsandboxedTemporaryDataBlocks.extensionId}_get`;

    /**
     * Strict getter opcode id.
     * @type {string}
     */
    static getStrictOpcode = `${UnsandboxedTemporaryDataBlocks.extensionId}_getStrict`;

    /**
     * Opcodes that declare/update temporary variables.
     * @type {Set<string>}
     */
    static mutationOpcodes = new Set([
      `${UnsandboxedTemporaryDataBlocks.extensionId}_set`,
      `${UnsandboxedTemporaryDataBlocks.extensionId}_change`
    ]);

    /**
     * Opcodes considered valid menu owners for context-sensitive lookups.
     * @type {Set<string>}
     */
    static menuOwnerOpcodes = new Set([
      `${UnsandboxedTemporaryDataBlocks.extensionId}_set`,
      `${UnsandboxedTemporaryDataBlocks.extensionId}_change`,
      UnsandboxedTemporaryDataBlocks.getOpcode,
      UnsandboxedTemporaryDataBlocks.getStrictOpcode
    ]);

    static initTemporaryVariables(thread) {
      if (!thread.variables) {
        thread.variables = Object.create(null);
      }
      return thread.variables;
    }

    static initRuntimeVariables(runtime) {
      if (!runtime[UnsandboxedTemporaryDataBlocks.runtimeVariablesKey]) {
        runtime[UnsandboxedTemporaryDataBlocks.runtimeVariablesKey] = Object.create(null);
      }
      return runtime[UnsandboxedTemporaryDataBlocks.runtimeVariablesKey];
    }

    static initRuntimeTypeRegistry(runtime) {
      if (!runtime[UnsandboxedTemporaryDataBlocks.runtimeTypeRegistryKey]) {
        runtime[UnsandboxedTemporaryDataBlocks.runtimeTypeRegistryKey] = Object.create(null);
      }
      return runtime[UnsandboxedTemporaryDataBlocks.runtimeTypeRegistryKey];
    }

    static initTargetVariables(target) {
      if (!target) return null;
      if (!target[UnsandboxedTemporaryDataBlocks.targetVariablesKey]) {
        target[UnsandboxedTemporaryDataBlocks.targetVariablesKey] = Object.create(null);
      }
      return target[UnsandboxedTemporaryDataBlocks.targetVariablesKey];
    }

    static initSpriteVariables(target) {
      if (!target) return null;
      const owner = target.sprite || target;
      if (!owner[UnsandboxedTemporaryDataBlocks.spriteVariablesKey]) {
        owner[UnsandboxedTemporaryDataBlocks.spriteVariablesKey] = Object.create(null);
      }
      return owner[UnsandboxedTemporaryDataBlocks.spriteVariablesKey];
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

    static setTemporaryVariable(value, name, thread, util, preferredType = null) {
      if (!thread) return value;

      const variableName = Cast.toString(name);
      const type = preferredType && UnsandboxedTemporaryDataBlocks.variableTypeValues.includes(preferredType)
        ? preferredType
        : (util && util.target && util.target.runtime
          ? UnsandboxedTemporaryDataBlocks.resolveDeclaredType(variableName, util) || "thread"
          : "thread");

      const variables = UnsandboxedTemporaryDataBlocks.getVariablesByType(
        type,
        (util || {thread}),
        true
      );
      if (!variables) return value;

      if (util && util.target && util.target.runtime) {
        const typeRegistry = UnsandboxedTemporaryDataBlocks.initRuntimeTypeRegistry(util.target.runtime);
        typeRegistry[variableName] = type;
      }

      variables[Cast.toString(name)] = value;
      return value;
    }

    static normalizeVariableType(value) {
      const casted = Cast.toString(value);
      return UnsandboxedTemporaryDataBlocks.variableTypeValues.includes(casted) ? casted : "thread";
    }

    static getVariablesByType(type, util, create = true) {
      const normalizedType = UnsandboxedTemporaryDataBlocks.normalizeVariableType(type);
      const thread = util?.thread || null;
      const target = util?.target || null;
      const runtime = target?.runtime || null;

      switch (normalizedType) {
      case "runtime":
        if (!runtime) return null;
        return create
          ? UnsandboxedTemporaryDataBlocks.initRuntimeVariables(runtime)
          : (runtime[UnsandboxedTemporaryDataBlocks.runtimeVariablesKey] || null);
      case "target":
        if (!target) return null;
        return create
          ? UnsandboxedTemporaryDataBlocks.initTargetVariables(target)
          : (target[UnsandboxedTemporaryDataBlocks.targetVariablesKey] || null);
      case "targetParentAndClones": {
        if (!target) return null;
        const owner = target.sprite || target;
        return create
          ? UnsandboxedTemporaryDataBlocks.initSpriteVariables(target)
          : (owner[UnsandboxedTemporaryDataBlocks.spriteVariablesKey] || null);
      }
      case "thread":
      default:
        if (!thread) return null;
        return create
          ? UnsandboxedTemporaryDataBlocks.initTemporaryVariables(thread)
          : (thread.variables || null);
      }
    }

    static resolveInputValue(container, block, inputName) {
      if (!container || !block) return "";

      const modelBlock = block.id && container.getBlock
        ? (container.getBlock(block.id) || block)
        : block;

      // Some argument values are stored directly as fields on the block.
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

    static collectScriptVariableEntries(container, scriptId) {
      const entries = [];
      if (!container || !scriptId) return entries;

      const seen = new Set();
      const blocks = Object.values(container._blocks)
        .filter(block => UnsandboxedTemporaryDataBlocks.mutationOpcodes.has(block.opcode))
        .filter(block => container.getTopLevelScript(block.id) === scriptId);

      for (const block of blocks) {
        const name = Cast.toString(UnsandboxedTemporaryDataBlocks.resolveInputValue(container, block, "VAR")).trim();
        const type = UnsandboxedTemporaryDataBlocks.normalizeVariableType(
          UnsandboxedTemporaryDataBlocks.resolveInputValue(container, block, "TYPE")
        );
        if (!name) continue;

        const key = `${type}|${name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({name, type});
      }

      return entries;
    }

    static collectWorkspaceVariableEntries(container) {
      const entries = [];
      if (!container || !container._blocks) return entries;

      const seen = new Set();
      const blocks = Object.values(container._blocks)
        .filter(block => UnsandboxedTemporaryDataBlocks.mutationOpcodes.has(block.opcode));

      for (const block of blocks) {
        const name = Cast.toString(UnsandboxedTemporaryDataBlocks.resolveInputValue(container, block, "VAR")).trim();
        const type = UnsandboxedTemporaryDataBlocks.normalizeVariableType(
          UnsandboxedTemporaryDataBlocks.resolveInputValue(container, block, "TYPE")
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
      const entries = UnsandboxedTemporaryDataBlocks.collectScriptVariableEntries(container, scriptId);

      for (const entry of entries) {
        const {name, type} = entry;
        if (!name) continue;

        // Keep first declaration to avoid ambiguity from duplicates in one script.
        if (!declarations.has(name)) {
          declarations.set(name, type);
        }
      }

      return declarations;
    }

    static resolveDeclaredType(name, util) {
      const variableName = Cast.toString(name).trim();
      if (!variableName) return null;

      const container = util?.target?.blocks;
      const blockId = UnsandboxedTemporaryDataBlocks.getExecutingBlockId(util, UnsandboxedTemporaryDataBlocks.menuOwnerOpcodes);
      if (!container || !blockId) return null;

      const scriptId = container.getTopLevelScript(blockId);
      const declarations = UnsandboxedTemporaryDataBlocks.collectScriptDeclarations(container, scriptId);
      if (declarations.has(variableName)) {
        return declarations.get(variableName);
      }

      const runtime = util?.target?.runtime;
      if (!runtime) return null;
      const typeRegistry = runtime[UnsandboxedTemporaryDataBlocks.runtimeTypeRegistryKey] || null;
      return typeRegistry && typeRegistry[variableName] ? typeRegistry[variableName] : null;
    }

    static getTemporaryVariableNameFromReporter(reporterBlock, util) {
      const varInputId = reporterBlock?.inputs?.VAR?.block;
      if (!varInputId) return "";

      const menuBlock = util?.target?.blocks?.getBlock(varInputId);
      if (!menuBlock || !menuBlock.fields) return "";

      const fieldKey = Object.keys(menuBlock.fields)[0];
      if (!fieldKey || !menuBlock.fields[fieldKey]) return "";
      return Cast.toString(menuBlock.fields[fieldKey].value);
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

      // Register shake-transform pair via exposed Blockly API from inside the extension.
      if (Scratch.gui && Scratch.gui.getBlockly) {
        Scratch.gui.getBlockly().then(Blockly => {
          this.blockly = Blockly;

          const transformations = Blockly && Blockly.SecretTransformations;
          if (!transformations || typeof transformations.addGroup !== "function") {
            return;
          }

          const group = [
            UnsandboxedTemporaryDataBlocks.getOpcode,
            UnsandboxedTemporaryDataBlocks.getStrictOpcode
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

            this._syncStrictGetterVarForBlockId(event.blockId, event.newValue);
          });

          this._strictSyncListenerAttached = true;
        });
      }
    };

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedTemporaryDataBlocks.extensionId,
        name: translate("Temporary Data"),
        color1: "#d72d47",
        blocks: [
          {
            opcode: "activeVariables",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("active [TYPE] variables"),
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "variableTypes"
              }
            }
          },
          "---",
          {
            opcode: "get",
            color1: "#d72d47",
            color2: "#d72d47",
            color4: "#d72d47",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("[VAR]"),
            arguments: {
              VAR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("variable"),
                menu: "variableGetter",
              },
            },
          },
          {
            opcode: "getStrict",
            color1: "#d72d47",
            color2: "#d72d47",
            color4: "#d72d47",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("[VAR] in [TYPE]"),
            hideFromPalette: true,
            arguments: {
              VAR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("variable"),
                menu: "variablesByType",
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "variableTypes"
              },
            },
          },
          {
            opcode: "set",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set [VAR] in [TYPE] to [VALUE]"),
            arguments: {
              VAR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("variable"),
                menu: "variablesByType",
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "variableTypes"
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
              },
            },
          },
          {
            opcode: "change",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("change [VAR] in [TYPE] by [VALUE]"),
            arguments: {
              VAR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("variable"),
                menu: "variablesByType",
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("thread"),
                menu: "variableTypes"
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1,
              },
            },
          },
          "---",
        ],
        menus: {
          variables: {
            items: "_getAccessibleVariables",
            acceptReporters: true,
            acceptText: true,
          },
          variablesByType: {
            items: "_getAccessibleVariablesByType",
            acceptReporters: true,
            acceptText: true,
          },
          variableGetter: {
            items: "_getAccessibleVariables",
            acceptReporters: true,
          },
          variableTypes: {
            items: "_variableTypesMenu",
            acceptReporters: false
          }
        }
      };
    };

    /**
     * Initialise variables for this thread.
     * @param {?Thread} thread The thread to initialise variables on.
     * @returns The variable object.
     */
    _initVariables(thread) {
      return UnsandboxedTemporaryDataBlocks.initTemporaryVariables(thread);
    };

    _resolveDeclaredType(name, util) {
      return UnsandboxedTemporaryDataBlocks.resolveDeclaredType(name, util);
    }

    _findExistingTypesForName(name, util) {
      const variableName = Cast.toString(name);
      if (!variableName) return [];

      const types = [];
      for (const type of UnsandboxedTemporaryDataBlocks.variableTypeValues) {
        const variables = UnsandboxedTemporaryDataBlocks.getVariablesByType(type, util, false);
        if (variables && Object.prototype.hasOwnProperty.call(variables, variableName)) {
          types.push(type);
        }
      }
      return types;
    }

    _resolveTypeForName(name, util) {
      const variableName = Cast.toString(name);
      if (!variableName) return "thread";

      const declaredType = this._resolveDeclaredType(variableName, util);
      if (declaredType) {
        return declaredType;
      }

      const existingTypes = this._findExistingTypesForName(variableName, util);
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

    _getVariableTypeItems() {
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
      if (!ownerBlock || ownerBlock.type !== UnsandboxedTemporaryDataBlocks.getStrictOpcode) {
        return;
      }

      const typeField = this._getFirstField(typeSourceBlock, "TYPE");
      if (!typeField) {
        return;
      }

      if (typeField.__usbTemporaryDataTypeValidatorInstalled) {
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

        this._syncStrictGetterVarForOwner(targetId, ownerBlock, nextType);

        return nextType;
      });

      typeField.__usbTemporaryDataTypeValidatorInstalled = true;
    }

    _variableTypesMenu(targetId, menuState) {
      this._ensureStrictTypeDependentMenu(targetId, menuState && menuState.sourceBlock);
      return this._getVariableTypeItems();
    }

    _syncStrictGetterVarForOwner(targetId, ownerBlock, forcedType = null) {
      if (!ownerBlock || ownerBlock.type !== UnsandboxedTemporaryDataBlocks.getStrictOpcode) {
        return;
      }

      const varMenuBlock = ownerBlock.getInputTargetBlock
        ? ownerBlock.getInputTargetBlock("VAR")
        : null;
      const varField = this._getFirstField(varMenuBlock, "VAR");
      if (!varField || typeof varField.getValue !== "function" || typeof varField.setValue !== "function") {
        return;
      }

      const validValues = this._getAccessibleVariablesByType(targetId, {
        sourceBlock: varMenuBlock || ownerBlock,
        forcedType,
        skipCurrentFallback: true
      })
        .map(option => (typeof option === "string" ? option : option.value))
        .filter(value => typeof value === "string" && value.length > 0);

      if (validValues.length === 0) {
        return;
      }

      const currentValue = Cast.toString(varField.getValue());
      if (!validValues.includes(currentValue)) {
        varField.setValue(validValues[0]);
      }
    }

    _syncStrictGetterVarForBlockId(blockId, forcedType = null) {
      const target = this.runtime.getEditingTarget && this.runtime.getEditingTarget();
      if (!target || !target.blocks || !blockId) return;

      const modelBlock = target.blocks.getBlock(blockId);
      if (!modelBlock || modelBlock.opcode !== UnsandboxedTemporaryDataBlocks.getStrictOpcode) {
        return;
      }

      const workspace = this.blockly && this.blockly.getMainWorkspace
        ? this.blockly.getMainWorkspace()
        : null;
      if (!workspace || typeof workspace.getBlockById !== "function") return;

      const ownerBlock = workspace.getBlockById(blockId);
      if (!ownerBlock) return;

      this._syncStrictGetterVarForOwner(target.id, ownerBlock, forcedType);
    }

    _parseGetterSelection(rawValue, util) {
      const raw = Cast.toString(rawValue).trim();
      if (!raw) {
        return {name: "", type: null};
      }

      // Parse human-readable disambiguation values like "name (runtime)".
      for (const type of UnsandboxedTemporaryDataBlocks.variableTypeValues) {
        const suffix = ` (${this._typeLabel(type)})`;
        if (!raw.endsWith(suffix)) continue;

        const baseName = raw.slice(0, raw.length - suffix.length).trim();
        if (!baseName) continue;

        // Treat as typed only if this typed variable exists; otherwise preserve literal name.
        const variables = UnsandboxedTemporaryDataBlocks.getVariablesByType(type, util, false);
        if (variables && Object.prototype.hasOwnProperty.call(variables, baseName)) {
          return {name: baseName, type};
        }
      }

      return {name: raw, type: null};
    }

    activeVariables(args, util) {
      const selectedType = UnsandboxedTemporaryDataBlocks.normalizeVariableType(args.TYPE);
      const variables = UnsandboxedTemporaryDataBlocks.getVariablesByType(selectedType, util, false);
      if (!variables) return [];
      return Object.keys(variables).sort(stringUtil.compareStrings);
    };

    set(args, util) {
      const name = Cast.toString(args.VAR);
      const requestedType = UnsandboxedTemporaryDataBlocks.normalizeVariableType(args.TYPE);
      UnsandboxedTemporaryDataBlocks.setTemporaryVariable(args.VALUE, name, util.thread, util, requestedType);
    };

    change(args, util) {
      const name = Cast.toString(args.VAR);
      const requestedType = UnsandboxedTemporaryDataBlocks.normalizeVariableType(args.TYPE);
      const writeVariables = UnsandboxedTemporaryDataBlocks.getVariablesByType(
        requestedType,
        util,
        true
      );
      if (!writeVariables) return;

      const castedValue = Cast.toNumber(writeVariables[name]);
      const dValue = Cast.toNumber(args.VALUE);
      const newValue = castedValue + dValue;
      UnsandboxedTemporaryDataBlocks.setTemporaryVariable(newValue, name, util.thread, util, requestedType);
    };

    get(args, util) {
      const parsed = this._parseGetterSelection(args.VAR, util);
      const name = parsed.name;
      const resolvedType = parsed.type || this._resolveTypeForName(name, util);
      const variables = UnsandboxedTemporaryDataBlocks.getVariablesByType(
        resolvedType,
        util,
        true
      );
      if (!variables) return "";
      return variables[name] ?? "";
    };

    getStrict(args, util) {
      const name = Cast.toString(args.VAR);
      const type = UnsandboxedTemporaryDataBlocks.normalizeVariableType(args.TYPE);
      const variables = UnsandboxedTemporaryDataBlocks.getVariablesByType(type, util, true);
      if (!variables) return "";
      return variables[name] ?? "";
    };

    /**
     * Menu constructor for all accessible thread variables.
     * @param {string} targetId The editing target this menu was initialised from.
     * @param {?object} menuState An object containing useful info about the menu.
     * @returns An array containing the known thread variables in this script.
     */
    _getAccessibleVariables(targetId, menuState) {
      const target = this.runtime.getTargetById(targetId);
      if (!target) return [""];

      const sourceBlock = menuState.sourceBlock;
      if (!sourceBlock) return [""];

      const container = target.blocks;
      const owner = UnsandboxedTemporaryDataBlocks.resolveMenuOwnerBlock(container, sourceBlock, UnsandboxedTemporaryDataBlocks.menuOwnerOpcodes);

      // If this menu is attached to the strict getter (including transformed blocks
      // that may still carry the generic getter VAR shadow), drive options from TYPE.
      if (owner && owner.opcode === UnsandboxedTemporaryDataBlocks.getStrictOpcode) {
        return this._getAccessibleVariablesByType(targetId, menuState);
      }

      const ownerId = owner ? owner.id : sourceBlock.id;
      const script = container.getTopLevelScript(ownerId);

      const pairMap = new Map();
      const addPair = (name, type) => {
        const cleanName = Cast.toString(name).trim();
        const cleanType = UnsandboxedTemporaryDataBlocks.normalizeVariableType(type);
        if (!cleanName) return;
        const key = `${cleanType}|${cleanName}`;
        if (!pairMap.has(key)) {
          pairMap.set(key, {name: cleanName, type: cleanType});
        }
      };

      const entries = UnsandboxedTemporaryDataBlocks.collectScriptVariableEntries(container, script);
      for (const entry of entries) {
        addPair(entry.name, entry.type);
      }

      // Non-thread declarations should be visible project-wide, not only in this stack.
      for (const entry of UnsandboxedTemporaryDataBlocks.collectWorkspaceVariableEntries(container)) {
        if (entry.type !== "thread") {
          addPair(entry.name, entry.type);
        }
      }

      // Non-thread stores can be inspected in menu context and should be offered too.
      for (const type of UnsandboxedTemporaryDataBlocks.variableTypeValues) {
        if (type === "thread") continue;
        const variables = UnsandboxedTemporaryDataBlocks.getVariablesByType(type, {target}, false);
        if (!variables) continue;
        for (const name of Object.keys(variables)) {
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
        UnsandboxedTemporaryDataBlocks.resolveInputValue(container, owner || sourceBlock, "VAR")
      ).trim();

      if (currentName && !options.some(option => option.value === currentName)) {
        const currentTypes = groupsByName.get(currentName) || [];
        // If a plain name now maps to multiple types, avoid re-inserting a third plain entry.
        if (currentTypes.length <= 1) {
          options.unshift({text: currentName, value: currentName});
        }
      }

      if (options.length === 0) return [""];
      return options;
    };

    _getAccessibleVariablesByType(targetId, menuState) {
      const target = this.runtime.getTargetById(targetId);
      if (!target) return [""];

      const sourceBlock = menuState.sourceBlock;
      if (!sourceBlock) return [""];

      const container = target.blocks;
      const owner = UnsandboxedTemporaryDataBlocks.resolveMenuOwnerBlock(container, sourceBlock, UnsandboxedTemporaryDataBlocks.menuOwnerOpcodes);
      const isStrictOwner = owner && owner.opcode === UnsandboxedTemporaryDataBlocks.getStrictOpcode;
      const ownerId = owner ? owner.id : sourceBlock.id;
      const script = container.getTopLevelScript(ownerId);
      const selectedType = UnsandboxedTemporaryDataBlocks.normalizeVariableType(
        (menuState && menuState.forcedType) ||
        UnsandboxedTemporaryDataBlocks.resolveInputValue(container, owner || sourceBlock, "TYPE") ||
        "thread"
      );

      const entries = UnsandboxedTemporaryDataBlocks.collectScriptVariableEntries(container, script);
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
        for (const entry of UnsandboxedTemporaryDataBlocks.collectWorkspaceVariableEntries(container)) {
          if (entry.type === selectedType && !valueSet.has(entry.name)) {
            values.push(entry.name);
            valueSet.add(entry.name);
          }
        }
        values.sort(stringUtil.compareStrings);
      }

      if (selectedType !== "thread") {
        const persisted = UnsandboxedTemporaryDataBlocks.getVariablesByType(selectedType, {target}, false);
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
        UnsandboxedTemporaryDataBlocks.resolveInputValue(container, owner || sourceBlock, "VAR")
      ).trim();

      if (!isStrictOwner && !menuState?.skipCurrentFallback && currentName && !valueSet.has(currentName)) {
        values.unshift(currentName);
      }

      if (isStrictOwner && currentName && !valueSet.has(currentName) && values.length > 0) {
        const varField = this._getFirstField(sourceBlock, "VAR");
        if (varField && typeof varField.setValue === "function") {
          varField.setValue(values[0]);
        }
      }

      if (values.length === 0) return [""];
      return values;
    }
  }

  Scratch.extensions.register(new UnsandboxedTemporaryDataBlocks());
})(Scratch);