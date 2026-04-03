
"use strict";

const Unsandboxed = Scratch.UnsandboxedMod;
const uid = Unsandboxed.helpers.uid();

/**
 * Unsandboxed blocks for iteration.
 * @constructor
 */
class UnsandboxedIterationBlocks {
  constructor() {
    /**
     * The extension identifier of this block package.
     */
    this.extId = "usbIteration";

    /**
     * The Scratch Virtual Machine instance.
     */
    this.vm = Scratch.vm;

    /**
     * The runtime instantiating this block package.
     */
    this.runtime = this.vm.runtime;

    /**
     * The blockly instance in this workspace.
     */
    Scratch.gui.getBlockly().then(Blockly => {
      this.scratchblocks = Blockly;
    });

    // There's probably a better event for this.
    this.vm.on("PROJECT_CHANGED", this._handleUpdate.bind(this));
  }

  /**
   * Update all of the extension blocks' argument reporters.
   * @returns 
   */
  _handleUpdate() {
    const target = this.runtime.getEditingTarget();
    if (!target) return;

    // Get all blocks within this extension
    const blocks = Object.values(target.blocks._blocks)
      .filter(model =>
        model.opcode.startsWith(this.extId)
      )

    for (const block of blocks) {
      this._getDepthForBlock(block, target.blocks);
      // Go through each input and update with a depth suffix.
      for (const input in block.inputs) {
        // This cannot apply to substacks!
        if (input.startsWith("SUBSTACK")) continue;

        const shadow = block.inputs[input].shadow;
        // If there's no shadow, there's nothing to update.
        if (!shadow) continue;

        // Blockly is FAR more competent at what we're about to do.
        const workspace = this.scratchblocks.getMainWorkspace();
        const shadowBlock = workspace.getBlockById(shadow);
        if (!shadowBlock) continue;
        // TODO: "or" this. My line key is broken.
        if (shadowBlock.type !== "argument_reporter_string_number") continue;

        // Get the label of the shadow block and remove its suffix.
        const label = shadowBlock.getFieldValue("VALUE");
        const trimmedLabel = this._removeTrailingNumbers(label);
        shadowBlock.setFieldValue(trimmedLabel + block[this.extId + "_depth"], "VALUE");
      }
    }
  }

  /**
   * Get the depth of a block within c-blocks matching its opcode.
   * @param {*} block The block to get the depth of.
   * @param {*} container The block container to check through.
   */
  _getDepthForBlock(block, container) {
    let prev = block;
    let depth = 0;
    while (prev) {
      if (prev.opcode === block.opcode) depth++;
      prev = this._getOuterParent(prev, container);
    }
    block[this.extId + "_depth"] = depth;
  }

  /**
   * Get the outer "C" block wrapping the block.
   * @param {*} block The block to find the surrounding block from.
   * @param {*} container The block container to check through.
   * @returns The outer parent, if found.
   */
  _getOuterParent(block, container) {
    let prev;
    do {
      prev = block.id;
      block = container.getBlock(block.parent);
      if (!block) {
        // Ran off the top.
        return null;
      }
    } while (block.next === prev);
    return block;
  }

  /**
   * Utility function to remove the numbers at the end
   * of a string.
   * @param {String} string The string to format.
   * @returns The formatted string.
   */
  _removeTrailingNumbers(string) {
    const length = string.length;

    let i = length - 1;
    let char = string.slice(i);

    while (char >= '0' && char <= '9') {
      if (i < 1) break;
      string = string.slice(0, i);

      i = i - 1;
      char = string.slice(i);
    }

    return string;
  }

  /**
   * @returns {object} metadata for this extension and its blocks.
   */
  getInfo() {
    return {
      id: this.extId,
      name: "Iteration",
      blocks: [
        {
          opcode: "forKeyValue",
          blockType: Scratch.BlockType.LOOP,
          text: "for [KEY] [VALUE] in [OBJECT]",
          arguments: {
            KEY: {
              type: Scratch.ArgumentType.PARAMETER,
              defaultValue: "key",
            },
            VALUE: {
              type: Scratch.ArgumentType.PARAMETER,
              defaultValue: "value",
            },
            OBJECT: {
              type: Scratch.ArgumentType.OBJECT
            },
          },
          func: "noop",
        },
        {
          opcode: "forItem",
          blockType: Scratch.BlockType.LOOP,
          text: "for [ITEM] in [ARRAY]",
          arguments: {
            ITEM: {
              type: Scratch.ArgumentType.PARAMETER,
              defaultValue: "item",
            },
            ARRAY: {
              type: Scratch.ArgumentType.ARRAY
            },
          },
          func: "noop",
        },
      ],
      menus: {
      },
    };
  }

  noop() {
    // noop
  }
}

module.exports = UnsandboxedIterationBlocks;
