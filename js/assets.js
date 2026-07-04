// Asset manifest + loader. Mirrors the images/sounds loaded at the top of Defender.py.
(function (global) {
  "use strict";

  const IMAGE_MANIFEST = {
    green_enemy: "assets/pixel_bmp_green_small.png",
    blue_enemy: "assets/pixel_zombies_blue_small.png",
    health: "assets/health.png",
    upgrade: "assets/upgrade.png",

    player_up: "assets/pixel_tank_green.png",
    player_left: "assets/pixel_tank_green_left.png",
    player_right: "assets/pixel_tank_green_right.png",
    player_upleft: "assets/pixel_tank_green_upleft.png",
    player_upright: "assets/pixel_tank_green_upright.png",

    boss1_down: "assets/boss1/boss_1_down.png",
    boss1_left: "assets/boss1/boss_1_left.png",
    boss1_right: "assets/boss1/boss_1_right.png",
    boss1_burn: "assets/boss1/boss_1_burn1.png",

    boss2_down: "assets/boss2/boss2down.png",
    boss2_left: "assets/boss2/boss2left.png",
    boss2_right: "assets/boss2/boss2right.png",
    boss2_burn: "assets/boss2/boss2burn1.png",

    boss3_down: "assets/boss3/boss3down.png",
    boss3_left: "assets/boss3/boss3left.png",
    boss3_right: "assets/boss3/boss3right.png",
    boss3_burn: "assets/boss3/boss3burn1.png",

    missile_red: "assets/pixel_laser_red.png",
    missile_green: "assets/pixel_laser_green.png",
    missile_blue: "assets/pixel_laser_blue.png",
    missile_yellow: "assets/pixel_laser_yellow.png",

    bg_black: "assets/background-black.png",
    bg_title: "assets/background-title.png",
    bg_snow: "assets/background-snow.png",
    bg_mud: "assets/background-mud.png",
    bg_field: "assets/background-field.png",
    bg_victory: "assets/victory_bg.png"
  };

  const AUDIO_MANIFEST = {
    music_level: "assets/Alpha Mission - Jimena Contreras.mp3",
    music_win: "assets/win.mp3",

    sfx_ammo_out: "assets/ammo out.mp3",
    sfx_ammo: "assets/ammo.mp3",
    sfx_health: "assets/health.mp3",
    sfx_clear: "assets/clear.mp3",
    sfx_fire: "assets/fire.mp3",
    sfx_explosion: "assets/explosion.mp3",
    sfx_level_up: "assets/level up.mp3",
    sfx_damage: "assets/damage.mp3",
    sfx_death: "assets/death.mp3",

    sfx_boss1_entrance: "assets/b1e.mp3",
    sfx_boss1_death: "assets/b1d.mp3",
    sfx_boss2_entrance: "assets/b2e.mp3",
    sfx_boss2_death: "assets/b2d.mp3",
    sfx_boss3_entrance: "assets/b3e.mp3",
    sfx_boss3_death: "assets/b3d.mp3"
  };

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image: " + src));
      img.src = encodeURI(src);
    });
  }

  function loadAudio(src) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = "auto";
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve(audio);
      };
      audio.oncanplaythrough = finish;
      audio.onloadedmetadata = finish;
      audio.onerror = () => {
        if (settled) return;
        settled = true;
        reject(new Error("Failed to load audio: " + src));
      };
      audio.src = encodeURI(src);
      audio.load();
      // Don't let one slow/uncooperative file stall the whole loading screen.
      setTimeout(finish, 8000);
    });
  }

  async function loadAll(onProgress) {
    const images = {};
    const audio = {};

    const imageEntries = Object.entries(IMAGE_MANIFEST);
    const audioEntries = Object.entries(AUDIO_MANIFEST);
    const total = imageEntries.length + audioEntries.length;
    let done = 0;

    const bump = () => {
      done++;
      if (onProgress) onProgress(done / total);
    };

    await Promise.all([
      ...imageEntries.map(([key, src]) =>
        loadImage(src).then((img) => {
          images[key] = img;
          bump();
        })
      ),
      ...audioEntries.map(([key, src]) =>
        loadAudio(src)
          .then((a) => {
            audio[key] = a;
            bump();
          })
          .catch(() => {
            // Audio is non-critical for gameplay; keep loading even if a
            // browser refuses a codec/file. Still counts toward progress.
            bump();
          })
      )
    ]);

    return { images, audio };
  }

  global.Assets = { IMAGE_MANIFEST, AUDIO_MANIFEST, loadAll };
})(window);
