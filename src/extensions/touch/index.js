(function (Scratch) {
  "use strict";

  /**
   * Code adapted from "Multi Touch" by Skyhigh173
   * https://github.com/TurboWarp/extensions/pull/1432/
   */

  const Cast = Scratch.UnsandboxedMod.Cast;
  const MathUtil = Scratch.UnsandboxedMod.Math;
  const translate = Scratch.translate;

  /**
   * Unsandboxed blocks for multitouch.
   * @constructor
   */
  class UnsandboxedMultiTouchBlocks {
    /**
     * The extension identifier of this block package.
     * @type {string}
     */
    static extensionId = "usbTouch";

    constructor() {
      /**
       * The Scratch Virtual Machine instance.
       * @type {VirtualMachine}
       */
      this.vm = Scratch.vm;

      /**
       * The runtime instantiating this block package.
       * @type {Runtime}
       */
      this.runtime = this.vm.runtime;

      /**
       * The Scratch WebGL renderer instance.
       * @type {RenderWebGL}
       */
      this.renderer = this.runtime.renderer;

      /**
       * @type {HTMLDivElement}
       */
      this.canvasDiv = null;

      /**
       * @type {Array.<Touch>}
       */
      this._touches = [];

      /**
       * @type {Array.<null|Touch>}
       */
      this._fingers = [];

      this._setup();
    }

    // Bounding rect coordinates are in client coordinates, meaning that they
    // are in pixels relative to the upper left corner of the visible browser
    // window.  These coordinates change when you scroll the browser window.
    get boundingRect() {
      return this.renderer.canvas.getBoundingClientRect();
    }

    _scale(x, sRmin, sRmax, tRmin, tRmax) {
      return (tRmax - tRmin) / (sRmax - sRmin) * (x - sRmin) + tRmin;
    }

    _propMap = {
      // Clamp coordinates to the stage bounds.
      // TODO: Will the size of the stage affect this?
      _x: (clientX) => MathUtil.clamp(
        -240, 
        this._scale(clientX, this.bound.left, this.bound.right, -240, 240), 
        240
      ),
      _y: (clientY) => MathUtil.clamp(
        -180,
        this._scale(clientY, this.bound.bottom, this.bound.top, -180, 180),
        180
      ),

      x: (prop) => this._propMap._x(t.clientX),
      y: (prop) => this._propMap._y(t.clientY),
      duration: (prop) => (Date.now() - t.date) / 1000,
      force: (prop) => t.force,
    };

    /**
     * Setup multitouch on this runtime.
     */
    _setup() {
      this.canvasDiv = this.renderer.canvas.parentElement;

      /**
       * @param {TouchEvent} event 
       */
      const updateTouchList = event => {
        this._touches = [...event.touches];

        // update position
        this._touches.forEach(prop => {
          // if theres a new finger...
          const index = this._fingers.findIndex(finger => finger?.identifier === prop.identifier);
          if (index == -1) {
            this._fingers.push(prop);
            // extra infos
            this._fingers.at(-1).date = Date.now();
            this._fingers.at(-1).prevX = t.clientX;
            this._fingers.at(-1).prevY = t.clientY;
            this._fingers.at(-1).prevDate = Date.now();
            this._fingers.at(-1).nowDate = Date.now();
          } else {
            const finger = this._fingers[index];
            const date = finger.date, oldX = finger.clientX, oldY = finger.clientY, oldDate = finger.nowDate;
            this._fingers[index] = t;
            this._fingers[index].date = date;
            this._fingers[index].prevX = oldX;
            this._fingers[index].prevY = oldY;
            this._fingers[index].prevDate = oldDate;
            this._fingers[index].nowDate = Date.now();
          };
        });

        this._fingers.forEach((prop, index) => {
          // if the finger releases...
          if (this._touches.findIndex(f => f.identifier === prop?.identifier) == -1) {
            this._fingers[index] = null;
          };
        });

        // clear trailing null values
        while (this._fingers.length > 0 && this._fingers.at(-1) === null) {
          this._fingers.pop();
        };
      }
      this.canvasDiv.addEventListener("touchstart", event => updateTouchList(event));
      this.canvasDiv.addEventListener("touchmove", event => updateTouchList(event));
      this.canvasDiv.addEventListener("touchend", event => updateTouchList(event));
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
      return {
        id: UnsandboxedMultiTouchBlocks.extensionId,
        name: translate("Touch Controls"),
        color1: "#5CB1D6",
        blocks: [
          {
            opcode: "touchAvailable",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("is touch available?"),
            extensions: ["colours_sensing"],
          },
          {
            opcode: "maxMultiTouch",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("maximum finger count"),
            extensions: ["colours_sensing"],
          },
          "---",
          {
            opcode: "numOfFingers",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("number of fingers"),
            extensions: ["colours_sensing"],
          },
          {
            opcode: "numOfFingersID",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("number of fingers ID"),
            extensions: ["colours_sensing"],
          },
          {
            opcode: "propOfFinger",
            blockType: Scratch.BlockType.REPORTER,
            text: translate("[PROP] of finger [ID]"),
            arguments: {
              PROP: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "x",
                menu: "prop",
              },
              ID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            },
            extensions: ["colours_sensing"],
          },
          {
            opcode: "fingerExists",
            blockType: Scratch.BlockType.BOOLEAN,
            text: translate("finger [ID] exists?"),
            arguments: {
              ID: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1
              }
            },
            extensions: ["colours_sensing"],
          }
        ],
        menus: {
          prop: {
            acceptReporters: true,
            /**
             * x: x position
             * y: y position
             * duration: time since finger pressed
             * force (some devices only): force of finger press
             */
            items: [
              "x", "y",
              {
                text: translate("duration"),
                value: "duration",
              },
              {
                text: translate("force"),
                value: "force",
              }
            ],
          },
        },
      };
    }

    touchAvailable() {
      return window.navigator.maxTouchPoints > 0;
    }
    maxMultiTouch() {
      return window.navigator.maxTouchPoints;
    }

    numOfFingers() {
      return this._touches.length;
    }

    numOfFingersID() {
      return this._fingers.length;
    }

    propOfFinger(args, util) {
      const PROP = this._propMap[PROP];
      const ID = Cast.toNumber(args.ID) - 1;
      if (ID >= this._fingers.length || this._fingers[ID] === null) return 0;

      return PROP(this._fingers[ID]);
    }

    fingerExists(args) {
      args.ID = Cast.toNumber(args.ID) - 1;
      return args.ID < this._fingers.length && this._fingers[args.ID] !== null;
    }
  }
  Scratch.extensions.register(new UnsandboxedMultiTouchBlocks());
})(Scratch);
