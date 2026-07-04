// Keyboard + touch input. Produces the same four directional flags and a
// "fire held" flag that Defender.py reads from pygame.key.get_pressed(),
// plus a polled "tap" flag standing in for pygame's MOUSEBUTTONDOWN event
// (used to start/advance the menu, between-level and victory screens).
(function (global) {
  "use strict";

  const state = {
    left: false,
    right: false,
    up: false,
    down: false,
    fire: false,
    tapPending: false
  };

  const keyboard = { left: false, right: false, up: false, down: false, fire: false };
  const stick = { left: false, right: false, up: false, down: false };

  function recompute() {
    state.left = keyboard.left || stick.left;
    state.right = keyboard.right || stick.right;
    state.up = keyboard.up || stick.up;
    state.down = keyboard.down || stick.down;
  }

  function onKeyDown(e) {
    switch (e.code) {
      case "ArrowLeft":
        keyboard.left = true;
        e.preventDefault();
        break;
      case "ArrowRight":
        keyboard.right = true;
        e.preventDefault();
        break;
      case "ArrowUp":
        keyboard.up = true;
        e.preventDefault();
        break;
      case "ArrowDown":
        keyboard.down = true;
        e.preventDefault();
        break;
      case "Space":
        keyboard.fire = true;
        state.fire = true;
        e.preventDefault();
        break;
      case "Enter":
        state.tapPending = true;
        break;
      default:
        return;
    }
    recompute();
  }

  function onKeyUp(e) {
    switch (e.code) {
      case "ArrowLeft":
        keyboard.left = false;
        break;
      case "ArrowRight":
        keyboard.right = false;
        break;
      case "ArrowUp":
        keyboard.up = false;
        break;
      case "ArrowDown":
        keyboard.down = false;
        break;
      case "Space":
        keyboard.fire = false;
        state.fire = keyboard.fire || state.fireTouch;
        break;
      default:
        return;
    }
    recompute();
  }

  function markTap() {
    state.tapPending = true;
  }

  function setupStick(base, nub) {
    let activePointerId = null;
    let cx = 0;
    let cy = 0;
    let radius = 1;

    const DEAD = 0.22;

    function begin(e) {
      base.setPointerCapture(e.pointerId);
      activePointerId = e.pointerId;
      const rect = base.getBoundingClientRect();
      cx = rect.left + rect.width / 2;
      cy = rect.top + rect.height / 2;
      radius = rect.width / 2;
      base.classList.add("pressed");
      update(e);
      markTap();
    }

    function update(e) {
      let dx = (e.clientX - cx) / radius;
      let dy = (e.clientY - cy) / radius;
      const mag = Math.hypot(dx, dy);
      if (mag > 1) {
        dx /= mag;
        dy /= mag;
      }

      nub.style.transform = `translate(${dx * radius * 0.55}px, ${dy * radius * 0.55}px)`;

      if (mag < DEAD) {
        stick.left = stick.right = stick.up = stick.down = false;
      } else {
        stick.left = dx < -0.28;
        stick.right = dx > 0.28;
        stick.up = dy < -0.28;
        stick.down = dy > 0.28;
      }
      recompute();
    }

    function end(e) {
      if (e.pointerId !== activePointerId) return;
      activePointerId = null;
      stick.left = stick.right = stick.up = stick.down = false;
      nub.style.transform = "translate(0px, 0px)";
      base.classList.remove("pressed");
      recompute();
    }

    base.addEventListener("pointerdown", begin);
    base.addEventListener("pointermove", (e) => {
      if (e.pointerId === activePointerId) update(e);
    });
    base.addEventListener("pointerup", end);
    base.addEventListener("pointercancel", end);
  }

  function setupFireButton(btn) {
    let activePointerId = null;

    function begin(e) {
      btn.setPointerCapture(e.pointerId);
      activePointerId = e.pointerId;
      state.fireTouch = true;
      state.fire = true;
      btn.classList.add("pressed");
      markTap();
      e.preventDefault();
    }
    function end(e) {
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      activePointerId = null;
      state.fireTouch = false;
      state.fire = keyboard.fire || false;
      btn.classList.remove("pressed");
    }

    btn.addEventListener("pointerdown", begin);
    btn.addEventListener("pointerup", end);
    btn.addEventListener("pointercancel", end);
    btn.addEventListener("pointerleave", end);
  }

  function init({ canvas, unlockOverlay, stickBase, stickNub, fireButton }) {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    canvas.addEventListener("pointerdown", markTap);
    unlockOverlay.addEventListener("pointerdown", markTap);

    setupStick(stickBase, stickNub);
    setupFireButton(fireButton);
  }

  function consumeTap() {
    if (state.tapPending) {
      state.tapPending = false;
      return true;
    }
    return false;
  }

  global.Input = { state, init, consumeTap };
})(window);
