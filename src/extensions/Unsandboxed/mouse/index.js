(function (Scratch) {
  "use strict";

  const Cast = Scratch.UnsandboxedMod.Cast;
  const translate = Scratch.translate;

  class UnsandboxedMouseBlocks {
    /**
     * The extension identifier of this block package.
     * @type {string}
     */
    static extensionId = "usbMouse";

    constructor() {
      /**
       * The Scratch Virtual Machine instance.
       */
      this.vm = Scratch.vm;

      /**
       * The runtime instantiating this block package.
       */
      this.runtime = this.vm.runtime;

      /**
       * The Scratch stage canvas.
       * @type {HTMLCanvasElement}
       */
      this.canvas = Scratch.renderer.canvas;

      /**
       * Scratch mouse IO device.
       */
      this.mouseDevice = this.runtime.ioDevices.mouse;

      /** @type {string} */
      this.nativeCursor = "default";
      /** @type {null|string} */
      this.customCursorImageName = null;
      /** @type {string} */
      this.currentCanvasCursor = this.nativeCursor;

      this.cursorImagePosition = "0,0";
      this.cursorImageSize = "32x32";

      this.scrollX = 0;
      this.scrollY = 0;
      this.scrollDistance = 0;
      this.scrollDistanceUp = 0;
      this.scrollDistanceDown = 0;

      this.isLocked = false;
      this.isPointerLockEnabled = false;

      this.canvasRect = this.canvas.getBoundingClientRect();

      /** @type {HTMLCanvasElement|null} */
      this._rawSkinCanvas = null;
      /** @type {CanvasRenderingContext2D|null} */
      this._rawSkinContext = null;

      this._originalMousePostData = null;
      this._originalRuntimeStep = null;

      this.cursors = [
        "default",
        "pointer",
        "move",
        "grab",
        "grabbing",
        "text",
        "vertical-text",
        "wait",
        "progress",
        "help",
        "context-menu",
        "zoom-in",
        "zoom-out",
        "crosshair",
        "cell",
        "not-allowed",
        "copy",
        "alias",
        "no-drop",
        "all-scroll",
        "col-resize",
        "row-resize",
        "n-resize",
        "e-resize",
        "s-resize",
        "w-resize",
        "ne-resize",
        "nw-resize",
        "se-resize",
        "sw-resize",
        "ew-resize",
        "ns-resize",
        "nesw-resize",
        "nwse-resize",
      ];

      this._boundHandleResize = this._handleResize.bind(this);
      this._boundHandleWheel = this._handleWheel.bind(this);
      this._boundHandleMouseDown = this._handleMouseDown.bind(this);
      this._boundHandleMouseUp = this._handleMouseUp.bind(this);
      this._boundHandleMouseMove = this._handleMouseMove.bind(this);
      this._boundHandlePointerLockChange = this._handlePointerLockChange.bind(
        this
      );
      this._boundHandlePointerLockError = this._handlePointerLockError.bind(
        this
      );

      this._cursorObserver = new MutationObserver(
        this._updateCanvasCursor.bind(this)
      );

      this._overrideRuntimeFunctions();
      this._attachDomListeners();
      this._attachRuntimeListeners();
      this._updateCanvasCursor();
    }

    _attachRuntimeListeners() {
      this.runtime.on("RUNTIME_DISPOSED", () => {
        this.setCur({
          cur: "default",
        });
        this.setLocked({
          enabled: "false",
        });
        this._detachDomListeners();
        this._restoreRuntimeFunctions();
      });

      this.runtime.on("AFTER_EXECUTE", () => {
        this.scrollY = 0;
      });
    }

    _attachDomListeners() {
      window.addEventListener("resize", this._boundHandleResize);
      this.canvas.addEventListener("wheel", this._boundHandleWheel);
      document.addEventListener("mousedown", this._boundHandleMouseDown, true);
      document.addEventListener("mouseup", this._boundHandleMouseUp, true);
      document.addEventListener("mousemove", this._boundHandleMouseMove, true);
      document.addEventListener(
        "pointerlockchange",
        this._boundHandlePointerLockChange
      );
      document.addEventListener(
        "pointerlockerror",
        this._boundHandlePointerLockError
      );

      // scratch-gui may reset cursor style when changing layout/fullscreen.
      this._cursorObserver.observe(this.canvas, {
        attributeFilter: ["style"],
        attributes: true,
      });
    }

    _detachDomListeners() {
      window.removeEventListener("resize", this._boundHandleResize);
      this.canvas.removeEventListener("wheel", this._boundHandleWheel);
      document.removeEventListener(
        "mousedown",
        this._boundHandleMouseDown,
        true
      );
      document.removeEventListener("mouseup", this._boundHandleMouseUp, true);
      document.removeEventListener(
        "mousemove",
        this._boundHandleMouseMove,
        true
      );
      document.removeEventListener(
        "pointerlockchange",
        this._boundHandlePointerLockChange
      );
      document.removeEventListener(
        "pointerlockerror",
        this._boundHandlePointerLockError
      );
      this._cursorObserver.disconnect();
    }

    _overrideRuntimeFunctions() {
      if (!this._originalMousePostData) {
        this._originalMousePostData = this.mouseDevice.postData.bind(this.mouseDevice);
      }

      this.mouseDevice.postData = data => {
        if (!this.isPointerLockEnabled) {
          return this._originalMousePostData(data);
        }
        return undefined;
      };

      if (!this._originalRuntimeStep) {
        this._originalRuntimeStep = this.runtime._step;
      }

      this.runtime._step = (...args) => {
        const ret = this._originalRuntimeStep.call(this.runtime, ...args);
        if (this.isPointerLockEnabled) {
          const { width, height } = this.canvasRect;
          this.mouseDevice._clientX = width / 2;
          this.mouseDevice._clientY = height / 2;
          this.mouseDevice._scratchX = 0;
          this.mouseDevice._scratchY = 0;
        }
        return ret;
      };
    }

    _restoreRuntimeFunctions() {
      if (this._originalMousePostData) {
        this.mouseDevice.postData = this._originalMousePostData;
      }
      if (this._originalRuntimeStep) {
        this.runtime._step = this._originalRuntimeStep;
      }
    }

    _handleResize() {
      this.canvasRect = this.canvas.getBoundingClientRect();
    }

    _handleWheel(event) {
      this.scrollX = event.deltaX;
      this.scrollY = event.deltaY;

      this.runtime.startHats("usbMouse_whenMouseWheel", {
        DIRECTION: "any",
      });

      if (this.scrollY > 0) {
        this.runtime.startHats("usbMouse_whenMouseWheel", {
          DIRECTION: "down",
        });
        this.scrollDistance -= 1;
        this.scrollDistanceDown -= 1;
      } else if (this.scrollY < 0) {
        this.runtime.startHats("usbMouse_whenMouseWheel", {
          DIRECTION: "up",
        });
        this.scrollDistance += 1;
        this.scrollDistanceUp += 1;
      }
    }

    _handleMouseDown(e) {
      // @ts-expect-error EventTarget and Node are structurally compatible here.
      if (!this.canvas.contains(e.target)) {
        return;
      }

      if (this.isLocked) {
        this._postMouseData(e, true);
      } else if (this.isPointerLockEnabled) {
        this.canvas.requestPointerLock();
      }
    }

    _handleMouseUp(e) {
      if (this.isLocked) {
        this._postMouseData(e, false);
        return;
      }

      // @ts-expect-error EventTarget and Node are structurally compatible here.
      if (this.isPointerLockEnabled && this.canvas.contains(e.target)) {
        this.canvas.requestPointerLock();
      }
    }

    _handleMouseMove(e) {
      if (this.isLocked) {
        this._postMouseData(e);
      }
    }

    _handlePointerLockChange() {
      this.isLocked = document.pointerLockElement === this.canvas;
    }

    _handlePointerLockError(e) {
      // eslint-disable-next-line no-console
      console.error("Pointer lock error", e);
    }

    _postMouseData(e, isDown) {
      const { movementX, movementY } = e;
      const { width, height } = this.canvasRect;
      const x = this.mouseDevice._clientX + movementX;
      const y = this.mouseDevice._clientY - movementY;

      this.mouseDevice._clientX = x;
      this.mouseDevice._clientY = y;

      if (this.runtime.renderer) {
        const [scratchX, scratchY] = this.runtime.renderer.clientSpaceToScratchPoint(x, y);
        this.mouseDevice._scratchX = scratchX;
        this.mouseDevice._scratchY = scratchY;
      } else {
        this.mouseDevice._scratchX = this.runtime.stageWidth * (x / width - 0.5);
        this.mouseDevice._scratchY = -this.runtime.stageHeight * (y / height - 0.5);
      }

      if (typeof isDown === "boolean") {
        this._originalMousePostData({
          button: e.button,
          isDown,
          x,
          y,
          canvasWidth: width,
          canvasHeight: height,
        });
      }
    }

    _updateCanvasCursor() {
      if (this.canvas.style.cursor !== this.currentCanvasCursor) {
        this.canvas.style.cursor = this.currentCanvasCursor;
      }
    }

    /**
     * Parse strings like "60x12" or "77,1"
     * @param {string} string
     * @returns {[number, number]}
     */
    _parseTuple(string) {
      const [a, b] = (`${string}`).split(/[ ,x]/);
      return [Number(a) || 0, Number(b) || 0];
    }

    /**
     * @param {string} size eg. "48x84"
     * @returns {string}
     */
    _formatUnreliableSize(size) {
      return translate(
        {
          default: "{size} (unreliable)",
          description: "[size] is replaced with a size in pixels such as '48x48'",
        },
        { size }
      );
    }

    /**
     * @param {number} width
     * @param {number} height
     * @returns {[HTMLCanvasElement, CanvasRenderingContext2D]}
     */
    _getRawSkinCanvas(width, height) {
      if (!this._rawSkinCanvas) {
        this._rawSkinCanvas = document.createElement("canvas");
        this._rawSkinContext = this._rawSkinCanvas.getContext("2d");
        if (!this._rawSkinContext) {
          throw new Error("Could not get 2d rendering context");
        }
      }

      // Setting canvas size also clears it.
      this._rawSkinCanvas.width = width;
      this._rawSkinCanvas.height = height;
      return [this._rawSkinCanvas, this._rawSkinContext];
    }

    /**
     * @param {RenderWebGL.Skin} skin
     * @returns {string} A data URI for the skin.
     */
    _encodeSkinToURL(skin) {
      const svgSkin = /** @type {RenderWebGL.SVGSkin} */ (skin);
      if (svgSkin._svgImage) {
        return svgSkin._svgImage.src;
      }

      // The silhouette path is slower but works consistently across runtimes.
      const silhouette = skin._silhouette;
      silhouette.unlazy();

      const imageData = new ImageData(
        silhouette._colorData,
        silhouette._width,
        silhouette._height
      );
      const [canvas, ctx] = this._getRawSkinCanvas(
        silhouette._width,
        silhouette._height
      );
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL();
    }

    /**
     * @param {VM.Costume} costume
     * @param {number} maxWidth
     * @param {number} maxHeight
     * @returns {{uri: string, width: number, height: number}}
     */
    _costumeToCursor(costume, maxWidth, maxHeight) {
      const skin = this.vm.renderer._allSkins[costume.skinId];
      const imageURI = this._encodeSkinToURL(skin);

      let width = skin.size[0];
      let height = skin.size[1];
      if (width > maxWidth) {
        height = height * (maxWidth / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = width * (maxHeight / height);
        height = maxHeight;
      }
      width = Math.round(width);
      height = Math.round(height);

      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
      svg += `<image href="${imageURI}" width="${width}" height="${height}" />`;
      svg += "</svg>";
      const svgURI = `data:image/svg+xml;,${encodeURIComponent(svg)}`;

      return {
        uri: svgURI,
        width,
        height,
      };
    }

    _resolveCostume(costumeArg, util) {
      const target = util.target;
      const costumes = target.getCostumes();
      if (!costumes.length) {
        return null;
      }

      const costumeName = Cast.toString(costumeArg);
      const costumeIndex = target.getCostumeIndexByName(costumeName);
      if (costumeIndex !== -1) {
        return costumes[costumeIndex];
      }

      if (!(isNaN(costumeName) || Cast.isWhiteSpace(costumeName))) {
        const parsedIndex = Math.floor(Number(costumeName)) - 1;
        const wrappedIndex = ((parsedIndex % costumes.length) + costumes.length) % costumes.length;
        return costumes[wrappedIndex];
      }

      return null;
    }

    _setCursorFromCostume(costume) {
      const [maxWidth, maxHeight] = this._parseTuple(this.cursorImageSize).map(i =>
        Math.max(0, i)
      );

      let encodedCostume;
      try {
        encodedCostume = this._costumeToCursor(costume, maxWidth, maxHeight);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }

      if (encodedCostume) {
        const [percentX, percentY] = this._parseTuple(this.cursorImagePosition).map(
          i => Math.max(0, Math.min(100, i)) / 100
        );
        const x = percentX * encodedCostume.width;
        const y = percentY * encodedCostume.height;

        this.currentCanvasCursor = `url("${encodedCostume.uri}") ${x} ${y}, ${this.nativeCursor}`;
        this._updateCanvasCursor();
      }

      this.customCursorImageName = costume.name;
    }

    getInfo() {
      return {
        id: UnsandboxedMouseBlocks.extensionId,
        color1: "#3fc0ac",
        name: translate("Mouse"),
        blocks: [
          {
            opcode: "whenMouseWheel",
            blockType: Scratch.BlockType.EVENT,
            text: translate("when mouse scrolled [DIRECTION]"),
            isEdgeActivated: false,
            arguments: {
              DIRECTION: {
                type: Scratch.ArgumentType.STRING,
                menu: "direction",
              },
            },
          },
          {
            opcode: "getMouseScrolling",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("mouse scrolling [DIRECTION]?"),
            disableMonitor: true,
            arguments: {
              DIRECTION: {
                type: Scratch.ArgumentType.STRING,
                menu: "direction",
              },
            },
          },
          {
            opcode: "getMouseWheelDirection",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("mouse wheel direction"),
          },
          "---",
          {
            opcode: "setMouseTravel",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set mouse [DIRECTION] distance to [VALUE]"),
            arguments: {
              DIRECTION: {
                type: Scratch.ArgumentType.STRING,
                menu: "direction",
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0,
              },
            },
          },
          {
            opcode: "mouseWheelTravel",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("mouse [DIRECTION] distance"),
            disableMonitor: true,
            arguments: {
              DIRECTION: {
                type: Scratch.ArgumentType.STRING,
                menu: "direction",
              },
            },
          },
          "---",
          {
            opcode: "setLocked",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set pointer lock [enabled]"),
            disableMonitor: true,
            arguments: {
              enabled: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "true",
                menu: "enabled",
              },
            },
          },
          {
            opcode: "isLocked",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("is pointer locked?"),
          },
          "---",
          {
            opcode: "setCur",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set cursor to [cur]"),
            arguments: {
              cur: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "pointer",
                menu: "cursors",
              },
            },
          },
          {
            opcode: "setCursorImage",
            blockType: Scratch.BlockType.COMMAND,
            // Deprecated: kept for backward compatibility with existing projects.
            hideFromPalette: true,
            deprecated: true,
            text: translate(
              "set cursor to current costume center: [position] max size: [size]"
            ),
            arguments: {
              position: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0,0",
                menu: "imagePositions",
              },
              size: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "32x32",
                menu: "imageSizes",
              },
            },
          },
          "---",
          {
            opcode: "setCursorPosition",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set cursor center to [position]"),
            arguments: {
              position: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0,0",
                menu: "imagePositions",
              },
            },
          },
          {
            opcode: "setCursorSize",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("set cursor max size to [size]"),
            arguments: {
              size: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "32x32",
                menu: "imageSizes",
              },
            },
          },
          {
            opcode: "setCursorCostume",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("use [COSTUME] as cursor"),
            arguments: {
              COSTUME: {
                type: Scratch.ArgumentType.COSTUME,
              },
            },
          },
          {
            opcode: "hideCur",
            blockType: Scratch.BlockType.COMMAND,
            text: translate("hide cursor"),
          },
          {
            opcode: "getCur",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("cursor"),
          },
        ],
        menus: {
          direction: {
            acceptReporters: false,
            items: ["up", "down", "any"],
          },
          enabled: {
            acceptReporters: true,
            items: [
              {
                text: "enabled",
                value: "true",
              },
              {
                text: "disabled",
                value: "false",
              },
            ],
          },
          cursors: {
            acceptReporters: true,
            items: this.cursors,
          },
          imagePositions: {
            acceptReporters: true,
            items: [
              // [x, y] where x is [0=left, 100=right] and y is [0=top, 100=bottom]
              { text: translate("top left"), value: "0,0" },
              { text: translate("top right"), value: "100,0" },
              { text: translate("bottom left"), value: "0,100" },
              { text: translate("bottom right"), value: "100,100" },
              { text: translate("center"), value: "50,50" },
            ],
          },
          imageSizes: {
            acceptReporters: true,
            items: [
              // Browsers ignore cursor images above 128px in either dimension.
              { text: "4x4", value: "4x4" },
              { text: "8x8", value: "8x4" },
              { text: "12x12", value: "12x12" },
              { text: "16x16", value: "16x16" },
              { text: "32x32", value: "32x32" },
              { text: this._formatUnreliableSize("48x48"), value: "48x48" },
              { text: this._formatUnreliableSize("64x64"), value: "64x64" },
              { text: this._formatUnreliableSize("128x128"), value: "128x128" },
            ],
          },
        },
      };
    }

    getMouseScrolling(args) {
      const direction = Cast.toString(args.DIRECTION);
      switch (direction) {
        case "up":
          return this.scrollY < 0;
        case "down":
          return this.scrollY > 0;
        case "any":
          return this.scrollY !== 0;
        default:
          return false;
      }
    }

    getMouseWheelDirection() {
      return this.scrollY / 100;
    }

    mouseWheelTravel(args) {
      const direction = Cast.toString(args.DIRECTION);
      switch (direction) {
        case "up":
          return this.scrollDistanceUp;
        case "down":
          return this.scrollDistanceDown;
        case "any":
          return this.scrollDistance;
        default:
          return 0;
      }
    }

    setMouseTravel(args) {
      const direction = Cast.toString(args.DIRECTION);
      const value = Cast.toNumber(args.VALUE);
      switch (direction) {
        case "up":
          this.scrollDistanceUp = value;
          return value;
        case "down":
          this.scrollDistanceDown = value;
          return value;
        default:
          this.scrollDistance = value;
          return value;
      }
    }

    setLocked(args) {
      this.isPointerLockEnabled = Cast.toBoolean(args.enabled);
      if (!this.isPointerLockEnabled && this.isLocked) {
        document.exitPointerLock();
      }
    }

    isLocked() {
      return this.isLocked;
    }

    setCur(args) {
      const newCursor = Cast.toString(args.cur);
      // Prevent arbitrary url(...) values from triggering network requests.
      if (this.cursors.includes(newCursor) || newCursor === "none") {
        this.nativeCursor = newCursor;
        this.customCursorImageName = null;
        this.currentCanvasCursor = newCursor;
        this._updateCanvasCursor();
      }
    }

    setCursorImage(args, util) {
      this.cursorImagePosition = Cast.toString(args.position);
      this.cursorImageSize = Cast.toString(args.size);

      const currentCostume =
        util.target.getCostumes()[util.target.currentCostume];
      if (!currentCostume) {
        return;
      }

      this._setCursorFromCostume(currentCostume);
    }

    setCursorPosition(args) {
      this.cursorImagePosition = Cast.toString(args.position);
    }

    setCursorSize(args) {
      this.cursorImageSize = Cast.toString(args.size);
    }

    setCursorCostume(args, util) {
      const costume = this._resolveCostume(args.COSTUME, util);
      if (!costume) {
        return;
      }

      this._setCursorFromCostume(costume);
    }

    hideCur() {
      this.setCur({
        cur: "none",
      });
    }

    getCur() {
      if (this.customCursorImageName !== null) {
        return this.customCursorImageName;
      }
      return this.nativeCursor;
    }
  }

  Scratch.extensions.register(new UnsandboxedMouseBlocks());
})(Scratch);
