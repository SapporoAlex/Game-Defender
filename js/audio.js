// Lightweight audio manager: clones <audio> elements so sound effects can
// overlap (matching pygame.mixer.Sound.play() spawning on a free channel),
// and keeps a single music channel with volume/loop control.
(function (global) {
  "use strict";

  class AudioManager {
    constructor() {
      this.sfxSources = {};
      this.musicSources = {};
      this.currentMusic = null;
      this.currentMusicKey = null;
      this.muted = false;
    }

    init(audioAssets) {
      for (const [key, el] of Object.entries(audioAssets)) {
        if (key.startsWith("music_")) {
          this.musicSources[key] = el;
        } else {
          this.sfxSources[key] = el;
        }
      }
    }

    playSfx(key, volume = 1) {
      const src = this.sfxSources[key];
      if (!src) return null;
      const node = src.cloneNode(true);
      node.volume = this.muted ? 0 : volume;
      node.play().catch(() => {});
      node.addEventListener("ended", () => node.remove());
      return node;
    }

    playMusic(key, { volume = 1, loop = true } = {}) {
      if (this.currentMusicKey === key && this.currentMusic && !this.currentMusic.paused) {
        this.currentMusic.volume = this.muted ? 0 : volume;
        return;
      }
      this.stopMusic();
      // Reuse the original preloaded element (rather than cloning) so music
      // keeps playing under strict mobile autoplay policies that only trust
      // elements already touched by unlock()'s user-gesture play/pause pass.
      const node = this.musicSources[key];
      if (!node) return;
      node.loop = loop;
      node.volume = this.muted ? 0 : volume;
      node.currentTime = 0;
      node.play().catch(() => {});
      this.currentMusic = node;
      this.currentMusicKey = key;
    }

    stopMusic() {
      if (this.currentMusic) {
        this.currentMusic.pause();
        this.currentMusic.currentTime = 0;
        this.currentMusic = null;
        this.currentMusicKey = null;
      }
    }

    // Unlocks audio playback on iOS/Safari by playing+pausing everything
    // once inside a real user-gesture handler.
    unlock() {
      const all = [...Object.values(this.sfxSources), ...Object.values(this.musicSources)];
      for (const el of all) {
        const p = el.play();
        if (p && p.catch) {
          p.then(() => {
            el.pause();
            el.currentTime = 0;
          }).catch(() => {});
        }
      }
    }
  }

  global.AudioManager = AudioManager;
})(window);
