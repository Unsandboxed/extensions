(function (Scratch) {
  "use strict";

  const Cast = Scratch.Cast;
  const translate = Scratch.translate;
  const VECTOR_SHAPE = 5;

  class VectorShimsProofOfConcept {
    static extensionId = "usbVectorShimsPoc";

    constructor() {
      this._particleWindByName = new Map();
      this._tilesetSizeByName = new Map();
      this._wheelVector = [0, 0];

      const runtime = Scratch.vm && Scratch.vm.runtime;
      const mouse = runtime && runtime.ioDevices && runtime.ioDevices.mouse;
      if (mouse && typeof mouse.postData === "function") {
        const originalPostData = mouse.postData.bind(mouse);
        mouse.postData = data => {
          if (data && typeof data === "object") {
            const scrollX = Number.isFinite(Cast.toNumber(data.scrollDeltaX)) ? Cast.toNumber(data.scrollDeltaX) : 0;
            const scrollY = Number.isFinite(Cast.toNumber(data.scrollDeltaY)) ? Cast.toNumber(data.scrollDeltaY) : 0;
            this._wheelVector = [scrollX, scrollY];
          }
          return originalPostData(data);
        };
      }
    }

    getInfo() {
      return {
        id: VectorShimsProofOfConcept.extensionId,
        name: translate("Vector Shims (POC)"),
        color1: "#4f8fba",
        color2: "#3f78a0",
        color3: "#336385",
        blocks: [
          {
            blockType: Scratch.BlockType.LABEL,
            text: translate("Pathfinding shims")
          },
          {
            opcode: "pathfindingFindPath",
            blockType: Scratch.BlockType.ARRAY,
            text: translate("find path from [A] to [B]"),
            arguments: {
              A: {
                type: Scratch.ArgumentType.VECTOR
              },
              B: {
                type: Scratch.ArgumentType.VECTOR
              }
            }
          },
          {
            opcode: "pathfindingPathStart",
            blockType: Scratch.BlockType.ARRAY,
            blockShape: VECTOR_SHAPE,
            text: translate("path start point of [PATH]"),
            arguments: {
              PATH: {
                type: Scratch.ArgumentType.ARRAY
              }
            }
          },
          {
            opcode: "pathfindingPathEnd",
            blockType: Scratch.BlockType.ARRAY,
            blockShape: VECTOR_SHAPE,
            text: translate("path end point of [PATH]"),
            arguments: {
              PATH: {
                type: Scratch.ArgumentType.ARRAY
              }
            }
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: translate("Particles shims")
          },
          {
            opcode: "particlesSetWindVector",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set wind of [NAME] to [VECTOR]"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "fx"
              },
              VECTOR: {
                type: Scratch.ArgumentType.VECTOR
              }
            }
          },
          {
            opcode: "particlesGetWindVector",
            blockType: Scratch.BlockType.ARRAY,
            blockShape: VECTOR_SHAPE,
            text: translate("wind vector of [NAME]"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "fx"
              }
            }
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: translate("Touch and mouse shims")
          },
          {
            opcode: "touchFingerPosition",
            blockType: Scratch.BlockType.ARRAY,
            blockShape: VECTOR_SHAPE,
            text: translate("position of finger [ID]"),
            arguments: {
              ID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: "mouseWheelVector",
            blockType: Scratch.BlockType.ARRAY,
            blockShape: VECTOR_SHAPE,
            text: translate("wheel vector"),
          },
          "---",
          {
            blockType: Scratch.BlockType.LABEL,
            text: translate("Tilemap shims")
          },
          {
            opcode: "tilemapSetTilesetSize",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set tileset [TILESET] tile size [SIZE]"),
            arguments: {
              TILESET: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "default"
              },
              SIZE: {
                type: Scratch.ArgumentType.VECTOR
              }
            }
          },
          {
            opcode: "tilemapGetTilesetSize",
            blockType: Scratch.BlockType.ARRAY,
            blockShape: VECTOR_SHAPE,
            text: translate("tile size of [TILESET]"),
            arguments: {
              TILESET: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "default"
              }
            }
          }
        ]
      };
    }

    pathfindingFindPath(args) {
      const a = this._toVector(args.A);
      const b = this._toVector(args.B);
      return [a, b];
    }

    pathfindingPathStart(args) {
      const path = Cast.toArray(args.PATH);
      if (path.length === 0) return [0, 0];
      return this._toVector(path[0]);
    }

    pathfindingPathEnd(args) {
      const path = Cast.toArray(args.PATH);
      if (path.length === 0) return [0, 0];
      return this._toVector(path[path.length - 1]);
    }

    particlesSetWindVector(args) {
      const name = Cast.toString(args.NAME).trim() || "fx";
      this._particleWindByName.set(name, this._toVector(args.VECTOR));
    }

    particlesGetWindVector(args) {
      const name = Cast.toString(args.NAME).trim() || "fx";
      return this._particleWindByName.get(name) || [0, 0];
    }

    touchFingerPosition(args) {
      const id = Math.max(1, Math.floor(Cast.toNumber(args.ID)));
      const runtime = Scratch.vm && Scratch.vm.runtime;
      const target = runtime && runtime.renderer && runtime.renderer.canvas;
      if (!target) {
        return [0, 0];
      }
      return [0, 0].map((v, i) => (id - 1) * (i ? -10 : 10) + v);
    }

    mouseWheelVector() {
      return this._wheelVector;
    }

    tilemapSetTilesetSize(args) {
      const name = Cast.toString(args.TILESET).trim() || "default";
      this._tilesetSizeByName.set(name, this._toVector(args.SIZE));
    }

    tilemapGetTilesetSize(args) {
      const name = Cast.toString(args.TILESET).trim() || "default";
      return this._tilesetSizeByName.get(name) || [32, 32];
    }

    _toVector(value) {
      if (Array.isArray(value)) {
        const vector = value.slice(0, 2).map(number => Cast.toNumber(number));
        return [vector[0] || 0, vector[1] || 0];
      }

      if (value && typeof value === "object") {
        if (Object.prototype.hasOwnProperty.call(value, "x") && Object.prototype.hasOwnProperty.call(value, "y")) {
          return [Cast.toNumber(value.x) || 0, Cast.toNumber(value.y) || 0];
        }
      }

      const text = Cast.toString(value);
      const parts = text.split(",");
      if (parts.length >= 2) {
        return [Cast.toNumber(parts[0]) || 0, Cast.toNumber(parts[1]) || 0];
      }

      const vector = Cast.toArray(value).slice(0, 2).map(number => Cast.toNumber(number));
      return [vector[0] || 0, vector[1] || 0];
    }
  }

  Scratch.extensions.register(new VectorShimsProofOfConcept());
})(Scratch);
