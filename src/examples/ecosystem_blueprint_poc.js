(function (Scratch) {
  "use strict";

  const Cast = Scratch.Cast;
  const translate = Scratch.translate;

  /**
   * EXAMPLE-ONLY extension.
   *
   * Source-of-truth mindset demonstrated here:
   * 1) Keep one canonical composite type per concept (point => [x, y]).
   * 2) Consumers own their own adapters from primitive Scratch inputs.
   * 3) Keep one main operation block; never split into with/without variants.
   */
  class InteropSourceOfTruthDemo {
    static extensionId = "usbInteropSourceOfTruthDemo";

    getInfo() {
      return {
        id: InteropSourceOfTruthDemo.extensionId,
        name: translate("Interop Source Of Truth Demo"),
        color1: "#4f8fba",
        color2: "#3f78a0",
        color3: "#336385",
        blocks: [
          {
            blockType: Scratch.BlockType.LABEL,
            text: translate("Core operation")
          },
          {
            opcode: "findDemoPath",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("find demo path from [A] to [B]"),
            arguments: {
              A: {
                type: Scratch.ArgumentType.ARRAY,
                defaultValue: [0, 0]
              },
              B: {
                type: Scratch.ArgumentType.ARRAY,
                defaultValue: [120, 80]
              }
            }
          },
          {
            opcode: "distanceBetween",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("distance from [A] to [B]"),
            arguments: {
              A: {
                type: Scratch.ArgumentType.ARRAY,
                defaultValue: [0, 0]
              },
              B: {
                type: Scratch.ArgumentType.ARRAY,
                defaultValue: [100, 100]
              }
            }
          },
          {
            opcode: "pathStart",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("start point of [PATH]"),
            arguments: {
              PATH: {
                type: Scratch.ArgumentType.ARRAY,
                defaultValue: [[0, 0], [50, 50], [100, 0]]
              }
            }
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: translate("Built-in adapters")
          },
          {
            opcode: "normalizePoint",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("normalized point for [P]"),
            arguments: {
              P: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "10, 20"
              }
            }
          },
          {
            opcode: "acceptedPointFormats",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("accepted point formats")
          },
          {
            opcode: "whyThisWorks",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("why this works")
          },
          {
            opcode: "sourceOfTruth",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("source of truth")
          }
        ]
      };
    }

    findDemoPath(args) {
      const start = this._parsePoint(args.A).point;
      const end = this._parsePoint(args.B).point;
      const mid = [
        start[0] + ((end[0] - start[0]) / 2),
        start[1] + ((end[1] - start[1]) / 2)
      ];

      return [start, mid, end];
    }

    distanceBetween(args) {
      const a = this._parsePoint(args.A).point;
      const b = this._parsePoint(args.B).point;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      return Math.sqrt((dx * dx) + (dy * dy));
    }

    pathStart(args) {
      const points = this._parsePath(args.PATH);
      return points.length > 0 ? points[0] : [0, 0];
    }

    normalizePoint(args) {
      return this._parsePoint(args.P).point;
    }

    acceptedPointFormats() {
      return [
        "[x, y]",
        "{x: 10, y: 20}",
        "\"10,20\"",
        "\"x:10 y:20\"",
        "JSON array string: \"[10,20]\""
      ].join(" | ");
    }

    whyThisWorks() {
      return "One operation block stays stable. Adapters are internal so users can start with plain x/y and later plug richer point sources.";
    }

    sourceOfTruth() {
      return "Canonical point format is [x, y]. Every consumer accepts it and also provides its own adapters from primitive Scratch inputs.";
    }

    _parsePath(value) {
      const raw = Cast.toArray(value);
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map(item => this._parsePoint(item).point);
      }

      const text = Cast.toString(value).trim();
      if (!text) return [];

      // Format: "x1,y1|x2,y2|x3,y3"
      if (text.indexOf("|") >= 0) {
        return text
          .split("|")
          .map(chunk => this._parsePoint(chunk).point);
      }

      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parsed.map(item => this._parsePoint(item).point);
        }
      } catch (e) {
        // Ignore invalid JSON and return empty path fallback.
      }

      return [];
    }

    _parsePoint(value) {
      // Native array point, ex: [10, 20]
      if (Array.isArray(value) && value.length >= 2) {
        return {
          point: [Cast.toNumber(value[0]), Cast.toNumber(value[1])],
          kind: "array"
        };
      }

      // Object point, ex: {x: 10, y: 20}
      if (value && typeof value === "object") {
        if (Object.prototype.hasOwnProperty.call(value, "x") && Object.prototype.hasOwnProperty.call(value, "y")) {
          return {
            point: [Cast.toNumber(value.x), Cast.toNumber(value.y)],
            kind: "object"
          };
        }
      }

      const text = Cast.toString(value).trim();

      // JSON point string, ex: "[10,20]" or "{\"x\":10,\"y\":20}"
      if (text.startsWith("[") || text.startsWith("{")) {
        try {
          const parsed = JSON.parse(text);
          return this._parsePoint(parsed);
        } catch (e) {
          // Fall through into text parsers.
        }
      }

      // Comma-separated, ex: "10,20"
      const comma = text.split(",");
      if (comma.length >= 2) {
        return {
          point: [Cast.toNumber(comma[0]), Cast.toNumber(comma[1])],
          kind: "text-csv"
        };
      }

      // Labelled, ex: "x:10 y:20"
      const matchX = /x\s*:\s*(-?\d+(?:\.\d+)?)/i.exec(text);
      const matchY = /y\s*:\s*(-?\d+(?:\.\d+)?)/i.exec(text);
      if (matchX && matchY) {
        return {
          point: [Cast.toNumber(matchX[1]), Cast.toNumber(matchY[1])],
          kind: "text-labelled"
        };
      }

      return {
        point: [0, 0],
        kind: "fallback"
      };
    }

  }

  Scratch.extensions.register(new InputCoercionPathDemo());
})(Scratch);
