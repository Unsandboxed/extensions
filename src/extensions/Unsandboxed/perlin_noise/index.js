(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  /**
   * Unsandboxed blocks for deterministic Perlin noise generation.
   */
  class UnsandboxedPerlinNoiseBlocks {
    static extensionId = "usbPerlinNoise";

    constructor() {
      this.vm = Scratch.vm;
      this.runtime = this.vm.runtime;
      this._seed = 0;
      this._perm = new Uint8Array(512);
      this._seedExtents = new Map();
      this._baseDetail = 4;
      this._fractalScale = 6;
      this._fractalOctaves = 4;
      this._fractalPersistence = 0.5;
      this._fractalLacunarity = 2;
      this._setSeed(0);
    }

    _clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    _toFiniteNumber(value, fallback = 0) {
      const number = Cast.toNumber(value);
      return Number.isFinite(number) ? number : fallback;
    }

    _toSeedInt(seedInput) {
      const text = Cast.toString(seedInput);
      if (text === "") {
        return 0;
      }

      const numeric = Number(text);
      if (Number.isFinite(numeric)) {
        return Math.floor(numeric) >>> 0;
      }

      // FNV-1a 32-bit hash for stable string seed support.
      let hash = 0x811c9dc5;
      for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
      }
      return hash >>> 0;
    }

    _mulberry32(seed) {
      let state = seed >>> 0;
      return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    _setSeed(seedInput) {
      const seed = this._toSeedInt(seedInput);
      this._seed = seed;

      const base = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        base[i] = i;
      }

      const random = this._mulberry32(seed);
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        const tmp = base[i];
        base[i] = base[j];
        base[j] = tmp;
      }

      for (let i = 0; i < 512; i++) {
        this._perm[i] = base[i & 255];
      }

      // Each seed keeps its own dynamic map extent, reset on seed change.
      this._seedExtents.set(seed, this._createSeedExtent(seed));
    }

    _createSeedExtent(seed) {
      const random = this._mulberry32((seed ^ 0x9e3779b9) >>> 0);
      return {
        maxAbsX: 1,
        maxAbsY: 1,
        maxAbsZ: 1,
        // Deterministic non-integer offsets prevent repeated sampling exactly
        // on integer lattice points, which often returns 0 in Perlin noise.
        offsetX: (random() * 997) + 0.123,
        offsetY: (random() * 991) + 0.456,
        offsetZ: (random() * 983) + 0.789
      };
    }

    _getSeedExtent() {
      if (!this._seedExtents.has(this._seed)) {
        this._seedExtents.set(this._seed, this._createSeedExtent(this._seed));
      }
      return this._seedExtents.get(this._seed);
    }

    _mapCoordinate(valueInput, axisKey, offsetKey, detail = 1) {
      const value = this._toFiniteNumber(valueInput, 0);
      const extent = this._getSeedExtent();
      const abs = Math.abs(value);
      const nextMax = Math.max(abs, extent[axisKey]);
      extent[axisKey] = nextMax;

      // +1 keeps frontier samples from collapsing to a constant value while
      // still expanding the dynamic map as the largest call increases.
      const denominator = Math.max(1, nextMax + 1);
      const normalized = value / denominator;
      return (normalized * detail) + extent[offsetKey];
    }

    _fade(t) {
      return t * t * t * (t * ((t * 6) - 15) + 10);
    }

    _lerp(a, b, t) {
      return a + (t * (b - a));
    }

    _grad(hash, x, y, z) {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
      const uTerm = (h & 1) === 0 ? u : -u;
      const vTerm = (h & 2) === 0 ? v : -v;
      return uTerm + vTerm;
    }

    _noise3(xInput, yInput, zInput) {
      const x = this._toFiniteNumber(xInput, 0);
      const y = this._toFiniteNumber(yInput, 0);
      const z = this._toFiniteNumber(zInput, 0);

      const xFloor = Math.floor(x);
      const yFloor = Math.floor(y);
      const zFloor = Math.floor(z);

      const X = xFloor & 255;
      const Y = yFloor & 255;
      const Z = zFloor & 255;

      const xRel = x - xFloor;
      const yRel = y - yFloor;
      const zRel = z - zFloor;

      const u = this._fade(xRel);
      const v = this._fade(yRel);
      const w = this._fade(zRel);

      const A = this._perm[X] + Y;
      const AA = this._perm[A] + Z;
      const AB = this._perm[A + 1] + Z;
      const B = this._perm[X + 1] + Y;
      const BA = this._perm[B] + Z;
      const BB = this._perm[B + 1] + Z;

      const result = this._lerp(
        this._lerp(
          this._lerp(
            this._grad(this._perm[AA], xRel, yRel, zRel),
            this._grad(this._perm[BA], xRel - 1, yRel, zRel),
            u
          ),
          this._lerp(
            this._grad(this._perm[AB], xRel, yRel - 1, zRel),
            this._grad(this._perm[BB], xRel - 1, yRel - 1, zRel),
            u
          ),
          v
        ),
        this._lerp(
          this._lerp(
            this._grad(this._perm[AA + 1], xRel, yRel, zRel - 1),
            this._grad(this._perm[BA + 1], xRel - 1, yRel, zRel - 1),
            u
          ),
          this._lerp(
            this._grad(this._perm[AB + 1], xRel, yRel - 1, zRel - 1),
            this._grad(this._perm[BB + 1], xRel - 1, yRel - 1, zRel - 1),
            u
          ),
          v
        ),
        w
      );

      return this._clamp(result, -1, 1);
    }

    _toOutputRange(value, range) {
      if (Cast.toString(range) === "normalized") {
        return this._clamp((value + 1) / 2, 0, 1);
      }
      return value;
    }

    _fractalNoise2D(xInput, yInput, scaleInput, octavesInput, persistenceInput, lacunarityInput) {
      const x = this._toFiniteNumber(xInput, 0);
      const y = this._toFiniteNumber(yInput, 0);
      const detail = Math.max(0.0001, Math.abs(this._toFiniteNumber(scaleInput, 6)));
      const octaves = this._clamp(Math.floor(Math.abs(this._toFiniteNumber(octavesInput, 4))), 1, 12);
      const persistence = this._clamp(this._toFiniteNumber(persistenceInput, 0.5), 0, 1);
      const lacunarity = Math.max(0.0001, this._toFiniteNumber(lacunarityInput, 2));

      const mappedX = this._mapCoordinate(x, "maxAbsX", "offsetX", 1);
      const mappedY = this._mapCoordinate(y, "maxAbsY", "offsetY", 1);

      let total = 0;
      let amplitude = 1;
      let frequency = detail;
      let amplitudeSum = 0;

      for (let octave = 0; octave < octaves; octave++) {
        const octaveOffset = octave * 97.213;
        const sample = this._noise3(mappedX * frequency, mappedY * frequency, octaveOffset);
        total += sample * amplitude;
        amplitudeSum += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
      }

      if (amplitudeSum === 0) {
        return 0;
      }
      return this._clamp(total / amplitudeSum, -1, 1);
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedPerlinNoiseBlocks.extensionId,
        name: translate("Perlin Noise"),
        color1: "#5a8fd8",
        blocks: [
          {
            opcode: "setSeed",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set perlin seed [SEED]"),
            arguments: {
              SEED: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 0
              }
            }
          },
          {
            opcode: "setFractalSettings",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set fractal [SETTING] to [VALUE]"),
            arguments: {
              SETTING: {
                type: Scratch.ArgumentType.STRING,
                menu: "fractalSetting"
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 6
              }
            }
          },
          "---",
          {
            opcode: "noise1D",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("perlin [RANGE] noise x [X]"),
            arguments: {
              RANGE: {
                type: Scratch.ArgumentType.STRING,
                menu: "range"
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              }
            }
          },
          {
            opcode: "noise2D",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("perlin [RANGE] noise x [X] y [Y]"),
            arguments: {
              RANGE: {
                type: Scratch.ArgumentType.STRING,
                menu: "range"
              },
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
          {
            opcode: "noise3D",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("perlin [RANGE] noise x [X] y [Y] z [Z]"),
            arguments: {
              RANGE: {
                type: Scratch.ArgumentType.STRING,
                menu: "range"
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              },
              Z: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              }
            }
          },
          "---",
          {
            opcode: "fractalNoise2D",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("fractal perlin [RANGE] x [X] y [Y]"),
            arguments: {
              RANGE: {
                type: Scratch.ArgumentType.STRING,
                menu: "range"
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              }
            }
          }
        ],
        menus: {
          fractalSetting: {
            acceptReporters: false,
            items: [
              {
                text: translate("scale"),
                value: "scale"
              },
              {
                text: translate("octaves"),
                value: "octaves"
              },
              {
                text: translate("persistence"),
                value: "persistence"
              },
              {
                text: translate("lacunarity"),
                value: "lacunarity"
              }
            ]
          },
          range: {
            acceptReporters: false,
            items: [
              {
                text: translate("raw (-1 to 1)"),
                value: "raw"
              },
              {
                text: translate("normalized (0 to 1)"),
                value: "normalized"
              }
            ]
          }
        }
      };
    }

    setSeed(args) {
      this._setSeed(args.SEED);
    }

    setFractalSettings(args) {
      // Backward compatibility for older project data using SCALE/OCTAVES/etc inputs.
      const hasLegacyArgs =
        Object.prototype.hasOwnProperty.call(args, "SCALE") ||
        Object.prototype.hasOwnProperty.call(args, "OCTAVES") ||
        Object.prototype.hasOwnProperty.call(args, "PERSISTENCE") ||
        Object.prototype.hasOwnProperty.call(args, "LACUNARITY");

      if (hasLegacyArgs) {
        this._fractalScale = Math.max(0.0001, Math.abs(this._toFiniteNumber(args.SCALE, this._fractalScale)));
        this._fractalOctaves = this._clamp(
          Math.floor(Math.abs(this._toFiniteNumber(args.OCTAVES, this._fractalOctaves))),
          1,
          12
        );
        this._fractalPersistence = this._clamp(this._toFiniteNumber(args.PERSISTENCE, this._fractalPersistence), 0, 1);
        this._fractalLacunarity = Math.max(0.0001, this._toFiniteNumber(args.LACUNARITY, this._fractalLacunarity));
        return;
      }

      const setting = Cast.toString(args.SETTING);
      const value = this._toFiniteNumber(args.VALUE, 0);

      if (setting === "scale") {
        this._fractalScale = Math.max(0.0001, Math.abs(value));
      } else if (setting === "octaves") {
        this._fractalOctaves = this._clamp(Math.floor(Math.abs(value)), 1, 12);
      } else if (setting === "persistence") {
        this._fractalPersistence = this._clamp(value, 0, 1);
      } else if (setting === "lacunarity") {
        this._fractalLacunarity = Math.max(0.0001, value);
      }
    }

    noise1D(args) {
      const x = this._mapCoordinate(args.X, "maxAbsX", "offsetX", this._baseDetail);
      const value = this._noise3(x, 0, 0);
      return this._toOutputRange(value, args.RANGE);
    }

    noise2D(args) {
      const x = this._mapCoordinate(args.X, "maxAbsX", "offsetX", this._baseDetail);
      const y = this._mapCoordinate(args.Y, "maxAbsY", "offsetY", this._baseDetail);
      const value = this._noise3(x, y, 0);
      return this._toOutputRange(value, args.RANGE);
    }

    noise3D(args) {
      const x = this._mapCoordinate(args.X, "maxAbsX", "offsetX", this._baseDetail);
      const y = this._mapCoordinate(args.Y, "maxAbsY", "offsetY", this._baseDetail);
      const z = this._mapCoordinate(args.Z, "maxAbsZ", "offsetZ", this._baseDetail);
      const value = this._noise3(x, y, z);
      return this._toOutputRange(value, args.RANGE);
    }

    fractalNoise2D(args) {
      const value = this._fractalNoise2D(
        args.X,
        args.Y,
        this._fractalScale,
        this._fractalOctaves,
        this._fractalPersistence,
        this._fractalLacunarity
      );
      return this._toOutputRange(value, args.RANGE);
    }
  }

  Scratch.extensions.register(new UnsandboxedPerlinNoiseBlocks());
})(Scratch);
