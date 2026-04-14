/**
 * This file represents a template for an unsandboxed.org extension.
 * (Yes, we know that's confusingly similar to unsandboxed extensions)
 * 
 * Its blocks are for demonstration purposes and should be replaced with your own functionality.
 * 
 * To create your own unsandboxed.org extension:
 * 1. Copy this file and its containing folder, renaming both the file and folder to match your extension's name.
 * 2. Update the class name, extensionId, and block definitions in getInfo() to reflect your extension's features.
 * 
 * Please see CONTRIBUTING.md for guidelines on contributing new extensions and blocks.
 */

(function (Scratch) {
  "use strict";

  /**
   * You are technically able to require other files for your extension, as
   * our extensions are built with webpack and support multiple modules. However, 
   * for simplicity we recommend keeping everything in this one file.
   * 
   * Do this only if your extension requires a lot of boilerplate, such as UI or
   * complex default presets/data, that would make the main file unmanageable.
   * Our development server is capable of dealing with this.
   */
  const manifest = require('./manifest.json');

  /**
   * Commonly used utility APIs tend to be referenced outside of the constructor.
   * This is mostly to avoid having to write `this.` repeatedly in block implementations.
   */
  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  const myBadFunction = () => {
    /**
     * Don't do this. All functions should be contained within the extension class.
     */
  };

  /**
   * Starter template for Unsandboxed extensions.
   * Rename this class, the extension id, and block opcodes for your extension.
   */
  class UnsandboxedTemplateBlocks {
    /**
     * Keep this in sync with manifest.json id.
     * The prefix should be unique to you, e.g. your username.
     * Any time the extension id is used in code, it should reference this static property.
     * @type {string}
     */
    static extensionId = "usbTemplate";

    /**
     * The constructor is called when the extension is instantiated by the Scratch VM.
     * You can set up any necessary state or references here.
     * any commonly accessed APIs should be referenced here for convenience.
     */
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
    }

    /**
     * An example of a helper function to resolve parameter names for loop blocks.
     * All helper functions should follow these rules:
     * - Be defined as methods on the class (not standalone functions).
     * - Be named with a leading underscore to indicate they are not block implementations.
     * - Be placed after the constructor and before getInfo() for consistency.
     * @param {object} util Block utility for the active execution context.
     * @param {string} inputName Input key to read (for example "ITEM").
     * @param {string} [fallback=""] Fallback label when the input is missing.
     * @returns {string} Resolved parameter label.
     */
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
     * getInfo is a required method that describes your extension's blocks and metadata.
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedTemplateBlocks.extensionId,
        name: translate("Template"),
        color1: "#4b7bec",
        blocks: [
          {
            opcode: "hello",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("say hello to [NAME]"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("world")
              }
            }
          },
          "---",
          {
            opcode: "forEachItem",
            blockType: Scratch.BlockType.LOOP,
            text: translate("for [ITEM] in [ARRAY]"),
            arguments: {
              ITEM: {
                /**
                 * This is a parameter input, which is like a custom block parameter
                 * that can be dragged and used as a block itself.
                 */
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: translate("item")
              },
              ARRAY: {
                /**
                 * Scratch does not have a native array argument type, but you can use
                 * the "array" type from Unsandboxed to allow users to input lists or 
                 * arrays from other blocks.
                 */
                type: Scratch.ArgumentType.ARRAY
              }
            }
          }
        ],
        menus: {}
      };
    }

    hello(args) {
      Cast.toString(args.NAME);
    }

    /**
     * Iterate over each item in an array and expose the current value
     * through the parameter reporter declared in the block input.
     * @param {{ITEM: string, ARRAY: *}} args Block arguments.
     * @param {object} util Block utility object for stack state and branching.
     * @returns {void}
     */
    forEachItem(args, util) {
      if (typeof util.stackFrame.index === "undefined") {
        util.stackFrame.index = 0;
      }

      const itemName = this._getParameterName(util, "ITEM", args.ITEM);
      const array = Cast.toArray(args.ARRAY);

      if (util.stackFrame.index < array.length) {
        util.thread.initParams();
        util.thread.pushParam(itemName, array[util.stackFrame.index]);
        util.stackFrame.index++;
        util.startBranch(1, true);
      } else {
        util.startBranch(2, false);
      }
    }
  }

  Scratch.extensions.register(new UnsandboxedTemplateBlocks());
})(Scratch);
