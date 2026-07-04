// Per-pixel collision masks, mirroring pygame.mask.from_surface() (alpha > 0
// counts as solid) and mask.overlap() (true if any solid pixel overlaps).
(function (global) {
  "use strict";

  const cache = new WeakMap();
  const scratch = document.createElement("canvas");
  const scratchCtx = scratch.getContext("2d", { willReadFrequently: true });

  // Opening this page via file:// (rather than a real http(s) origin) makes
  // Chrome/Safari treat locally-loaded images as tainting the canvas, which
  // blocks getImageData entirely. Rather than crash every frame, fall back
  // to bounding-box collision (still very close in practice, since sprites
  // have little transparent padding) and warn once.
  let pixelReadsBlocked = false;

  function buildMask(img) {
    if (pixelReadsBlocked) return null;
    if (cache.has(img)) return cache.get(img);

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    scratch.width = w;
    scratch.height = h;
    scratchCtx.clearRect(0, 0, w, h);
    scratchCtx.drawImage(img, 0, 0);

    let data;
    try {
      data = scratchCtx.getImageData(0, 0, w, h).data;
    } catch (err) {
      pixelReadsBlocked = true;
      console.warn(
        "Defender: pixel-level collision unavailable (canvas tainted by file:// origin). " +
          "Falling back to bounding-box collision. Serve this folder over http(s) for pixel-perfect hitboxes."
      );
      return null;
    }

    const bits = new Uint8Array(w * h);
    for (let i = 0; i < bits.length; i++) {
      bits[i] = data[i * 4 + 3] > 0 ? 1 : 0;
    }

    const mask = { width: w, height: h, bits };
    cache.set(img, mask);
    return mask;
  }

  function aabbOverlap(a, ax, ay, b, bx, by) {
    const aw = a.naturalWidth || a.width;
    const ah = a.naturalHeight || a.height;
    const bw = b.naturalWidth || b.width;
    const bh = b.naturalHeight || b.height;
    return !(ax + aw <= bx || bx + bw <= ax || ay + ah <= by || by + bh <= ay);
  }

  // Returns true if the solid pixels of image `a` positioned at (ax, ay)
  // overlap the solid pixels of image `b` positioned at (bx, by).
  function collide(a, ax, ay, b, bx, by) {
    const ma = buildMask(a);
    const mb = buildMask(b);
    if (!ma || !mb) return aabbOverlap(a, ax, ay, b, bx, by);

    const x0 = Math.max(ax, bx);
    const y0 = Math.max(ay, by);
    const x1 = Math.min(ax + ma.width, bx + mb.width);
    const y1 = Math.min(ay + ma.height, by + mb.height);
    if (x0 >= x1 || y0 >= y1) return false;

    const aOffX = x0 - ax;
    const aOffY = y0 - ay;
    const bOffX = x0 - bx;
    const bOffY = y0 - by;
    const rw = x1 - x0;
    const rh = y1 - y0;

    for (let row = 0; row < rh; row++) {
      const aRow = (aOffY + row) * ma.width + aOffX;
      const bRow = (bOffY + row) * mb.width + bOffX;
      for (let col = 0; col < rw; col++) {
        if (ma.bits[aRow + col] && mb.bits[bRow + col]) return true;
      }
    }
    return false;
  }

  global.Masks = { buildMask, collide };
})(window);
