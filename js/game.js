// Scene/state machine ported from main_menu()/level_1()/level_2()/level_3()
// in Defender.py. Each scene exposes a single frame(ctx) method that both
// draws and advances simulation by exactly one 60Hz tick, mirroring the
// structure of the original per-frame while-loop bodies (render happens
// first, then state is advanced - this ordering is what makes e.g. the
// "Fall back!" banner appear one tick after health/line hits zero, just
// like the source).
(function (global) {
  "use strict";

  const WIDTH = 750;
  const HEIGHT = 750;
  const FPS = 60;

  function pyRandrange(a, b) {
    // Mirrors random.randrange(a, b): uniform integer in [a, b).
    return a + Math.floor(Math.random() * (b - a));
  }

  function drawText(ctx, text, x, y, px, align) {
    ctx.fillStyle = "#fff";
    ctx.font = `${px}px Impact, "Arial Narrow Bold", "Helvetica Neue Condensed Bold", sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
  }

  function drawCentered(ctx, text, y, px) {
    drawText(ctx, text, WIDTH / 2, y, px, "center");
  }

  function bossImages(n) {
    const I = global.IMAGES;
    return { down: I[`boss${n}_down`], left: I[`boss${n}_left`], right: I[`boss${n}_right`], burn: I[`boss${n}_burn`] };
  }

  function playerImages() {
    const I = global.IMAGES;
    return { up: I.player_up, left: I.player_left, right: I.player_right, upleft: I.player_upleft, upright: I.player_upright };
  }

  function enemyImages() {
    const I = global.IMAGES;
    return { green: I.green_enemy, blue: I.blue_enemy, missileGreen: I.missile_green, missileBlue: I.missile_blue };
  }

  const LEVEL_CONFIGS = {
    1: {
      index: 1,
      bgKey: "bg_field",
      wavesStart: 5,
      waveLengthStart: 5,
      enemyVel: 1.5,
      playerVel: 5,
      laserVel: 20,
      bossHealth: 500,
      bossImagesKey: 1,
      bossEntranceSfx: "sfx_boss1_entrance",
      bossDeathSfx: "sfx_boss1_death",
      bossShootDenom: 120,
      bossRamDamage: 10,
      shouldSpawnPickup: (w) => w <= 4,
      shouldSpawnUpgrade: (w) => w === 3,
      hudBeforeEntities: false,
      bossBeforePlayer: false,
      isFinalLevel: false,
      nextLabel: 'level 2 "Mud"'
    },
    2: {
      index: 2,
      bgKey: "bg_mud",
      wavesStart: 7,
      waveLengthStart: 6,
      enemyVel: 1,
      playerVel: 4,
      laserVel: 20,
      bossHealth: 1000,
      bossImagesKey: 2,
      bossEntranceSfx: "sfx_boss2_entrance",
      bossDeathSfx: "sfx_boss2_death",
      bossShootDenom: 60,
      bossRamDamage: 10,
      shouldSpawnPickup: (w) => w === 5 || w <= 4,
      shouldSpawnUpgrade: (w) => w === 6 || w === 3,
      hudBeforeEntities: true,
      bossBeforePlayer: true,
      isFinalLevel: false,
      nextLabel: 'level 3 "Snow"'
    },
    3: {
      index: 3,
      bgKey: "bg_snow",
      wavesStart: 9,
      waveLengthStart: 6,
      enemyVel: 1.5,
      playerVel: 5,
      laserVel: 20,
      bossHealth: 2000,
      bossImagesKey: 3,
      bossEntranceSfx: "sfx_boss3_entrance",
      bossDeathSfx: "sfx_boss3_death",
      bossShootDenom: 40,
      bossRamDamage: 20,
      shouldSpawnPickup: (w) => w === 8 || w === 6 || w <= 4,
      shouldSpawnUpgrade: (w) => w === 7 || w === 5 || w === 3,
      hudBeforeEntities: true,
      bossBeforePlayer: true,
      isFinalLevel: true
    }
  };

  class MenuScene {
    constructor() {
      global.audioManager.playMusic("music_win", { volume: 1, loop: true });
    }
    frame(ctx) {
      ctx.drawImage(global.IMAGES.bg_title, 0, 0, WIDTH, HEIGHT);
      drawCentered(ctx, "Press mouse button to Start", 250, 40);
      if (global.Input.consumeTap()) {
        Game.switchScene(new LevelRunner(LEVEL_CONFIGS[1]));
      }
    }
  }

  class BetweenScene {
    constructor(fromCfg) {
      this.label2 = fromCfg.nextLabel;
      this.nextIndex = fromCfg.index + 1;
    }
    frame(ctx) {
      ctx.drawImage(global.IMAGES.bg_black, 0, 0, WIDTH, HEIGHT);
      drawCentered(ctx, "Proceed to next combat zone", 150, 60);
      drawCentered(ctx, this.label2, 210, 60);
      if (global.Input.consumeTap()) {
        Game.switchScene(new LevelRunner(LEVEL_CONFIGS[this.nextIndex]));
      }
    }
  }

  class VictoryScene {
    constructor() {
      global.audioManager.playMusic("music_win", { volume: 1, loop: true });
    }
    frame(ctx) {
      ctx.drawImage(global.IMAGES.bg_victory, 0, 0, WIDTH, HEIGHT);
      drawCentered(ctx, "Congratulations! You win!", 150, 60);
      if (global.Input.consumeTap()) {
        Game.switchScene(new MenuScene());
      }
    }
  }

  class LevelRunner {
    constructor(cfg) {
      this.cfg = cfg;
      this.currentBg = global.IMAGES[cfg.bgKey];
      this.waves = cfg.wavesStart;
      this.waveLength = cfg.waveLengthStart;
      this.line = 5;
      this.pickups = [];
      this.upgrades = [];
      this.enemies = [];
      this.clearSoundPlayed = false;
      this.player = new Entities.Player(300, 630, 100, playerImages());
      this.lost = false;
      this.lostCount = 0;
      this.clearCount = 0;
      this.numberOfBigBosses = 0;
      this.bigBossDefeated = false;
      this.bigBossAlive = false;
      this.bigBoss = null;
      this.combat = true;

      global.audioManager.playMusic("music_level", { volume: 0.1, loop: true });
    }

    render(ctx) {
      ctx.drawImage(this.currentBg, 0, 0, WIDTH, HEIGHT);
      for (const enemy of this.enemies) enemy.draw(ctx);

      const drawHud = () => {
        drawText(ctx, `Line: ${this.line}`, 10, 10, 50, "left");
        drawText(ctx, `Waves: ${this.waves}`, WIDTH - 10, 10, 50, "right");
      };
      const drawRest = () => {
        for (const pu of this.pickups) pu.draw(ctx);
        for (const up of this.upgrades) up.draw(ctx);
        if (this.cfg.bossBeforePlayer) {
          if (this.bigBossAlive) this.bigBoss.draw(ctx);
          this.player.draw(ctx);
        } else {
          this.player.draw(ctx);
          if (this.bigBossAlive) this.bigBoss.draw(ctx);
        }
      };

      if (this.cfg.hudBeforeEntities) {
        drawHud();
        drawRest();
      } else {
        drawRest();
        drawHud();
      }

      if (this.lost) {
        drawCentered(ctx, "Fall back!", 350, 60);
      }
    }

    frame(ctx) {
      this.combat = true;
      this.render(ctx);

      if (this.line <= 0 || this.player.health <= 0) {
        if (!this.lost) global.audioManager.playSfx("sfx_ammo_out");
        this.lost = true;
        this.lostCount++;
      }

      if (this.lost) {
        if (this.lostCount > FPS * 3) {
          Game.switchScene(new MenuScene());
        }
        return;
      }

      if (this.waves === 0 && !this.clearSoundPlayed && this.bigBossDefeated && this.enemies.length < 1) {
        global.audioManager.stopMusic();
        this.clearSoundPlayed = true;
        global.audioManager.playSfx("sfx_clear");
      }

      if (this.waves === 0) {
        if (this.numberOfBigBosses < 1) {
          this.bigBoss = new Entities.Bigboss(325, -200, this.cfg.bossHealth, bossImages(this.cfg.bossImagesKey));
          global.audioManager.playSfx(this.cfg.bossEntranceSfx, 1);
          this.numberOfBigBosses++;
          this.bigBossAlive = true;
        }
        if (this.bigBoss.health <= 0) {
          this.bigBoss.destroyed = true;
          this.bigBoss.img = bossImages(this.cfg.bossImagesKey).burn;
          this.bigBossDefeated = true;
        }
        if (this.bigBossDefeated && this.enemies.length < 1) {
          this.combat = false;
          let between = false;
          this.clearCount++;
          if (this.clearCount > FPS * 3) {
            this.bigBossAlive = false;
            between = true;
            global.audioManager.playSfx(this.cfg.bossDeathSfx, 1);
          }
          if (between) {
            if (this.cfg.isFinalLevel) {
              Game.switchScene(new VictoryScene());
            } else {
              Game.switchScene(new BetweenScene(this.cfg));
            }
            return;
          }
        }
      }

      if (this.cfg.shouldSpawnPickup(this.waves) && this.enemies.length === 0 && !this.bigBossAlive) {
        this.pickups.push(new Entities.Pickup(pyRandrange(50, WIDTH - 100), pyRandrange(-1500, -100), global.IMAGES.health));
      }

      if (this.cfg.shouldSpawnUpgrade(this.waves) && this.enemies.length === 0 && !this.bigBossAlive) {
        this.upgrades.push(new Entities.Upgrade(pyRandrange(50, WIDTH - 100), pyRandrange(-1500, -100), global.IMAGES.upgrade));
      }

      if (this.enemies.length === 0 && this.combat && !this.bigBossAlive) {
        this.waves -= 1;
        global.audioManager.playSfx("sfx_level_up");
        this.waveLength += 3;
        for (let i = 0; i < this.waveLength; i++) {
          const colour = Math.random() < 0.5 ? "blue" : "green";
          this.enemies.push(new Entities.Enemy(pyRandrange(50, WIDTH - 100), pyRandrange(-1500, -100), colour, enemyImages(), 100));
        }
      }

      if (this.combat) {
        this.updateCombat();
      }
    }

    updateCombat() {
      const k = global.Input.state;
      const p = this.player;
      const vel = this.cfg.playerVel;

      if (k.left && p.x - vel > 0) {
        p.x -= vel;
        p.img = p.images.left;
      }
      if (k.right && p.x + vel + p.getWidth() < WIDTH) {
        p.x += vel;
        p.img = p.images.right;
      }
      if (k.up && p.y - vel > 0) {
        p.y -= vel;
        p.img = p.images.up;
      }
      if (k.down && p.y + vel + p.getHeight() + 15 < HEIGHT) {
        p.y += vel;
        p.img = p.images.up;
      }
      if (k.down && k.right) p.img = p.images.upleft;
      if (k.up && k.left) p.img = p.images.upleft;
      if (k.down && k.left) p.img = p.images.upright;
      if (k.up && k.right) p.img = p.images.upright;

      if (k.fire) p.shoot();

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        enemy.move(this.cfg.enemyVel);
        enemy.moveLasers(this.cfg.laserVel, p);

        if (pyRandrange(0, 2 * 60) === 1) enemy.shoot();

        let removed = false;
        if (Entities.collide(enemy, p)) {
          p.health -= 10;
          this.enemies.splice(i, 1);
          global.audioManager.playSfx("sfx_damage");
          global.audioManager.playSfx("sfx_death");
          removed = true;
        }
        if (!removed && enemy.y + enemy.getHeight() > HEIGHT) {
          this.line -= 1;
          this.enemies.splice(i, 1);
          removed = true;
        }
        if (!removed) {
          for (const laser of p.lasers) {
            if (laser.collision(enemy)) {
              global.audioManager.playSfx("sfx_explosion");
              this.enemies.splice(i, 1);
              break;
            }
          }
        }
      }

      if (!this.bigBossDefeated && this.bigBossAlive) {
        const boss = this.bigBoss;
        boss.move();
        boss.moveLasers(this.cfg.laserVel, p);
        boss.updateSprite();

        if (pyRandrange(0, this.cfg.bossShootDenom) === 1) boss.shoot();

        if (Entities.collide(boss, p)) {
          p.health -= this.cfg.bossRamDamage;
          boss.health -= 10;
          global.audioManager.playSfx("sfx_damage");
          global.audioManager.playSfx("sfx_death");
        }
        for (const laser of p.lasers) {
          if (laser.collision(boss)) {
            boss.health -= 10;
            global.audioManager.playSfx("sfx_explosion");
          }
        }
      }

      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const pu = this.pickups[i];
        pu.move(this.cfg.enemyVel);
        if (Entities.collide(pu, p)) {
          p.health = p.maxHealth;
          this.pickups.splice(i, 1);
          global.audioManager.playSfx("sfx_health");
        } else if (pu.y + pu.getHeight() > HEIGHT) {
          this.line += 1;
          this.pickups.splice(i, 1);
        }
      }

      for (let i = this.upgrades.length - 1; i >= 0; i--) {
        const up = this.upgrades[i];
        up.move(this.cfg.enemyVel);
        if (Entities.collide(up, p)) {
          p.maxHealth += 50;
          p.health += p.health / 2;
          this.upgrades.splice(i, 1);
          global.audioManager.playSfx("sfx_ammo");
        } else if (up.y + up.getHeight() > HEIGHT) {
          this.line += 1;
          this.upgrades.splice(i, 1);
        }
      }

      p.moveLasers(-this.cfg.laserVel, this.enemies);
    }
  }

  const Game = {
    scene: null,
    switchScene(scene) {
      this.scene = scene;
    },
    frame(ctx) {
      if (this.scene) this.scene.frame(ctx);
    },
    start() {
      this.switchScene(new MenuScene());
    }
  };

  global.Game = Game;
  global.WIDTH = WIDTH;
  global.HEIGHT = HEIGHT;
  global.FPS = FPS;
})(window);
