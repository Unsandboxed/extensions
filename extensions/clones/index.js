/**
 * ! UNFINISHED !
 * 
 * TO-DO:
 * - Do the list blocks
 * - Use variable fields instead of custom menus
 * 
 * BLOCKLY TO-DO:
 * - Allow variable fields to be target-specific
 * - Allow filtering for global and local variables
 * - Allow for concatenating items that are NOT variables
 */

(function (Scratch) {
  "use strict";

  /**
   * If you are reading this with the intent of understanding
   * how dependent dropdowns work, please understand that this
   * entire extension is a nightmare to look through.
   *
   * Like most Unsandboxed extension features, there is an
   * example for dependent dropdowns listed in the "tests"
   * folder.
   *
   * With that being said, though, dependent dropdowns are
   * still quite involved and not something I'd recommend using
   * if you're not familiar with Blockly or the vm.
   */

  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const Cast = Unsandboxed.Util.Cast;

  const translate = Scratch.translate;

  class ClonesPlus {
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
    _getAllVariablesInProject(type) {
      const targets = runtime.targets.filter(
        (model) => model.isOriginal && !model.isStage
      );

      let allVariables = [];

      for (const target of targets) {
        const variables = Object.values(target.variables)
          .filter((model) => model.type === type)
          .map((item) => ({
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

    constructor() {
      this.extId = "lmsClonesPlus2";
      this.extIcon =
        "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIyNTEuOTkwNTgiIGhlaWdodD0iMjUxLjk5MDU4IiB2aWV3Qm94PSIwLDAsMjUxLjk5MDU4LDI1MS45OTA1OCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTE3NC4wMDQ3MSwtMjQuMDA0NzEpIj48ZyBzdHJva2U9Im5vbmUiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCI+PHBhdGggZD0iTTE3NC4wMDQ3MSwxNTBjMCwtNjkuNTg1MjcgNTYuNDEwMDIsLTEyNS45OTUyOSAxMjUuOTk1MjksLTEyNS45OTUyOWM2OS41ODUyNywwIDEyNS45OTUyOSw1Ni40MTAwMiAxMjUuOTk1MjksMTI1Ljk5NTI5YzAsNjkuNTg1MjcgLTU2LjQxMDAyLDEyNS45OTUyOSAtMTI1Ljk5NTI5LDEyNS45OTUyOWMtNjkuNTg1MjcsMCAtMTI1Ljk5NTI5LC01Ni40MTAwMiAtMTI1Ljk5NTI5LC0xMjUuOTk1Mjl6IiBmaWxsPSIjY2Y4YjE3IiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZS13aWR0aD0iMCIgc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiLz48cGF0aCBkPSJNMTg0LjM1ODk5LDE1MGMwLC02My44NjY3NyA1MS43NzQyNSwtMTE1LjY0MTAyIDExNS42NDEwMiwtMTE1LjY0MTAyYzYzLjg2Njc3LDAgMTE1LjY0MTAyLDUxLjc3NDI1IDExNS42NDEwMiwxMTUuNjQxMDJjMCw2My44NjY3NyAtNTEuNzc0MjUsMTE1LjY0MTAyIC0xMTUuNjQxMDIsMTE1LjY0MTAyYy02My44NjY3NywwIC0xMTUuNjQxMDIsLTUxLjc3NDI1IC0xMTUuNjQxMDIsLTExNS42NDEwMnoiIGZpbGw9IiNmZmFiMTkiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlLXdpZHRoPSIwIiBzdHJva2UtbGluZWNhcD0iYnV0dCIvPjxwYXRoIGQ9Ik0zMzEuNTE4ODUsMTMxLjk3MTc3YzAsLTIuMzAzNTggMC45MTUxNiwtNC41MTI4IDIuNTQ0MTMsLTYuMTQxNThjMS42Mjg5NywtMS42Mjg3OCAzLjgzODI5LC0yLjU0MzY5IDYuMTQxODcsLTIuNTQzNDJoMTQuOTkxdi0xNC45OTJjMCwtNC43OTY4NyAzLjg4ODYzLC04LjY4NTUgOC42ODU1LC04LjY4NTVjNC43OTY4NywwIDguNjg1NSwzLjg4ODYzIDguNjg1NSw4LjY4NTV2MTQuOTkyaDE0Ljk5MWM0Ljc5NjYsMCA4LjY4NSwzLjg4ODQxIDguNjg1LDguNjg1YzAsNC43OTY2IC0zLjg4ODQsOC42ODUgLTguNjg1LDguNjg1aC0xNC45OTF2MTQuOTkyYzAsNC43OTY2IC0zLjg4ODQsOC42ODUgLTguNjg1LDguNjg1Yy00Ljc5NjYsMCAtOC42ODUsLTMuODg4NCAtOC42ODUsLTguNjg1di0xNC45OTJoLTE0Ljk5MmMtMi4zMDM1OCwwLjAwMDI3IC00LjUxMjksLTAuOTE0NjUgLTYuMTQxODcsLTIuNTQzNDNjLTEuNjI4OTcsLTEuNjI4NzggLTIuNTQ0MTMsLTMuODM3OTkgLTIuNTQ0MTMsLTYuMTQxNTd6IiBmaWxsPSIjZmZmZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVjYXA9InNxdWFyZSIvPjxwYXRoIGQ9Ik0zNjAuODAzMTQsMjQ1LjgyMjM0Yy0xLjU0NDc5LDAgLTMuMDk0NSwtMC41OTAzNyAtNC4yNzUyMywtMS43NzExbC0zNy4yMDUwMSwtMzcuMjAzNzlsLTE2LjcyOTg1LDE2LjcyNzkzYy00LjcyMjkzLDQuNzIyOTMgLTEyLjM4Nzg1LDQuNzIyOTMgLTE3LjEwNTg2LDBsLTE3LjExMDc3LC0xNy4xMTA3OGMtNC43MTk4OCwtNC43MjUyMSAtNC43MTk4OCwtMTIuMzgwNjQgMCwtMTcuMTA1ODVsNS4wNTk1NywtNS4wNTk1N2MtMC40NDc4MSwwLjAxNzgxIC0wLjg5NzkxLDAuMDI2NzYgLTEuMzUwMTEsMC4wMjY3Yy0xOC4zNzI5MywtMC4wMDI3MSAtMzMuMjY0OTIsLTE0Ljg5OTEyIC0zMy4yNjIyMSwtMzMuMjcyMDVjMC4wMDAwNywtMC40NDg0NyAwLjAwOSwtMC44OTQ4NiAwLjAyNjY1LC0xLjMzOTAxYy04LjUxNjkxLDYuMDg4OTMgLTE3LjE3MjU1LDIuNTk5MzEgLTIwLjE3NzgyLC04Ljg5ODkybC05LjA2NzA0LC0zNC43MDg2MWMtMC45MTE4MiwtMy40ODg2NSAtMC45OTUwMSwtNi42NDcxNCAtMC4zNzIxMiwtOS4zNDU4bC0zLjY2Njk4LC0zLjY2Njg2Yy0xLjU1MDA3LC0xLjUyMjggLTIuMTYzODEsLTMuNzYwMjUgLTEuNjA3NjIsLTUuODYwOGMwLjU1NjE4LC0yLjEwMDU1IDIuMTk2NzQsLTMuNzQxMTEgNC4yOTcyOSwtNC4yOTcyOWMyLjEwMDU1LC0wLjU1NjE4IDQuMzM4LDAuMDU3NTUgNS44NjA4LDEuNjA3NjJsMy4yNTA3MywzLjI1MDczYzIuNzU4MjEsLTAuOTA5NDEgNi4wODczLC0xLjA2MjQxIDkuODQwNjQsLTAuMzAzODJsMzguMTAzMjIsNy42OTkzNmMxMy4wNDcwOSwyLjYzNjk3IDE2LjAxODYsMTIuNDkxMTYgNi42MDcxOCwyMS45MDI1OGwtMC43MTAxOSwwLjcxMDA3YzAuMjk0ODMsLTAuMDA3NjggMC41OTA2MSwtMC4wMTE1MiAwLjg4NzMsLTAuMDExNDdjMTguMzcyOTMsMC4wMDI3MSAzMy4yNjQ5MiwxNC44OTkxMiAzMy4yNjIyMSwzMy4yNzIwNWMtMC4wMDAwNywwLjQ0ODg5IC0wLjAwOTAzLDAuODk1NyAtMC4wMjY3LDEuMzQwMjdsNS44MTIyOSwtNS44MTIzYzQuNzI1NzgsLTQuNzIzMTUgMTIuMzg1LC00LjcyMzE1IDE3LjExMDc4LDBsMTcuMTEwNzcsMTcuMTA1ODZjNC43MjMxNiw0LjcyNTc4IDQuNzIzMTYsMTIuMzg1IDAsMTcuMTEwNzhsLTE3LjQ5MzA2LDE3LjQ5MTA1bDM3LjIwNjM3LDM3LjIwNjM3YzEuNzI1NTksMS43Mjk2OSAyLjI0MDU5LDQuMzI3OTMgMS4zMDUyMyw2LjU4NTA1Yy0wLjkzNTM1LDIuMjU3MTIgLTMuMTM3MjEsMy43Mjk0OSAtNS41ODA0NywzLjczMTYxeiIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1ydWxlPSJub256ZXJvIiBzdHJva2Utd2lkdGg9IjAiIHN0cm9rZS1saW5lY2FwPSJidXR0Ii8+PC9nPjwvZz48L3N2Zz48IS0tcm90YXRpb25DZW50ZXI6MTI1Ljk5NTI5MDA1NDUwMTg1OjEyNS45OTUyOTAwNTQ1MDE5NS0tPg==";

      runtime.on("targetWasCreated", (newTarget) => {
        runtime.startHats(`${this.extId}_whenCloneStarts`, {}, newTarget, { clone: newTarget.id });
        runtime.startHats(`${this.extId}_whenCloneOfSpriteStarts`, {}, newTarget.sprite.clones[0], { clone: newTarget.id });
      });
    }

    getInfo() {
      return {
        id: this.extId,
        menuIconURI: this.extIcon,
        name: "Clones",
        color1: "#FFAB19",
        color2: "#EC9C13",
        color3: "#CF8B17",
        blocks: [
          {
            opcode: "whenCloneStarts",
            blockType: Scratch.BlockType.HAT,
            text: translate("when I start as a [CLONE] and [CONDITION]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            isEdgeActivated: false,
            arguments: {
              CLONE: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "clone",
              },
              CONDITION: {
                type: Scratch.ArgumentType.BOOLEAN,
              },
            },
          },
          {
            opcode: "whenCloneOfSpriteStarts",
            blockType: Scratch.BlockType.HAT,
            text: translate("when [CLONE] of [TARGET] is created"),
            extensions: ["colours_control"],
            shouldRestartExistingThreads: true,
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              CLONE: {
                type: Scratch.ArgumentType.PARAMETER,
                defaultValue: "clone",
              },
              TARGET: {
                menu: "targets",
              },
            },
            isEdgeActivated: false,
          },
          {
            opcode: "createCloneSetVar",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("create clone of [TARGET] and set [VARIABLE1] to [VALUE]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
            },
          },

          "---",

          {
            opcode: "getThisTarget",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("this target"),
            extensions: ["colours_control"],
            disableMonitor: true
          },
          {
            opcode: "getClonesOfTarget",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("[TYPE] of [TARGET]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetTypePlural",
                defaultValue: "clones",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
            },
          },
          {
            opcode: "getClonesOfTargetWithVar",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("[TYPE] of [TARGET] with [VARIABLE1] set to [VALUE]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetTypePlural",
                defaultValue: "clones",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
            },
          },

          "---",

          {
            opcode: "getIsType",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("[TARGET] is [TYPE]"),
            extensions: ["colours_control"],
            hideFromPalette: true,
            arguments: {
              TARGET: {
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetType",
                defaultValue: "clone",
              },
            },
          },
          {
            blockType: Scratch.BlockType.XML,
            xml: '<block type="lmsClonesPlus2_getIsType"><field name="TYPE">clone</field><value name="TARGET"><shadow type="lmsClonesPlus2_getThisTarget"></shadow></value></block>'
          },
          {
            opcode: "touchingWithVar",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("touching [TYPE] of [TARGET] with [VARIABLE1] set to [VALUE]?"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetType",
                defaultValue: "clone",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
            },
          },
          {
            opcode: "touching",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("touching [TYPE] of [TARGET]?"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetType",
                defaultValue: "clone",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
            },
          },

          "---",

          {
            opcode: "distanceToCloneWithVar",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("distance to [TYPE] of [TARGET] with [VARIABLE1] set to [VALUE]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetType",
                defaultValue: "clone",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
            },
          },
          {
            opcode: "distanceToClone",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("distance to [TYPE] of [TARGET]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetType",
                defaultValue: "clone",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
            },
          },

          "---",

          {
            opcode: "clonesTouchingWithVar",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("[TYPE] of [TARGET] touching me with [VARIABLE1] set to [VALUE]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetTypePlural",
                defaultValue: "clones",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
            },
          },
          {
            opcode: "clonesTouching",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("[TYPE] of [TARGET] touching me"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetTypePlural",
                defaultValue: "clones",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
            },
          },

          "---",

          {
            opcode: "setProperty",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set [VARIABLE1] to [VALUE] for [TYPE] of [TARGET]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetTypePlural",
                defaultValue: "clones",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
            },
          },
          {
            opcode: "setPropertyInArray",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set [VARIABLE1] to [VALUE] for [TYPE] of [TARGET] in [TARGETS]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetTypePlural",
                defaultValue: "clones",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              TARGETS: {
                type: Scratch.ArgumentType.ARRAY,
              },
            },
          },
          {
            opcode: "setPropertyWithVar",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set [VARIABLE1] to [VALUE1] for [TYPE] of [TARGET] with [VARIABLE2] set to [VALUE2]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE1: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetTypePlural",
                defaultValue: "clones",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              VARIABLE2: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
            },
          },
          {
            opcode: "getPropertyWithVar",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("[PROPERTY] in [TYPE] of [TARGET] with [VARIABLE1] set to [VALUE2]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              PROPERTY: {
                type: Scratch.ArgumentType.STRING,
                menu: "property",
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetType",
                defaultValue: "clone",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
            },
          },
          {
            opcode: "getPropertyInArray",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("[PROPERTY] in [TYPE] of [TARGET] in [ARRAY]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              PROPERTY: {
                type: Scratch.ArgumentType.STRING,
                menu: "property",
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetType",
                defaultValue: "clone",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY,
              },
            },
          },

          "---",

          {
            opcode: "setList",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set [VARIABLE1] to [VALUE] for [TYPE] of [TARGET]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "list",
              },
              VALUE: {
                type: Scratch.ArgumentType.ARRAY,
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetTypePlural",
                defaultValue: "clones",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
            },
          },
          {
            opcode: "setListInArray",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set [LIST] to [VALUE] for [TYPE] of [TARGET] in [TARGETS]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              LIST: {
                type: Scratch.ArgumentType.STRING,
                menu: "list",
              },
              VALUE: {
                type: Scratch.ArgumentType.ARRAY,
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetTypePlural",
                defaultValue: "clones",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              TARGETS: {
                type: Scratch.ArgumentType.ARRAY,
              },
            },
          },
          {
            opcode: "setListWithVar",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set [LIST] to [VALUE1] for [TYPE] of [TARGET] with [VARIABLE1] set to [VALUE2]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              LIST: {
                type: Scratch.ArgumentType.STRING,
                menu: "list",
              },
              VALUE1: {
                type: Scratch.ArgumentType.ARRAY,
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetTypePlural",
                defaultValue: "clones",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
            },
          },
          {
            opcode: "getList",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("[LIST] in [TYPE] of [TARGET] with [VARIABLE1] set to [VALUE2]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              LIST: {
                type: Scratch.ArgumentType.STRING,
                menu: "list",
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetType",
                defaultValue: "clone",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE2: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
            },
          },
          {
            opcode: "getListInArray",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("[LIST] in [TYPE] of [TARGET] in [ARRAY]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              LIST: {
                type: Scratch.ArgumentType.STRING,
                menu: "list",
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetType",
                defaultValue: "clone",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY,
              },
            },
          },

          "---",

          {
            opcode: "deleteClones",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("delete clones of [TARGET]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
            },
          },
          {
            opcode: "deleteClonesFromArray",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("delete clones of [TARGET] in [ARRAY]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              ARRAY: {
                type: Scratch.ArgumentType.ARRAY,
              },
            },
          },
          {
            opcode: "deleteClonesWithVar",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("delete clones of [TARGET] with [VARIABLE1] set to [VALUE]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
            },
          },

          "---",

          {
            opcode: "stopScripts",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("stop scripts in [TYPE] of [TARGET]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetTypePlural",
                defaultValue: "clones",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
            },
          },
          {
            opcode: "stopScriptsFromArray",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("stop scripts in [TYPE] of [TARGET] in [TARGETS]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetTypePlural",
                defaultValue: "clones",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              TARGETS: {
                type: Scratch.ArgumentType.ARRAY,
              },
            },
          },
          {
            opcode: "stopScriptsWithVar",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("stop scripts in [TYPE] of [TARGET] with [VARIABLE1] set to [VALUE]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetTypePlural",
                defaultValue: "clones",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
              VARIABLE1: {
                type: Scratch.ArgumentType.STRING,
                menu: "variable",
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0,
              },
            },
          },

          "---",

          {
            opcode: "cloneCount",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("[TYPE] count"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetType",
                defaultValue: "clone",
              },
            },
          },
          {
            opcode: "cloneCountInTarget",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("[TYPE] count of [TARGET]"),
            extensions: ["colours_control"],
            filter: [Scratch.TargetType.SPRITE],
            arguments: {
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: "targetType",
                defaultValue: "clone",
              },
              TARGET: {
                type: Scratch.ArgumentType.STRING,
                menu: "targets",
              },
            },
          },
        ],
        menus: {
          property: "attributesMenu",
          variable: "variablesMenu",
          list: "listsMenu",
          targets: {
            acceptReporters: true,
            items: "targetsMenu",
          },
          targetType: {
            acceptReporters: false,
            items: ["parent", "clone", "anything"],
            onItemSelected: (item) => {
              console.log(item + " pingus")
            }
          },
          targetTypePlural: {
            acceptReporters: false,
            items: ["parent", "clones", "anything"],
          },
        },
      };
    }

    _getTargetsWithVar(target, variableId, value) {
      const clones = target.sprite.clones.filter((clone) => {
        const variable = clone.lookupVariableById(variableId);
        return variable && Scratch.Cast.compare(variable.value, value) === 0;
      });

      return clones;
    }

    // Blocks

    whenCloneStarts(args, util) {
      // TODO: this is really not ideal. this should be an event-based hat, but we don't have a good
      // way to do that right now.
      if (util.target.isOriginal) {
        return;
      }

      const condition = Cast.toBoolean(args.CONDITION);
      return condition;
    }

    whenCloneOfSpriteStarts(args, util) {
      return true;
    }

    createCloneSetVar(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      const clones = target.sprite.clones;

      // @ts-expect-error - not typed yet
      runtime.ext_scratch3_control._createClone(target.sprite.name, target);

      const cloneNum = clones.length - 1;
      const cloneVariable = clones[cloneNum].lookupVariableById(args.VARIABLE1);
      if (cloneVariable) {
        cloneVariable.value = args.VALUE;
      }
    }

    getThisTarget(args, util) {
      return util.target.id;
    }

    getIsType(args, util) {
      const target = runtime.getTargetById(args.TARGET);
      if (!target) return false;

      if (args.TYPE === "clone") {
        return !target.isOriginal;
      } else if (args.TYPE === "parent") {
        return target.isOriginal;
      } else {
        return true;
      }
    }

    getClonesOfTarget(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      const clones = target.sprite.clones;

      if (args.TYPE === "clones") {
        return clones
          .filter((model) => !model.isOriginal)
          .map((model) => model.id);
      } else if (args.TYPE === "parent") {
        return clones
          .filter((model) => model.isOriginal)
          .map((model) => model.id);
      } else {
        return clones.map((model) => model.id);
      }
    }

    getClonesOfTargetWithVar(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      const clones = this._getTargetsWithVar(target, args.VARIABLE1, args.VALUE);

      if (args.TYPE === "clones") {
        return clones
          .filter((model) => !model.isOriginal)
          .map((model) => model.id);
      } else if (args.TYPE === "parent") {
        return clones
          .filter((model) => model.isOriginal)
          .map((model) => model.id);
      } else {
        return clones.map((model) => model.id);
      }
    }

    touchingWithVar(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      let clones = this._getTargetsWithVar(target, args.VARIABLE1, args.VALUE);

      if (args.TYPE === "clone") {
        clones = clones.filter((model) => !model.isOriginal);
      } else if (args.TYPE === "parent") {
        clones = clones.filter((model) => model.isOriginal);
      }

      const drawableCandidates = clones.map((clone) => clone.drawableID);
      if (drawableCandidates.length === 0) {
        return false;
      }

      return Scratch.vm.renderer.isTouchingDrawables(
        util.target.drawableID,
        drawableCandidates
      );
    }

    touching(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      let clones = target.sprite.clones;

      if (args.TYPE === "clone") {
        clones = clones.filter((model) => !model.isOriginal);
      } else if (args.TYPE === "parent") {
        clones = clones.filter((model) => model.isOriginal);
      }

      const drawableCandidates = clones.map((clone) => clone.drawableID);
      if (drawableCandidates.length === 0) {
        return false;
      }

      return Scratch.vm.renderer.isTouchingDrawables(
        util.target.drawableID,
        drawableCandidates
      );
    }

    clonesTouchingWithVar(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      let clones = this._getTargetsWithVar(target, args.VARIABLE1, args.VALUE);

      if (args.TYPE === "clones") {
        clones = clones.filter((model) => !model.isOriginal);
      } else if (args.TYPE === "parent") {
        clones = clones.filter((model) => model.isOriginal);
      }

      clones = clones.map((model) => model.id);

      let touchingDrawables = [];
      for (const clone of clones) {
        const touching = Scratch.vm.renderer.isTouchingDrawables(
          util.target.drawableID,
          [clone.drawableID]
        );

        if (touching) touchingDrawables.push(clone.id);
      }

      return touchingDrawables;
    }

    clonesTouching(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      let clones = target.sprite.clones;

      if (args.TYPE === "clones") {
        clones = clones.filter((model) => !model.isOriginal);
      } else if (args.TYPE === "parent") {
        clones = clones.filter((model) => model.isOriginal);
      }

      let touchingDrawables = [];

      for (const clone of clones) {
        const touching = Scratch.vm.renderer.isTouchingDrawables(
          target.drawableID,
          [clone.drawableID]
        );

        if (touching) touchingDrawables.push(clone.id);
      }

      return touchingDrawables;
    }

    distanceToCloneWithVar(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      let clones = this._getTargetsWithVar(target, args.VARIABLE1, args.VALUE);

      return this._distanceToNearestTarget(clones, args.TYPE, util);
    }

    distanceToClone(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      let clones = target.sprite.clones;

      return this._distanceToNearestTarget(clones, args.TYPE, util);
    }

    _distanceToNearestTarget(targets, type, util) {
      if (type === "clone") {
        targets = targets.filter((model) => !model.isOriginal);
      } else if (type === "parent") {
        targets = targets.filter((model) => model.isOriginal);
      }

      // Scratch never needs to track the distance to a number of
      // different targets at one time. I think the most logical
      // thing to do here is to filter to the one that's closest.

      let distance;

      for (const target of targets) {
        const targetX = target.x;
        const targetY = target.y;

        const dx = util.target.x - targetX;
        const dy = util.target.y - targetY;

        const targetDistance = Math.sqrt((dx * dx) + (dy * dy));

        if (targetDistance < distance || typeof distance === "undefined") {
          distance = targetDistance;
        } 
      }

      return distance ?? 10000;
    }

    // The plan originally was to have these work for various types
    // of properties. I realised that setting costume names and the sort 
    // would be tricky and buggy.
    // I might do that in the future, which is why it's split up like
    // this.
    setProperty(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      let clones = target.sprite.clones;

      if (args.TYPE === "clones") {
        clones = clones.filter((model) => !model.isOriginal);
      } else if (args.TYPE === "parent") {
        clones = clones.filter((model) => model.isOriginal);
      }

      const thing = Cast.toString(args.PROPERTY);
      const value = args.VALUE;

      for (const clone of clones) {
        this._setThingForTarget(clone, thing, value);
      }
    }

    setPropertyInArray(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      let clones = target.sprite.clones;

      if (args.TYPE === "clones") {
        clones = clones.filter((model) => !model.isOriginal);
      } else if (args.TYPE === "parent") {
        clones = clones.filter((model) => model.isOriginal);
      }

      const thing = Cast.toString(args.PROPERTY);
      const value = args.VALUE;

      for (const clone of clones) {
        if (!args.ARRAY.includes(clone.id)) continue;
        this._setThingForTarget(clone, thing, value);
      }
    }

    setPropertyWithVar(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      let clones = this._getTargetsWithVar(target, args.VARIABLE1, args.VALUE);

      if (args.TYPE === "clones") {
        clones = clones.filter((model) => !model.isOriginal);
      } else if (args.TYPE === "parent") {
        clones = clones.filter((model) => model.isOriginal);
      }

      const thing = Cast.toString(args.PROPERTY);
      const value = args.VALUE;

      for (const clone of clones) {
        this._setThingForTarget(clone, thing, value);
      }
    }

    _setThingForTarget(target, thing, value) {
      if (!target) return;

      // We really don't want to create a variable
      // spontaneously because of how our variable
      // menus work. Get it from its id instead of:
      //   target.lookupOrCreateVariable
      const variable = target.lookupVariableById(thing);

      if (variable) {
        variable.value = value;
      }
    }

    _getThingForTarget(target, thing, util) {
      // attrTarget can be undefined if the target does not exist
      // (e.g. single sprite uploaded from larger project referencing
      // another sprite that wasn't uploaded)
      if (!target) return 0;

      // Generic attributes
      if (target.isStage) {
        // We realistically don't need to account for the Stage, but
        // there's no harm in doing so.
        switch (thing) {
          case 'backdrop #': return target.currentCostume + 1;
          case 'backdrop name':
            return target.getCostumes()[target.currentCostume].name;
          case 'volume': return target.volume;
        }
      } else {
        switch (thing) {
          case 'x position': return target.x;
          case 'y position': return target.y;
          case 'direction': return target.direction;
          case 'costume #': return target.currentCostume + 1;
          case 'costume name':
            return target.getCostumes()[target.currentCostume].name;
          case 'size': return target.size;
          case 'volume': return target.volume;
        }
      }
      
      // Target variables.
      const variable = target.lookupVariableById(thing);
      if (variable) {
        return variable.value;
      }

      // Otherwise, 0
      return 0;
    }

    deleteClones(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      const clones = target.sprite.clones.filter(
        (target) => !target.isOriginal
      );

      for (const clone of clones) {
        runtime.disposeTarget(clone);
      }
    }

    deleteClonesFromArray(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      const clones = target.sprite.clones.filter(
        (target) => !target.isOriginal
      );

      for (const clone of clones) {
        if (!args.ARRAY.includes(clone.id)) continue;
        runtime.disposeTarget(clone);
      }
    }

    deleteClonesWithVar(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      const clones = this._getTargetsWithVar(
        target, args.VARIABLE1, args.VALUE
      ).filter((target) => !target.isOriginal);

      for (const clone of clones) {
        runtime.disposeTarget(clone);
      }
    }

    stopScripts(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      let clones = target.sprite.clones;

      if (args.TYPE === "clones") {
        clones = clones.filter((model) => !model.isOriginal);
      } else if (args.TYPE === "parent") {
        clones = clones.filter((model) => model.isOriginal);
      }

      clones.forEach((clone) => {
        runtime.stopForTarget(clone);
      });
    }

    stopScriptsFromArray(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      let clones = this._getTargetsWithVar(target, args.VARIABLE1, args.VALUE);

      if (args.TYPE === "clones") {
        clones = clones.filter((model) => !model.isOriginal);
      } else if (args.TYPE === "parent") {
        clones = clones.filter((model) => model.isOriginal);
      }

      for (const clone of clones) {
        if (!args.ARRAY.includes(clone.id)) continue;
        runtime.stopForTarget(clone);
      }
    }

    stopScriptsWithVar(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      let clones = this._getTargetsWithVar(target, args.VARIABLE1, args.VALUE);

      if (args.TYPE === "clones") {
        clones = clones.filter((model) => !model.isOriginal);
      } else if (args.TYPE === "parent") {
        clones = clones.filter((model) => model.isOriginal);
      }

      clones.forEach((clone) => {
        runtime.stopForTarget(clone);
      });
    }

    cloneCount(args, util) {
      // TO DO: Should the stage be included or not?
      const parents = runtime.targets.filter(model => model.isOriginal);
      const clones = runtime.targets.filter(model => !model.isOriginal);

      if (args.TYPE === "parent") {
        return parents.length - 1;
      } else if (args.TYPE === "clone") {
        return clones.length;
      } else {
        return runtime.targets.length - 1;
      }
    }

    cloneCountInTarget(args, util) {
      const target = _getTargetFromMenu(args.TARGET, util);
      const clones = target.sprite.clones;

      if (args.TYPE === "parent") {
        return 1;
      } else if (args.TYPE === "clone") {
        return clones.length - 1;
      } else {
        return clones.length;
      }
    }

    // Dependent Dropdowns (eek!)

    _attributeMenuConstructor(target, variablesOnly, type = "") {
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
      const thethingineedtoremove = variablesOnly
        ? projectVariables
        : targetAttributes.concat(projectVariables);
      if (!target) return thethingineedtoremove;

      const variables = Object.values(target.variables)
        .filter((model) => model.type === type)
        .map((item) => ({
          text: item.name,
          value: item.id,
        }));

      if (variablesOnly) return variables;
      return targetAttributes.concat(variables);
    }

    _getAttributesOrVariables(targetId, menuState, variablesOnly, type) {
      const blockId = menuState.sourceBlock?.id;

      // In this case it'll return a list of the main attributes
      const projectVariables = this._getAllVariablesInProject(type) ?? [""];
      const targetAttributes = this._attributeMenuConstructor();
      const thethingineedtoremove = variablesOnly
        ? projectVariables
        : targetAttributes.concat(projectVariables);
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
      if (targetInput.shadow !== targetInput.block)
        return thethingineedtoremove;

      if (targetInput) {
        const shadowMenuId = targetInput.shadow;
        const shadowMenu = lookupBlocks.getBlock(shadowMenuId);
        target = _getTargetFromMenu(shadowMenu.fields.targets.value);
      }

      return this._attributeMenuConstructor(target, variablesOnly, type);
    }

    attributesMenu(targetId, menuState) {
      return this._getAttributesOrVariables(targetId, menuState, false, "");
    }

    variablesMenu(targetId, menuState) {
      return this._getAttributesOrVariables(targetId, menuState, true, "");
    }

    listsMenu(targetId, menuState) {
      return this._getAttributesOrVariables(targetId, menuState, true, "list");
    }

    /**
     * In terms of the "thing" dropdown, we don't need to do much either.
     * All we need to do is define a callback for when items are clicked
     * and return the correct list of "things".
     */
    targetsMenu(targetId, menuState) {
      const spriteNames = this._getTargetNames();

      // Unsandboxed's menuState provides the source block, if one exists.
      const block = menuState.sourceBlock;

      // If there isn't one, something went horribly wrong and we're just
      // gonna pretend it didn't. Not my problem.
      // (In all seriousness, if this is causing you grief, you're likely
      // trying to run this in a different mod. Don't!)
      if (!block) return spriteNames;

      let targets = block.getField("targets");

      // the "validator" is a function that is run whenever an item is selected.
      // crucially, we need this so that item callbacks can be used to set other
      // items on the block.
      if (targets && !targets.getValidator())
        targets.setValidator((accept) => {
          // Get current property values in the block.
          const parent = block.getParent();

          let fields = [
            parent?.getField("PROPERTY"),
            parent?.getField("VARIABLE1"),
            parent?.getField("VARIABLE2"),
            parent?.getField("LIST"),
          ];

          for (const field of fields) {
            if (!field) continue;
            // If we have the property value, check it's not
            // already contained in the list.
            let currentVal = field.getValue();
            const target = _getTargetFromMenu(accept);
            if (!target) return accept;

            const name = field.name;
            const res = this._attributeMenuConstructor(
              target,
              name.includes("VARIABLE") || name === "LIST",
              name.includes("VARIABLE") ? "" : "list"
            );
            let validValues = Object.values(res).map((model) => model.value);

            // If we can't find the value within the new indexes,
            // change the property to the first of the new list.
            if (validValues.indexOf(currentVal) === -1) {
              if (res.length === 0) {
                field.setValue("");
              } else {
                field.setValue(res[0].value);
                field.setText(res[0].text);
              }
            }
          }

          return accept;
        });

      return spriteNames;
    }
  }

  function _getTargetFromMenu(targetName, util) {
    let target = runtime.getSpriteTargetByName(targetName);

    if (targetName === "_myself_") {
      if (util) return util.target;
      target = runtime.getEditingTarget();
    }

    if (targetName === "_stage_") target = runtime.getTargetForStage();
    return target;
  }

  Scratch.extensions.register(new ClonesPlus());
})(Scratch);
