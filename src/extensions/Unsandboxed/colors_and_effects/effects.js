"use strict";

class UnsandboxedColorsEffects {
  constructor(Scratch, vm) {
    this.Scratch = Scratch;
    this.vm = vm;
    this.renderer = vm && vm.runtime ? vm.runtime.renderer : null;
    this.extensionClass = UnsandboxedColorsEffects;
    this.Cast = Scratch.UnsandboxedMod.Cast;
    this._registeredEffects = false;
  }

  reset() {
    this._registeredEffects = false;
  }

  static SIZE_UNIFORM_DECLARATION = [
    "#ifndef CUSTOM_U_SKINSIZE_DECLARED",
    "#define CUSTOM_U_SKINSIZE_DECLARED",
    "uniform vec2 u_skinSize;",
    "#endif // CUSTOM_U_SKINSIZE_DECLARED"
  ].join("\n");

  static channelEffects = {
    red: "tintred",
    green: "tintgreen",
    blue: "tintblue"
  };

  static solidChannelEffects = {
    red: "tintsolidred",
    green: "tintsolidgreen",
    blue: "tintsolidblue"
  };

  static outlineColorEffects = {
    red: "outlinered",
    green: "outlinegreen",
    blue: "outlineblue"
  };

  static outlineOpacityEffect = "outlineopacity";

  static outlineWidthEffect = "outlinewidth";

  static colorChannelSwizzles = {
    red: "r",
    green: "g",
    blue: "b"
  };

  static shaderFxEffects = {
    chromatic: {
      menuName: "chromatic",
      showInMenu: true,
      converter: value => Math.abs(Number(value) || 0) / 100,
      shapeChanges: false,
      fragmentUniforms: [
        "uniform float u_chromatic;",
        UnsandboxedColorsEffects.SIZE_UNIFORM_DECLARATION
      ].join("\n"),
      fragmentColor: [
        "{",
        "    float amount = max(u_chromatic, 0.0);",
        "    if (amount > 0.0) {",
        "        vec2 texel = vec2(1.0) / max(u_skinSize, vec2(1.0));",
        "        vec2 dir = texcoord0 - vec2(0.5);",
        "        float dirLen = length(dir);",
        "        dir = dirLen > epsilon ? (dir / dirLen) : vec2(1.0, 0.0);",
        "        vec2 shift = dir * texel * (amount * 2.0);",
        "        vec4 redSample = sampleSpriteTexel(clamp(texcoord0 + shift, vec2(0.0), vec2(1.0)));",
        "        vec4 greenSample = sampleSpriteTexel(texcoord0);",
        "        vec4 blueSample = sampleSpriteTexel(clamp(texcoord0 - shift, vec2(0.0), vec2(1.0)));",
        "        gl_FragColor = vec4(redSample.r, greenSample.g, blueSample.b, greenSample.a);",
        "    }",
        "}"
      ].join("\n")
    },
    dissolve: {
      menuName: "dissolve",
      showInMenu: true,
      converter: value => Math.abs(Number(value) || 0) / 100,
      shapeChanges: false,
      fragmentUniforms: [
        "uniform float u_dissolve;",
        UnsandboxedColorsEffects.SIZE_UNIFORM_DECLARATION
      ].join("\n"),
      fragmentColor: [
        "{",
        "    float amount = clamp(u_dissolve, 0.0, 1.0);",
        "    if (amount > 0.0) {",
        "        vec2 pixel = floor(texcoord0 * max(u_skinSize, vec2(1.0)));",
        "        float noise = fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);",
        "        if (noise < amount) {",
        "            discard;",
        "        }",
        "    }",
        "}"
      ].join("\n")
    },
    posterize: {
      menuName: "posterize",
      showInMenu: true,
      converter: value => Math.abs(Number(value) || 0) / 100,
      shapeChanges: false,
      fragmentUniforms: [
        "uniform float u_posterize;",
        UnsandboxedColorsEffects.SIZE_UNIFORM_DECLARATION
      ].join("\n"),
      fragmentColor: [
        "{",
        "    float amount = max(u_posterize, 0.0);",
        "    if (amount > 0.0) {",
        "        float levels = max(2.0, 12.0 - min(amount, 1.0) * 10.0);",
        "        vec3 straight = gl_FragColor.rgb / max(gl_FragColor.a, epsilon);",
        "        vec2 p = floor(texcoord0 * max(u_skinSize, vec2(1.0)));",
        "        float noise = fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453) - 0.5;",
        "        straight = clamp(straight + (noise / levels), 0.0, 1.0);",
        "        straight = floor(straight * levels + 0.5) / levels;",
        "        gl_FragColor.rgb = straight * gl_FragColor.a;",
        "    }",
        "}"
      ].join("\n")
    }
  };

  _makeEffectInfo(effectName, effectDefinition) {
    return {
      menuName: effectDefinition.menuName,
      showInMenu: effectDefinition.showInMenu !== false,
      converter: effectDefinition.converter,
      shapeChanges: effectDefinition.shapeChanges,
      boundsPadding: effectDefinition.boundsPadding,
      fragmentUniforms: effectDefinition.fragmentUniforms,
      fragmentColor: effectDefinition.fragmentColor,
      effectName
    };
  }

  _makeSolidChannelEffectInfo(effectName, channelKey) {
    const channelSwizzle = this.extensionClass.colorChannelSwizzles[channelKey] || "r";
    return {
      menuName: effectName,
      showInMenu: false,
      converter: value => this.Cast.toNumber(value),
      shapeChanges: false,
      fragmentUniforms: [
        `uniform float u_${effectName};`
      ].join("\n"),
      fragmentColor: [
        "{",
        `    vec4 color = gl_FragColor;`,
        `    if (u_${effectName} > 0.0) {`,
        `        float channel = clamp((u_${effectName} - 1.0) / 255.0, 0.0, 1.0);`,
        "        float alpha = clamp(color.a, 0.0, 1.0);",
        "        vec3 straight = alpha > epsilon ? (color.rgb / alpha) : vec3(0.0);",
        `        straight.${channelSwizzle} = channel;`,
        "        color.rgb = straight * alpha;",
        "    }",
        "    gl_FragColor = color;",
        "}"
      ].join("\n")
    };
  }

  _makeOutlineColorChannelEffectInfo(effectName, channelKey) {
    if (channelKey !== "red") {
      return {
        menuName: effectName,
        showInMenu: false,
        converter: value => this.Cast.toNumber(value),
        shapeChanges: false,
        fragmentUniforms: [
          `uniform float u_${effectName};`
        ].join("\n")
      };
    }

    return {
      menuName: effectName,
      showInMenu: false,
      converter: value => this.Cast.toNumber(value),
      shapeChanges: false,
      fragmentUniforms: [
        `uniform float u_${this.extensionClass.outlineOpacityEffect};`,
        `uniform float u_${this.extensionClass.outlineWidthEffect};`,
        `uniform float u_${this.extensionClass.outlineColorEffects.red};`,
        `uniform float u_${this.extensionClass.outlineColorEffects.green};`,
        `uniform float u_${this.extensionClass.outlineColorEffects.blue};`,
        UnsandboxedColorsEffects.SIZE_UNIFORM_DECLARATION
      ].join("\n"),
      fragmentColor: [
        "{",
        `    float outlineOpacity = clamp(u_${this.extensionClass.outlineOpacityEffect}, 0.0, 100.0) / 100.0;`,
        `    float outlineWidth = max(u_${this.extensionClass.outlineWidthEffect}, 0.0);`,
        "    if (outlineOpacity > epsilon && outlineWidth > epsilon) {",
        "        vec2 texel = vec2(1.0) / max(u_skinSize, vec2(1.0));",
        "        float centerAlpha = clamp(gl_FragColor.a, 0.0, 1.0);",
        "        float minDistance = outlineWidth + 1.0;",
        "        for (int oy = -20; oy <= 20; oy++) {",
        "            for (int ox = -20; ox <= 20; ox++) {",
        "                vec2 pixelOffset = vec2(float(ox), float(oy));",
        "                float distancePx = length(pixelOffset);",
        "                if (distancePx > outlineWidth) continue;",
        "                float sampleAlpha = sampleSpriteTexel(texcoord0 + (pixelOffset * texel)).a;",
        "                if (sampleAlpha > epsilon) {",
        "                    minDistance = min(minDistance, distancePx);",
        "                }",
        "            }",
        "        }",
        "        if (minDistance <= outlineWidth) {",
        `            vec3 outlineColor = vec3(clamp((u_${this.extensionClass.outlineColorEffects.red} - 1.0) / 255.0, 0.0, 1.0), clamp((u_${this.extensionClass.outlineColorEffects.green} - 1.0) / 255.0, 0.0, 1.0), clamp((u_${this.extensionClass.outlineColorEffects.blue} - 1.0) / 255.0, 0.0, 1.0));`,
        "            float inner = max(outlineWidth - 1.0, 0.0);",
        "            float edgeFactor = 1.0 - smoothstep(inner, outlineWidth + epsilon, minDistance);",
        "            float outlineAlpha = clamp(edgeFactor * outlineOpacity, 0.0, 1.0);",
        "            float underlayAlpha = outlineAlpha * (1.0 - centerAlpha);",
        "            gl_FragColor.rgb = gl_FragColor.rgb + (outlineColor * underlayAlpha);",
        "            gl_FragColor.a = centerAlpha + underlayAlpha;",
        "        }",
        "    }",
        "}"
      ].join("\n")
    };
  }

  _makeOutlineWidthEffectInfo() {
    return {
      menuName: this.extensionClass.outlineWidthEffect,
      showInMenu: false,
      converter: value => {
        const n = this.Cast.toNumber(value);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(20, n));
      },
      shapeChanges: true,
      boundsPadding: value => {
        const width = Math.max(0, Math.min(20, this.Cast.toNumber(value)));
        return {
          texels: Math.ceil(width) + 2
        };
      }
    };
  }

  registerEffects() {
    if (this._registeredEffects) return true;
    if (!this.vm || typeof this.vm.registerSpriteShaderEffect !== "function") return false;

    const register = (effectName, info) => {
      this.vm.registerSpriteShaderEffect(effectName, info);
    };

    for (const [channelName, effectName] of Object.entries(this.extensionClass.channelEffects)) {
      const channelSwizzle = this.extensionClass.colorChannelSwizzles[channelName] || "r";
      register(effectName, this._makeEffectInfo(effectName, {
        menuName: effectName,
        showInMenu: false,
        converter: value => this.Cast.toNumber(value),
        shapeChanges: false,
        fragmentUniforms: [
          `uniform float u_${effectName};`,
          `uniform float u_${this.extensionClass.solidChannelEffects.red};`,
          `uniform float u_${this.extensionClass.solidChannelEffects.green};`,
          `uniform float u_${this.extensionClass.solidChannelEffects.blue};`
        ].join("\n"),
        fragmentColor: [
          "{",
          `    vec4 color = gl_FragColor;`,
          `    float hasSolid = step(0.5, u_${this.extensionClass.solidChannelEffects.red}) + step(0.5, u_${this.extensionClass.solidChannelEffects.green}) + step(0.5, u_${this.extensionClass.solidChannelEffects.blue});`,
          "    if (hasSolid < 0.5) {",
          "        float alpha = clamp(color.a, 0.0, 1.0);",
          "        vec3 straight = alpha > epsilon ? (color.rgb / alpha) : vec3(0.0);",
          `        float amount = clamp(u_${effectName}, -100.0, 100.0) / 100.0;`,
          `        straight.${channelSwizzle} = clamp(straight.${channelSwizzle} + amount, 0.0, 1.0);`,
          "        color.rgb = straight * alpha;",
          "    }",
          "    gl_FragColor = color;",
          "}"
        ].join("\n")
      }));
    }

    for (const [channelName, effectName] of Object.entries(this.extensionClass.solidChannelEffects)) {
      register(effectName, this._makeSolidChannelEffectInfo(effectName, channelName));
    }

    for (const [channelName, effectName] of Object.entries(this.extensionClass.outlineColorEffects)) {
      register(effectName, this._makeOutlineColorChannelEffectInfo(effectName, channelName));
    }

    register(this.extensionClass.outlineOpacityEffect, {
      menuName: this.extensionClass.outlineOpacityEffect,
      showInMenu: false,
      converter: value => this.Cast.toNumber(value),
      shapeChanges: false,
      fragmentUniforms: [
        `uniform float u_${this.extensionClass.outlineOpacityEffect};`
      ].join("\n")
    });

    register(this.extensionClass.outlineWidthEffect, this._makeOutlineWidthEffectInfo());

    for (const [effectName, effectDefinition] of Object.entries(this.extensionClass.shaderFxEffects)) {
      register(effectName, this._makeEffectInfo(effectName, effectDefinition));
    }

    this._registeredEffects = true;
    return true;
  }

}

module.exports = UnsandboxedColorsEffects;
