// Responsive layout: keeps the 750x750 game canvas letterboxed at a 1:1
// aspect ratio inside whatever space is left over after the touch controls
// are placed - below the canvas in portrait, either side of it in
// landscape - per the brief. Desktop/mouse users never see the controls.
(function (global) {
  "use strict";

  function isTouchDevice() {
    return (
      window.matchMedia("(pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0 ||
      "ontouchstart" in window
    );
  }

  class Layout {
    constructor() {
      this.app = document.getElementById("app");
      this.sideLeft = document.getElementById("side-left");
      this.sideRight = document.getElementById("side-right");
      this.stageWrap = document.getElementById("stage-wrap");
      this.stageArea = document.getElementById("stage-area");
      this.bottomBar = document.getElementById("bottom-bar");
      this.stickZone = document.getElementById("stick-zone");
      this.fireZone = document.getElementById("fire-zone");

      this.touch = isTouchDevice();

      if (this.touch) {
        this.stickZone.classList.remove("hidden");
        this.fireZone.classList.remove("hidden");
      }

      this._onResize = this._onResize.bind(this);
      window.addEventListener("resize", this._onResize);
      window.addEventListener("orientationchange", this._onResize);
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", this._onResize);
      }

      this._lastOrientation = null;
      this._applyOrientation();
      this._resizeCanvas();
    }

    _onResize() {
      this._applyOrientation();
      this._resizeCanvas();
    }

    _isPortrait() {
      return window.innerHeight >= window.innerWidth;
    }

    _applyOrientation() {
      if (!this.touch) {
        // Desktop: controls stay hidden, side panels collapsed.
        return;
      }
      const portrait = this._isPortrait();
      if (portrait === this._lastOrientation) return;
      this._lastOrientation = portrait;

      if (portrait) {
        this.bottomBar.appendChild(this.stickZone);
        this.bottomBar.appendChild(this.fireZone);
      } else {
        this.sideLeft.appendChild(this.stickZone);
        this.sideRight.appendChild(this.fireZone);
      }
    }

    _resizeCanvas() {
      // Let the flex layout settle, then measure what's left for the
      // square stage.
      const wrapRect = this.stageWrap.getBoundingClientRect();
      const barHeight = this.touch && this._lastOrientation ? this.bottomBar.offsetHeight : 0;
      const availW = wrapRect.width;
      const availH = wrapRect.height - barHeight;
      const size = Math.max(50, Math.floor(Math.min(availW, availH)));

      this.stageArea.style.width = size + "px";
      this.stageArea.style.height = size + "px";
    }
  }

  global.Layout = Layout;
})(window);
