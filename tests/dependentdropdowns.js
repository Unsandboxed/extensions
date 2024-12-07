(function(Scratch) {
  "use strict";

  const vm = Scratch.vm;
  const runtime = vm.runtime;

  const translate = Scratch.translate;

  class DependentDropdowns {
    /**
     * When the workspace is re-opened, none of the
     * variable menus will be updated to show the
     * correct variable name, and will instead display
     * their ugly variable uid. The solution to this
     * is to just return all variables in the project.
     * 
     * It's not great but it's all we can do right now.
     * (Unless I suddenly find an alternative).
     */
    _getAllVariablesInProject() {
      const targets = runtime.targets.filter(model => 
        model.isOriginal && !model.isStage
      );

      let allVariables = [];

      for (const target of targets) {
        const variables = Object.values(target.variables).map((item) => ({
          text: item.name,
          value: item.id,
        }));

        allVariables = allVariables.concat(variables);
      }

      if (allVariables.length == 0) return;
      return allVariables;
    }

    _getTargetNames() {
      // "myself" is a string representing the current target.
      const spriteNames = [{ text: "myself", value: "_myself_" }];
      const targets = Scratch.vm.runtime.targets;

      // Make an array of all targets by name.
      // Don't include clones or the stage target.
      for (const target of targets) {
        if (!target.isOriginal || target.isStage) continue;
        const targetName = target.getName();

        spriteNames.push({
          text: targetName,
          value: targetName,
        });
      }

      return spriteNames;
    }

    getInfo() {
      return {
        id: "dependantdropdowns",
        name: "Dependant Dropdowns",
        blocks: [
          {
            opcode: "getPropOfThing",
            blockType: Scratch.BlockType.REPORTER,
            text: "[PROPERTY] of [TARGET]",
            extensions: ["colours_sensing"],
            arguments: {
              PROPERTY: {
                type: Scratch.ArgumentType.STRING,
                menu: "property",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
            }
          },
          {
            opcode: "getVarOfThing",
            blockType: Scratch.BlockType.REPORTER,
            text: "[PROPERTY] of [TARGET]",
            extensions: ["colours_sensing"],
            arguments: {
              PROPERTY: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
            }
          },
        ],
        menus: {
          property: "attributesMenu",
          variable: "variablesMenu",
          targets: {
            acceptReporters: true,
            items: "targetsMenu",
          }
        }
      };
    }

    getPropOfThing(args) {
      return `${args.PROPERTY} of ${args.TARGET}`;
    }

    _attributeMenuConstructor(target, variablesOnly) {
      // todo: add stage attributes too
      let targetAttributes = [
        "x position",
        "y position",
        "direction",
        "costume #",
        "costume name",
        "size",
        "volume",
      ];

      targetAttributes = targetAttributes.map((item) => ({
        text: translate(item),
        value: item,
      }));

      // In this case it'll return a list of the main attributes
      const projectVariables = this._getAllVariablesInProject() ?? [""];
      const thethingineedtoremove = (variablesOnly) ? 
        projectVariables :
        targetAttributes.concat(projectVariables);
      if (!target) return thethingineedtoremove;

      const variables = Object.values(target.variables).map((item) => ({
        text: item.name,
        value: item.id,
      }));

      if (variablesOnly) return variables;
      return targetAttributes.concat(variables);
    }

    _getAttributesOrVariables(targetId, menuState, variablesOnly) {
      const blockId = menuState.sourceBlock?.id;

      // In this case it'll return a list of the main attributes
      const projectVariables = this._getAllVariablesInProject() ?? [""];
      const targetAttributes = this._attributeMenuConstructor();
      const thethingineedtoremove = (variablesOnly) ? 
        projectVariables :
        targetAttributes.concat(projectVariables);
      if (!blockId) return thethingineedtoremove;

      let target = runtime.getTargetById(targetId);

      // We will start by trying to find the block in the workspace target.
      let lookupBlocks = target.blocks;
      let block = lookupBlocks.getBlock(blockId);

      // The block doesn't exist, but should be in the flyout. Look there.
      if (!block) {
        block = vm.runtime.flyoutBlocks.getBlock(blockId);
        if (!block) return thethingineedtoremove;
        lookupBlocks = vm.runtime.flyoutBlocks;
      }

      const targetInput = block.inputs.TARGET;

      // There's a block dropped on top of the menu. We can't evaluate it
      // in case it's a block that returns a promise or yields before returning
      // a value.
      if (targetInput.shadow !== targetInput.block) return thethingineedtoremove;

      if (targetInput) {
        const shadowMenuId = targetInput.shadow;
        const shadowMenu = lookupBlocks.getBlock(shadowMenuId);
        target = _getTargetFromMenu(shadowMenu.fields.targets.value);
      }

      return this._attributeMenuConstructor(target, variablesOnly);
    }

    attributesMenu(targetId, menuState) {
      return this._getAttributesOrVariables(targetId, menuState);
    }

    variablesMenu(targetId, menuState) {
      return this._getAttributesOrVariables(targetId, menuState, true);
    }

    /**
     * In terms of the "thing" dropdown, we don't need to do much either.
     * All we need to do is define a callback for when items are clicked,
     * and return the correct list of "things".
     */
    targetsMenu(targetId, menuState) {
      const spriteNames = this._getTargetNames();

      // Unsandboxed's menuState provides the source block, if one exists.
      const block = menuState.sourceBlock;
      if (!block) return spriteNames;

      let field = block.getField("targets");

      // the "validator" is a function that is run whenever an item is selected.
      // crucially, we need this so that item callbacks can be used to set other
      // items on the block.
      if (field && !field.getValidator()) field.setValidator((accept) => {
        // Get current property value in the block.
        const parent = block.getParent();
        let field2 = parent?.getField("PROPERTY");

        // If we have the property value, check it's not
        // already contained in the list.
        if (field2) {
          let currentVal = field2.getValue();
          const target = _getTargetFromMenu(accept);
          if (!target) return accept;

          const res = this._attributeMenuConstructor(target);
          let validValues = Object.values(res).map(model => model.value);

          // If we can't find the value within the new indexes,
          // change the property to the first of the new list.
          if (validValues.indexOf(currentVal) === -1) {
            field2.setValue(validValues[0]);
          }
        }

        return accept;
      });

      return spriteNames;
    }

  }

  function _getTargetFromMenu(targetName) {
    let target = runtime.getSpriteTargetByName(targetName);
    if (targetName === "_myself_") target = runtime.getEditingTarget();
    if (targetName === "_stage_") target = runtime.getTargetForStage();
    return target;
  }

  Scratch.extensions.register(new DependentDropdowns());
})(Scratch);
