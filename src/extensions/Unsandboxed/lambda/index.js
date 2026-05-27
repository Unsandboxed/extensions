(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  class UnsandboxedLambdaBlocks {
    static extensionId = "usbLambda";

    constructor() {
      this.vm = Scratch.vm;
      this.runtime = this.vm.runtime;
    }

    getInfo() {
      return {
        id: UnsandboxedLambdaBlocks.extensionId,
        name: translate("Lambda"),
        color1: "#f39c6b",
        provides: {
          usbClonesPlus: [
            "runScriptInSprite"
          ]
        },
        blocks: [
          {
            opcode: "captureInlineFunction",
            blockType: Scratch.BlockType.OBJECT,
            text: translate("new function with args [PARAM]"),
            branchCount: 1,
            arguments: {
              PARAM: {
                type: Scratch.ArgumentType.PARAMETER,
                blockType: Scratch.BlockType.ARRAY,
                defaultValue: "arguments"
              }
            }
          },
          {
            opcode: "callWithArgs",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("call [FUNC] with args [ARGS]"),
            arguments: {
              FUNC: {
                type: Scratch.ArgumentType.OBJECT
              },
              ARGS: {
                type: Scratch.ArgumentType.ARRAY,
              }
            }
          },
          {
            opcode: "runWithArgs",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("run [FUNC] with args [ARGS]"),
            arguments: {
              FUNC: {
                type: Scratch.ArgumentType.OBJECT
              },
              ARGS: {
                type: Scratch.ArgumentType.ARRAY,
              }
            }
          },
          {
            opcode: "runScriptInSprite",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("run [SCRIPT] in [SPRITE]"),
            arguments: {
              SCRIPT: {
                type: Scratch.ArgumentType.OBJECT
              },
              SPRITE: {
                type: Scratch.ArgumentType.OBJECT
              }
            }
          },
          {
            opcode: "returnValue",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("return [VALUE]"),
            hideFromPalette: true,
            arguments: {
              VALUE: {
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
      const bundleArrayArgs = params.length === 1 && (
        parameterInput.opcode === "argument_reporter_array" ||
        params[0] === "arguments"
      );
      const serialized = this._serializeBranchStack(util);
      if (!serialized) {
        return "";
      }

      const lambdaPayload = {
        __usbLambda: true,
        type: "serialized-stack",
        params,
        bundleArrayArgs,
        serialized,
        targetId: util?.target?.id || ""
      };

      const scriptSource = `lambda(${params.join(", ")})`;
      return this._createScriptValue(scriptSource, lambdaPayload);
    }

    callWithArgs(args, util) {
      return this._invokeLambda(args, util, true);
    }

    runWithArgs(args, util) {
      return this._invokeLambda(args, util, false);
    }

    runScriptInSprite(args, util) {
      const fn = this._toLambdaObject(args.SCRIPT);
      if (!fn) {
        return;
      }

      const target = this._toSpriteTarget(args.SPRITE);
      if (!target) {
        return;
      }

      return this._runSerializedStackLambda(fn, [], util, target).then(() => undefined);
    }

    returnValue(args, util) {
      if (!util || !util.thread) {
        return;
      }

      util.thread.__usbLambdaReturn = typeof args.VALUE === "undefined" ? "" : args.VALUE;
      util.stopThisScript(true);
    }

    _invokeLambda(args, util, returnResult) {
      const fn = this._toLambdaObject(args.FUNC);
      if (!fn) {
        return returnResult ? "" : undefined;
      }

      const argValues = this._coerceInvocationArgs(args.ARGS);

      const result = this._runSerializedStackLambda(fn, argValues, util);
      if (result && typeof result.then === "function") {
        if (returnResult) {
          return result;
        }

        return result.then(() => undefined);
      }

      return returnResult ? result : undefined;
    }

    _coerceInvocationArgs(rawArgs) {
      if (Array.isArray(rawArgs)) {
        return rawArgs;
      }

      const castArray = Cast.toArray(rawArgs);
      if (castArray.length > 0) {
        return castArray;
      }

      const rawString = Cast.toString(rawArgs || "").trim();
      if (rawString.length > 0) {
        return [rawArgs];
      }

      return [];
    }

    _toLambdaObject(value) {
      const objectValue = Cast.toObject(value);
      if (!objectValue) {
        return null;
      }

      let lambdaCandidate = objectValue;
      if (
        this.runtime &&
        typeof this.runtime.getCustomTypeIdForValue === "function" &&
        this.runtime.getCustomTypeIdForValue(objectValue) === "script" &&
        objectValue.data &&
        typeof objectValue.data === "object"
      ) {
        lambdaCandidate = objectValue.data;
      }

      if (!lambdaCandidate || lambdaCandidate.__usbLambda !== true) {
        return null;
      }

      if (lambdaCandidate.type === "serialized-stack") {
        const serialized = this._validateSerializedStack(lambdaCandidate.serialized);
        if (!serialized) {
          return null;
        }

        return {
          type: "serialized-stack",
          params: this._parseParamNames(lambdaCandidate.params),
          bundleArrayArgs: !!lambdaCandidate.bundleArrayArgs,
          serialized,
          targetId: Cast.toString(lambdaCandidate.targetId || "")
        };
      }

      return null;
    }

    _createScriptValue(scriptSource, lambdaPayload) {
      const payload = {
        scriptId: this._createEphemeralBlockId("lambda"),
        source: scriptSource,
        data: lambdaPayload
      };

      if (this.runtime && typeof this.runtime.createBuiltInCustomTypeValue === "function") {
        const created = this.runtime.createBuiltInCustomTypeValue("script", payload);
        if (created && typeof created === "object") {
          return created;
        }
      }

      if (this.runtime && typeof this.runtime.createCustomTypeValue === "function") {
        const created = this.runtime.createCustomTypeValue("script", payload);
        if (created && typeof created === "object") {
          return created;
        }
      }

      if (this.runtime && typeof this.runtime.deserializeCustomTypeValue === "function") {
        const created = this.runtime.deserializeCustomTypeValue({
          type: "script",
          value: payload
        });
        if (created && typeof created === "object") {
          return created;
        }
      }

      return lambdaPayload;
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
        const normalizedOpcode = block.opcode === "procedures_return"
          ? `${UnsandboxedLambdaBlocks.extensionId}_returnValue`
          : block.opcode;
        const out = {
          id: localId,
          opcode: normalizedOpcode,
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

    _runSerializedStackLambda(fn, argValues, util, overrideTarget = null) {
      const runtime = this.runtime;
      const fallbackTarget = util?.target || null;
      const target = overrideTarget || runtime.getTargetById(fn.targetId) || fallbackTarget;
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

    _toSpriteTarget(inputSprite) {
      if (!inputSprite || typeof inputSprite !== "object") {
        return null;
      }

      const spriteId = Cast.toString(inputSprite.spriteId || "");
      if (spriteId) {
        const targetById = this.runtime.getTargetById(spriteId);
        if (targetById) {
          return targetById;
        }
      }

      return null;
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
