(function () {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const loadingOverlay = document.getElementById("loading-overlay");
  const loadingFill = document.getElementById("loading-bar-fill");
  const loadingText = document.getElementById("loading-text");
  const unlockOverlay = document.getElementById("unlock-overlay");

  const stickBase = document.getElementById("stick-base");
  const stickNub = document.getElementById("stick-nub");
  const fireButton = document.getElementById("fire-button");

  window.audioManager = new AudioManager();

  Input.init({ canvas, unlockOverlay, stickBase, stickNub, fireButton });
  new Layout();

  Assets.loadAll((frac) => {
    loadingFill.style.width = Math.round(frac * 100) + "%";
  })
    .then(({ images, audio }) => {
      window.IMAGES = images;
      audioManager.init(audio);

      loadingText.textContent = "Ready";
      loadingOverlay.classList.add("hidden");
      unlockOverlay.classList.remove("hidden");

      const beginGame = () => {
        unlockOverlay.removeEventListener("pointerdown", beginGame);
        unlockOverlay.removeEventListener("click", beginGame);
        window.removeEventListener("keydown", beginGameKey);

        audioManager.unlock();
        unlockOverlay.classList.add("hidden");
        Input.consumeTap(); // discard the gesture that triggered unlock
        Game.start();
        startLoop();
      };
      const beginGameKey = () => beginGame();

      unlockOverlay.addEventListener("pointerdown", beginGame);
      window.addEventListener("keydown", beginGameKey);
    })
    .catch((err) => {
      console.error(err);
      loadingText.textContent = "Failed to load assets: " + err.message;
    });

  function startLoop() {
    const STEP = 1000 / FPS;
    let last = performance.now();
    let accumulator = 0;
    const MAX_STEPS = 5;

    function loop(now) {
      requestAnimationFrame(loop);
      let delta = now - last;
      last = now;
      if (delta > 250) delta = 250; // clamp after tab-switch / stall
      accumulator += delta;

      let steps = 0;
      while (accumulator >= STEP && steps < MAX_STEPS) {
        Game.frame(ctx);
        accumulator -= STEP;
        steps++;
      }
    }
    requestAnimationFrame(loop);
  }
})();
