(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  class UnsandboxedLambdaBlocks {
    static extensionId = "usbLambda";

    constructor() {
      this.vm = Scratch.vm;
      this.runtime = this.vm.runtime;
      this._registerSecretTransformation();
    }

    _registerSecretTransformation() {
      if (!Scratch.gui || typeof Scratch.gui.getBlockly !== "function") {
        return;
      }

      Scratch.gui.getBlockly().then(Blockly => {
        if (!Blockly || !Blockly.SecretTransformations) {
          return;
        }

        const reporterType = `${UnsandboxedLambdaBlocks.extensionId}_runWithArgs`;
        const stackType = `${UnsandboxedLambdaBlocks.extensionId}_runWithArgsStack`;
        const groups = Array.isArray(Blockly.SecretTransformations.groups_)
          ? Blockly.SecretTransformations.groups_
          : [];

        const alreadyRegistered = groups.some(group =>
          Array.isArray(group) &&
          group.length === 2 &&
          group[0] === reporterType &&
          group[1] === stackType
        );

        if (!alreadyRegistered) {
          Blockly.SecretTransformations.addGroup([reporterType, stackType]);
        }
      }).catch(() => {
        // Ignore Blockly loading failures; extension functionality still works.
      });
    }

    getInfo() {
      return {
        id: UnsandboxedLambdaBlocks.extensionId,
        name: translate("Lambda"),
        color1: "#f39c6b",
        blocks: [
          {
            opcode: "captureInlineFunction",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("new function with args [PARAM]"),
            branchCount: 1,
            arguments: {
              PARAM: {
                type: Scratch.ArgumentType.PARAMETER,
                shape: Scratch.ArgumentType.ARRAY,
                defaultValue: "arguments"
              }
            }
          },
          {
            opcode: "run",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("run [FUNC] with [VALUE]"),
            arguments: {
              FUNC: {
                type: Scratch.ArgumentType.OBJECT
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "10"
              }
            }
          },
          {
            opcode: "runWithArgs",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("run [FUNC] with args [ARGS]"),
            arguments: {
              FUNC: {
                type: Scratch.ArgumentType.OBJECT
              },
              ARGS: {
                type: Scratch.ArgumentType.ARRAY
              }
            }
          },
          {
            // Hidden command form used as a transformation target for runWithArgs.
            opcode: "runWithArgsStack",
            func: "runWithArgsStack",
            blockType: Scratch.BlockType.COMMAND,
            hideFromPalette: true,
            text: translate("run [FUNC] with args [ARGS]"),
            arguments: {
              FUNC: {
                type: Scratch.ArgumentType.OBJECT
              },
              ARGS: {
                type: Scratch.ArgumentType.ARRAY
              }
            }
          },
          {
            opcode: "isFunction",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("is [FUNC] a function?"),
            arguments: {
              FUNC: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          }
        ]
      };
    }

    captureInlineFunction(args, util) {
      const parameterInput = this._getParameterInputDetails(util, "PARAM");
      const params = this._parseParamNames(
        parameterInput.name || args.PARAM
      );
      const bundleArrayArgs = parameterInput.opcode === "argument_reporter_array" && params.length === 1;
      const serialized = this._serializeBranchStack(util);
      if (!serialized) {
        return "";
      }

      return {
        __usbLambda: true,
        type: "serialized-stack",
        params,
        bundleArrayArgs,
        serialized,
        targetId: util?.target?.id || ""
      };
    }

    run(args, util) {
      return this.runWithArgs({
        FUNC: args.FUNC,
        ARGS: [args.VALUE]
      }, util);
    }

    runWithArgs(args, util) {
      const fn = this._toLambdaObject(args.FUNC);
      if (!fn) {
        return "";
      }

      let argValues = Cast.toArray(args.ARGS);
      if (argValues.length === 0) {
        const rawArgs = args.ARGS;
        if (Array.isArray(rawArgs)) {
          argValues = rawArgs;
        } else {
          const rawString = Cast.toString(rawArgs || "").trim();
          if (rawString.length > 0) {
            argValues = [rawArgs];
          }
        }
      }
      return this._runSerializedStackLambda(fn, argValues, util);
    }

    runWithArgsStack(args, util) {
      const result = this.runWithArgs(args, util);
      if (result && typeof result.then === "function") {
        return result.then(() => undefined);
      }
    }

    isFunction(args) {
      return !!this._toLambdaObject(args.FUNC);
    }

    _toLambdaObject(value) {
      const objectValue = Cast.toObject(value);
      if (!objectValue || objectValue.__usbLambda !== true) {
        return null;
      }

      if (objectValue.type === "serialized-stack") {
        const serialized = this._validateSerializedStack(objectValue.serialized);
        if (!serialized) {
          return null;
        }

        return {
          type: "serialized-stack",
          params: this._parseParamNames(objectValue.params),
          bundleArrayArgs: !!objectValue.bundleArrayArgs,
          serialized,
          targetId: Cast.toString(objectValue.targetId || "")
        };
      }

      return null;
    }

    _parseParamNames(rawValue) {
      let rawItems;
      if (Array.isArray(rawValue)) {
        rawItems = rawValue;
      } else {
        const parsedArray = Cast.toArray(rawValue);
        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          rawItems = parsedArray;
        } else {
          rawItems = Cast.toString(rawValue || "")
            .split(",")
            .map(item => item.trim())
            .filter(Boolean);
        }
      }

      const output = [];
      const seen = new Set();
      for (const item of rawItems) {
        const id = this._sanitizeIdentifier(item);
        if (!id || seen.has(id)) {
          continue;
        }
        seen.add(id);
        output.push(id);
      }

      if (output.length === 0) {
        output.push("x");
      }

      return output;
    }

    _getBranchTopBlockId(util) {
      if (!util || !util.thread || !util.target || !util.target.blocks) {
        return "";
      }

      const blockId = util.thread.peekStack && util.thread.peekStack();
      if (!blockId) {
        return "";
      }

      const block = util.target.blocks.getBlock(blockId);
      const substackInput = block?.inputs?.SUBSTACK;
      return substackInput?.block || "";
    }

    _serializeBranchStack(util) {
      if (!util || !util.target || !util.target.blocks) {
        return null;
      }

      const topBlockId = this._getBranchTopBlockId(util);
      if (!topBlockId) {
        return null;
      }

      return this._serializeStackGraph(util.target.blocks, topBlockId);
    }

    _serializeStackGraph(blockContainer, topBlockId) {
      const idMap = new Map();
      const serializedBlocks = [];
      let counter = 0;

      const assignLocalId = blockId => {
        if (idMap.has(blockId)) {
          return idMap.get(blockId);
        }

        counter += 1;
        const localId = `b${counter}`;
        idMap.set(blockId, localId);
        return localId;
      };

      const cloneValue = value => {
        if (value === null || typeof value === "undefined") {
          return value;
        }

        if (typeof value === "object") {
          return JSON.parse(JSON.stringify(value));
        }

        return value;
      };

      const walk = (blockId, parentLocalId) => {
        if (!blockId) {
          return null;
        }

        const block = blockContainer.getBlock(blockId);
        if (!block) {
          return null;
        }

        const existingLocalId = idMap.get(blockId);
        if (existingLocalId) {
          return existingLocalId;
        }

        const localId = assignLocalId(blockId);
        const out = {
          id: localId,
          opcode: block.opcode,
          next: null,
          parent: parentLocalId || null,
          inputs: {},
          fields: cloneValue(block.fields) || {},
          shadow: !!block.shadow,
          topLevel: false,
          mutation: cloneValue(block.mutation)
        };

        serializedBlocks.push(out);

        if (block.inputs && typeof block.inputs === "object") {
          const inputNames = Object.keys(block.inputs);
          for (const inputName of inputNames) {
            const inputData = block.inputs[inputName] || {};
            const serializedInput = cloneValue(inputData) || {};

            serializedInput.block = inputData.block ? walk(inputData.block, localId) : null;
            serializedInput.shadow = inputData.shadow ? walk(inputData.shadow, localId) : null;
            out.inputs[inputName] = serializedInput;
          }
        }

        out.next = block.next ? walk(block.next, localId) : null;

        return localId;
      };

      const serializedTopId = walk(topBlockId, null);
      if (!serializedTopId) {
        return null;
      }

      const topBlock = serializedBlocks.find(block => block.id === serializedTopId);
      if (topBlock) {
        topBlock.topLevel = true;
      }

      return {
        top: serializedTopId,
        blocks: serializedBlocks
      };
    }

    _validateSerializedStack(value) {
      if (!value || typeof value !== "object") {
        return null;
      }

      const top = Cast.toString(value.top || "").trim();
      const blocks = Array.isArray(value.blocks) ? value.blocks : null;
      if (!top || !blocks || blocks.length === 0) {
        return null;
      }

      const byId = new Map();
      for (const block of blocks) {
        if (!block || typeof block !== "object") {
          continue;
        }

        const id = Cast.toString(block.id || "").trim();
        const opcode = Cast.toString(block.opcode || "").trim();
        if (!id || !opcode || byId.has(id)) {
          continue;
        }

        byId.set(id, {
          id,
          opcode,
          next: block.next ? Cast.toString(block.next) : null,
          parent: block.parent ? Cast.toString(block.parent) : null,
          inputs: block.inputs && typeof block.inputs === "object" ? JSON.parse(JSON.stringify(block.inputs)) : {},
          fields: block.fields && typeof block.fields === "object" ? JSON.parse(JSON.stringify(block.fields)) : {},
          shadow: !!block.shadow,
          topLevel: !!block.topLevel,
          mutation: block.mutation && typeof block.mutation === "object" ? JSON.parse(JSON.stringify(block.mutation)) : null
        });
      }

      if (!byId.has(top)) {
        return null;
      }

      return {
        top,
        blocks: Array.from(byId.values())
      };
    }

    _createEphemeralBlockId(seed) {
      return `usbLambda_${seed}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }

    _instantiateSerializedStack(serialized, target) {
      const byLocalId = new Map(serialized.blocks.map(block => [block.id, block]));
      const runtimeIds = new Map();

      const getRuntimeId = localId => {
        if (runtimeIds.has(localId)) {
          return runtimeIds.get(localId);
        }

        const runtimeId = this._createEphemeralBlockId(localId);
        runtimeIds.set(localId, runtimeId);
        return runtimeId;
      };

      for (const localBlock of serialized.blocks) {
        const runtimeBlock = {
          ...localBlock,
          id: getRuntimeId(localBlock.id),
          parent: localBlock.parent ? getRuntimeId(localBlock.parent) : null,
          next: localBlock.next ? getRuntimeId(localBlock.next) : null,
          inputs: {},
          fields: localBlock.fields && typeof localBlock.fields === "object"
            ? JSON.parse(JSON.stringify(localBlock.fields))
            : {},
          mutation: localBlock.mutation && typeof localBlock.mutation === "object"
            ? JSON.parse(JSON.stringify(localBlock.mutation))
            : null,
          topLevel: localBlock.id === serialized.top
        };

        const inputNames = Object.keys(localBlock.inputs || {});
        for (const inputName of inputNames) {
          const inputData = localBlock.inputs[inputName] || {};
          const clonedInput = JSON.parse(JSON.stringify(inputData));

          clonedInput.block = inputData.block ? getRuntimeId(Cast.toString(inputData.block)) : null;
          clonedInput.shadow = inputData.shadow ? getRuntimeId(Cast.toString(inputData.shadow)) : null;
          runtimeBlock.inputs[inputName] = clonedInput;
        }

        target.blocks.createBlock(runtimeBlock);
      }

      return getRuntimeId(serialized.top);
    }

    _runSerializedStackLambda(fn, argValues, util) {
      const runtime = this.runtime;
      const fallbackTarget = util?.target || null;
      const target = runtime.getTargetById(fn.targetId) || fallbackTarget;
      if (!target || !target.blocks || !fn.serialized) {
        return "";
      }

      const topBlockId = this._instantiateSerializedStack(fn.serialized, target);
      if (!topBlockId || !target.blocks.getBlock(topBlockId)) {
        return "";
      }

      const thread = runtime._pushThread(topBlockId, target, {stackClick: false});
      thread.__usbLambdaMode = true;
      thread.initParams();
      if (fn.bundleArrayArgs && fn.params.length === 1) {
        thread.pushParam(fn.params[0], argValues);
      } else {
        for (let i = 0; i < fn.params.length; i++) {
          thread.pushParam(fn.params[i], i < argValues.length ? argValues[i] : "");
        }
      }

      return new Promise(resolve => {
        const cleanup = () => {
          runtime.removeListener("AFTER_EXECUTE", handleAfterExecute);

          if (target.blocks.getBlock(topBlockId)) {
            target.blocks.deleteBlock(topBlockId);
          }
        };

        const resolveFromThread = () => {
          let resolvedValue;
          let hasResolvedValue = false;

          if (Object.prototype.hasOwnProperty.call(thread, "__usbLambdaReturn")) {
            resolvedValue = thread.__usbLambdaReturn;
            hasResolvedValue = true;
            delete thread.__usbLambdaReturn;
            delete thread.__usbLambdaMode;
          } else if (Array.isArray(thread.stackFrames)) {
            for (let i = thread.stackFrames.length - 1; i >= 0; i--) {
              const frame = thread.stackFrames[i];
              if (frame && Object.prototype.hasOwnProperty.call(frame, "returnValue")) {
                resolvedValue = frame.returnValue;
                hasResolvedValue = true;
                delete thread.__usbLambdaMode;
                break;
              }
            }
          }

          if (!hasResolvedValue && thread.justReported !== null && typeof thread.justReported !== "undefined") {
            resolvedValue = thread.justReported;
            hasResolvedValue = true;
            delete thread.__usbLambdaMode;
          }

          cleanup();

          if (hasResolvedValue) {
            resolve(resolvedValue);
            return;
          }

          delete thread.__usbLambdaMode;
          resolve("");
        };

        const handleAfterExecute = () => {
          if (!runtime.isActiveThread(thread)) {
            resolveFromThread();
          }
        };

        runtime.on("AFTER_EXECUTE", handleAfterExecute);
      });
    }

    _sanitizeIdentifier(name) {
      const id = Cast.toString(name).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) {
        return "";
      }
      return id;
    }

    _getParameterInputDetails(util, inputName) {
      const blockId = util?.thread?.peekStack && util.thread.peekStack();
      const currentBlock = blockId ? util?.target?.blocks?.getBlock(blockId) : null;
      const input = currentBlock?.inputs?.[inputName];
      const reporterId = input?.block || input?.shadow;
      if (!reporterId) {
        return {
          name: "",
          opcode: ""
        };
      }

      const reporterBlock = util?.target?.blocks?.getBlock(reporterId);
      const opcode = reporterBlock?.opcode;
      if (
        opcode !== "argument_reporter_string_number" &&
        opcode !== "argument_reporter_boolean" &&
        opcode !== "argument_reporter_array" &&
        opcode !== "argument_reporter_object"
      ) {
        return {
          name: "",
          opcode: ""
        };
      }

      return {
        name: Cast.toString(reporterBlock?.fields?.VALUE?.value || "").trim(),
        opcode
      };
    }
  }

  Scratch.extensions.register(new UnsandboxedLambdaBlocks());
})(Scratch);
