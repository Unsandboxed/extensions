(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  class UnsandboxedExtendableDemoExample {
    static extensionId = "usbExtendableDemo";

    getInfo() {
      return {
        id: UnsandboxedExtendableDemoExample.extensionId,
        name: translate("Extendable Demo"),
        color1: "#5b7dff",
        color2: "#4b69dd",
        color3: "#3d56bc",
        blocks: [
          {
            opcode: "sum",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("sum"),
            arguments: {
              NUM: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            },
            extendable: {
              // starts renders the initial shape users see in the flyout.
              starts: [
                "NUM",
                {
                  type: "dummy",
                  fieldLabel: "+"
                },
                "NUM"
              ],
              // proceeds is the repeatable group inserted by the extender.
              proceeds: [
                {
                  type: "dummy",
                  fieldLabel: "+"
                },
                "NUM"
              ],
              minProceedGroups: 1
            }
          },
          {
            opcode: "query",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("query"),
            arguments: {
              FIELD: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: translate("score")
              },
              COMPARE: {
                // Menu metadata on arguments is now respected in extendable inputs.
                type: Scratch.ArgumentType.STRING,
                menu: "compareOps",
                defaultValue: ">"
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              },
              JOIN: {
                type: Scratch.ArgumentType.STRING,
                menu: "joinOps",
                defaultValue: translate("and")
              }
            },
            extendable: {
              starts: [
                Scratch.Extendable.dummy({
                  fieldLabel: translate("where")
                }),
                "FIELD",
                "COMPARE",
                "VALUE"
              ],
              proceeds: [
                Scratch.Extendable.dummy({
                  fieldLabel: translate("then")
                }),
                "JOIN",
                "FIELD",
                "COMPARE",
                "VALUE"
              ],
              minProceedGroups: 0,
              // Start with one repeated clause by default.
              initialExtendCount: 1
            }
          }
        ],
        menus: {
          compareOps: {
            acceptReporters: true,
            items: [">", ">=", "=", "<=", "<", "!="]
          },
          joinOps: {
            acceptReporters: false,
            items: [translate("and"), translate("or")]
          }
        }
      };
    }

    sum(args) {
      const values = Scratch.getOrderedExtendableValues(args, ["NUM"], 0)
        .map(value => Cast.toNumber(value));
      return values.reduce((acc, value) => acc + value, 0);
    }

    query(args) {
      // Read ordered mutation ids so repeated clauses are parsed in visual order.
      const ids = this._getOrderedMutationIds(args).filter(id =>
        /^(FIELD|COMPARE|VALUE|JOIN)\d*$/.test(id)
      );

      if (ids.length < 3) {
        return "";
      }

      const clauses = [];
      let index = 0;

      clauses.push(this._formatClause(args, ids[index], ids[index + 1], ids[index + 2]));
      index += 3;

      while (index + 3 < ids.length) {
        const join = Cast.toString(args[ids[index]] || translate("and")).toUpperCase();
        const clause = this._formatClause(args, ids[index + 1], ids[index + 2], ids[index + 3]);
        clauses.push(`${join} ${clause}`);
        index += 4;
      }

      return clauses.join(" ");
    }

    _formatClause(args, fieldId, compareId, valueId) {
      const field = Cast.toString(args[fieldId] || "");
      const compare = Cast.toString(args[compareId] || "=");
      const value = Cast.toString(args[valueId] || "");
      return `${field} ${compare} ${value}`.trim();
    }

    _getOrderedMutationIds(args) {
      if (!args || !args.mutation || typeof args.mutation.argumentids !== "string") {
        return [];
      }

      try {
        // argumentids comes from block mutation JSON in the VM/runtime pipeline.
        const ids = JSON.parse(args.mutation.argumentids);
        return Array.isArray(ids) ? ids : [];
      } catch (e) {
        return [];
      }
    }
  }

  Scratch.extensions.register(new UnsandboxedExtendableDemoExample());
})(Scratch);
