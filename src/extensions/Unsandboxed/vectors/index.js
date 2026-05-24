(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  class UnsandboxedVectorsBlocks {
    static extensionId = "usbVectors";

    constructor() {
      this.runtime = Scratch.vm && Scratch.vm.runtime;
      this.components = ["x", "y"];
    }

    getInfo() {
      return {
        id: UnsandboxedVectorsBlocks.extensionId,
        name: translate("Vectors"),
        color1: "#856ead",
        blocks: [
          {
            opcode: "vec2",
            blockType: Scratch.BlockType.VECTOR,
            text: translate("x: [X] y: [Y]"),
            arguments: {
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              }
            }
          },
          "---",
          {
            opcode: "componentOfVector",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("[COMPONENT] of [VECTOR]"),
            arguments: {
              COMPONENT: {
                type: Scratch.ArgumentType.STRING,
                menu: "components"
              },
              VECTOR: {
                type: Scratch.ArgumentType.VECTOR
              }
            }
          },
          {
            opcode: "addVectors",
            blockType: Scratch.BlockType.VECTOR,
            text: translate("[VECTOR1] + [VECTOR2]"),
            arguments: {
              VECTOR1: {
                type: Scratch.ArgumentType.VECTOR
              },
              VECTOR2: {
                type: Scratch.ArgumentType.VECTOR
              }
            }
          },
          {
            opcode: "subtractVectors",
            blockType: Scratch.BlockType.VECTOR,
            text: translate("[VECTOR1] - [VECTOR2]"),
            arguments: {
              VECTOR1: {
                type: Scratch.ArgumentType.VECTOR
              },
              VECTOR2: {
                type: Scratch.ArgumentType.VECTOR
              }
            }
          },
          {
            opcode: "scaleVector",
            blockType: Scratch.BlockType.VECTOR,
            text: translate("[VECTOR] * [SCALAR]"),
            arguments: {
              VECTOR: {
                type: Scratch.ArgumentType.VECTOR
              },
              SCALAR: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: "dotProduct",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("dot [VECTOR1] and [VECTOR2]"),
            tooltip: translate("Returns how aligned two vectors are: positive means similar direction, zero means perpendicular, negative means opposite."),
            arguments: {
              VECTOR1: {
                type: Scratch.ArgumentType.VECTOR
              },
              VECTOR2: {
                type: Scratch.ArgumentType.VECTOR
              }
            }
          },
          "---",
          {
            opcode: "magnitude",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("magnitude of [VECTOR]"),
            arguments: {
              VECTOR: {
                type: Scratch.ArgumentType.VECTOR
              }
            }
          },
          {
            opcode: "distanceBetween",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("distance from [POSITION1] to [POSITION2]"),
            arguments: {
              POSITION1: {
                type: Scratch.ArgumentType.POSITION
              },
              POSITION2: {
                type: Scratch.ArgumentType.POSITION
              }
            }
          },
          {
            opcode: "directionBetween",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("direction from [POSITION1] to [POSITION2]"),
            arguments: {
              POSITION1: {
                type: Scratch.ArgumentType.POSITION
              },
              POSITION2: {
                type: Scratch.ArgumentType.POSITION
              }
            }
          },
          "---",
          {
            opcode: "vectorFromDirection",
            blockType: Scratch.BlockType.VECTOR,
            text: translate("vector from direction [DEGREES] length [LENGTH]"),
            tooltip: translate("Creates a 2D vector using direction in Scratch degrees and the given length."),
            arguments: {
              DEGREES: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 90
              },
              LENGTH: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: "normalizeVector",
            blockType: Scratch.BlockType.VECTOR,
            text: translate("normalize [VECTOR]"),
            tooltip: translate("Returns a unit-length vector in the same direction. Zero vector stays zero."),
            arguments: {
              VECTOR: {
                type: Scratch.ArgumentType.VECTOR
              }
            }
          },
          "---",
          {
            opcode: "rotateVector",
            blockType: Scratch.BlockType.VECTOR,
            text: translate("rotate [VECTOR] by [DEGREES]"),
            arguments: {
              VECTOR: {
                type: Scratch.ArgumentType.VECTOR
              },
              DEGREES: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 90
              }
            }
          },
          {
            opcode: "lerpVectors",
            blockType: Scratch.BlockType.VECTOR,
            text: translate("interpolate from [POSITION1] to [POSITION2] by [T]"),
            arguments: {
              POSITION1: {
                type: Scratch.ArgumentType.POSITION
              },
              POSITION2: {
                type: Scratch.ArgumentType.POSITION
              },
              T: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0.5
              }
            }
          },
          {
            opcode: "moveTowards",
            blockType: Scratch.BlockType.VECTOR,
            text: translate("move [POSITION] toward [TARGET] by [STEP]"),
            arguments: {
              POSITION: {
                type: Scratch.ArgumentType.POSITION
              },
              TARGET: {
                type: Scratch.ArgumentType.POSITION
              },
              STEP: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            }
          },
          {
            opcode: "nearestPoint",
            blockType: Scratch.BlockType.VECTOR,
            text: translate("nearest point to [POSITION] in [POINTS]"),
            arguments: {
              POSITION: {
                type: Scratch.ArgumentType.POSITION
              },
              POINTS: {
                type: Scratch.ArgumentType.ARRAY,
                // TODO: This is either too hardcoded or not hardcoded enough. 
                shadow: {
                  type: "array",
                  mutation: {
                    shadowtype: "math_position"
                  }
                }
              }
            }
          },
          "---",
          {
            opcode: "goToVector",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("go to [POSITION]"),
            arguments: {
              POSITION: {
                type: Scratch.ArgumentType.POSITION
              }
            }
          }
        ],
        menus: {
          components: {
            acceptReporters: false,
            items: this.components
          }
        }
      };
    }

    vec2(args) {
      return this._makeVector([Cast.toNumber(args.X), Cast.toNumber(args.Y)]);
    }

    componentOfVector(args) {
      const index = this.components.indexOf(Cast.toString(args.COMPONENT));
      if (index < 0) {
        return 0;
      }
      const vector = this._toVector(Cast.toArray(args.VECTOR));
      return vector[index] || 0;
    }

    distanceBetween(args) {
      const vector1 = this._toVector(Cast.toArray(args.POSITION1));
      const vector2 = this._toVector(Cast.toArray(args.POSITION2));
      const size = Math.max(vector1.length, vector2.length);

      let sum = 0;
      for (let i = 0; i < size; i++) {
        const d = (vector2[i] || 0) - (vector1[i] || 0);
        sum += d * d;
      }
      return Math.sqrt(sum);
    }

    directionBetween(args) {
      const vector1 = this._toVector(Cast.toArray(args.POSITION1));
      const vector2 = this._toVector(Cast.toArray(args.POSITION2));

      const dx = (vector2[0] || 0) - (vector1[0] || 0);
      const dy = (vector2[1] || 0) - (vector1[1] || 0);
      return (Math.atan2(dx, dy) * 180) / Math.PI;
    }

    vectorFromDirection(args) {
      const direction = Cast.toNumber(args.DEGREES);
      const length = Cast.toNumber(args.LENGTH);
      const radians = (direction * Math.PI) / 180;
      return this._makeVector([Math.sin(radians) * length, Math.cos(radians) * length]);
    }

    rotateVector(args) {
      const vector = this._toVector(Cast.toArray(args.VECTOR));
      const degrees = Cast.toNumber(args.DEGREES);
      const magnitude = Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]);
      if (magnitude === 0) {
        return this._makeVector([0, 0]);
      }
      const direction = (Math.atan2(vector[0], vector[1]) * 180) / Math.PI;
      const radians = ((direction + degrees) * Math.PI) / 180;
      return this._makeVector([Math.sin(radians) * magnitude, Math.cos(radians) * magnitude]);
    }

    addVectors(args) {
      const vector1 = this._toVector(Cast.toArray(args.VECTOR1));
      const vector2 = this._toVector(Cast.toArray(args.VECTOR2));
      return this._makeVector(this._zipMap(vector1, vector2, (a, b) => a + b));
    }

    subtractVectors(args) {
      const vector1 = this._toVector(Cast.toArray(args.VECTOR1));
      const vector2 = this._toVector(Cast.toArray(args.VECTOR2));
      return this._makeVector(this._zipMap(vector1, vector2, (a, b) => a - b));
    }

    scaleVector(args) {
      const vector = this._toVector(Cast.toArray(args.VECTOR));
      const scalar = Cast.toNumber(args.SCALAR);
      return this._makeVector(vector.map(value => value * scalar));
    }

    dotProduct(args) {
      const vector1 = this._toVector(Cast.toArray(args.VECTOR1));
      const vector2 = this._toVector(Cast.toArray(args.VECTOR2));
      const size = Math.max(vector1.length, vector2.length);

      let dot = 0;
      for (let i = 0; i < size; i++) {
        dot += (vector1[i] || 0) * (vector2[i] || 0);
      }
      return dot;
    }

    magnitude(args) {
      const vector = this._toVector(Cast.toArray(args.VECTOR));
      let sum = 0;
      for (const value of vector) {
        sum += value * value;
      }
      return Math.sqrt(sum);
    }

    normalizeVector(args) {
      const vector = this._toVector(Cast.toArray(args.VECTOR));
      const magnitude = Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]);
      if (magnitude === 0) {
        return this._makeVector([0, 0]);
      }
      return this._makeVector([vector[0] / magnitude, vector[1] / magnitude]);
    }

    lerpVectors(args) {
      const vector1 = this._toVector(Cast.toArray(args.POSITION1));
      const vector2 = this._toVector(Cast.toArray(args.POSITION2));
      const t = Cast.toNumber(args.T);
      return this._makeVector([
        vector1[0] + (vector2[0] - vector1[0]) * t,
        vector1[1] + (vector2[1] - vector1[1]) * t
      ]);
    }

    moveTowards(args) {
      const vector = this._toVector(Cast.toArray(args.POSITION));
      const target = this._toVector(Cast.toArray(args.TARGET));
      const step = Cast.toNumber(args.STEP);
      if (step <= 0) {
        return this._makeVector(vector);
      }

      const dx = target[0] - vector[0];
      const dy = target[1] - vector[1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance === 0 || step >= distance) {
        return this._makeVector(target);
      }

      const ratio = step / distance;
      return this._makeVector([vector[0] + dx * ratio, vector[1] + dy * ratio]);
    }

    nearestPoint(args) {
      const vector = this._toVector(Cast.toArray(args.POSITION));
      const points = Cast.toArray(args.POINTS);

      let closestDistance = Infinity;
      let closestVector = [];

      for (const point of points) {
        const pointVector = this._toVector(Cast.toArray(point));
        const distance = this._distanceSquared(vector, pointVector);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestVector = pointVector;
        }
      }

      return this._makeVector(closestVector);
    }

    goToVector(args, util) {
      if (!util || !util.target || typeof util.target.setXY !== "function") {
        return;
      }
      const vector = this._toVector(Cast.toArray(args.POSITION));
      util.target.setXY(vector[0] || 0, vector[1] || 0);
    }

    _createBuiltInType(typeId, payload) {
      if (this.runtime && typeof this.runtime.createBuiltInCustomTypeValue === "function") {
        const value = this.runtime.createBuiltInCustomTypeValue(typeId, payload);
        if (value && typeof value === "object") {
          return value;
        }
      }
      return payload;
    }

    _makeVector(value) {
      return this._createBuiltInType("vector", this._toVector(value));
    }

    _makePosition(value) {
      return this._createBuiltInType("position", this._toVector(value));
    }

    _distanceSquared(vector1, vector2) {
      const size = Math.max(vector1.length, vector2.length);
      let sum = 0;
      for (let i = 0; i < size; i++) {
        const d = (vector2[i] || 0) - (vector1[i] || 0);
        sum += d * d;
      }
      return sum;
    }

    _zipMap(vector1, vector2, mapper) {
      const size = Math.max(vector1.length, vector2.length);
      const out = [];
      for (let i = 0; i < size; i++) {
        out.push(mapper(vector1[i] || 0, vector2[i] || 0));
      }
      return out;
    }

    _toVector(value) {
      const vector = Cast.toArray(value).slice(0, 2).map(number => Cast.toNumber(number));
      return [vector[0] || 0, vector[1] || 0];
    }
  }

  Scratch.extensions.register(new UnsandboxedVectorsBlocks());
})(Scratch);
