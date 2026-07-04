// Entity classes ported directly from the Vehicle/Player/Enemy/Bigboss/
// Missile/Pickup/Upgrade classes in Defender.py. Field names and behaviour
// (including its quirks - e.g. player lasers are never consumed on an enemy
// hit inside the per-enemy scan, only when they leave the screen) are kept
// intentionally faithful to the original.
(function (global) {
  "use strict";

  const WIDTH = 750;
  const HEIGHT = 750;

  function collide(obj1, obj2) {
    return Masks.collide(obj1.img, obj1.x, obj1.y, obj2.img, obj2.x, obj2.y);
  }

  class Missile {
    constructor(x, y, img) {
      this.x = x;
      this.y = y;
      this.img = img;
    }
    draw(ctx) {
      ctx.drawImage(this.img, Math.round(this.x), Math.round(this.y));
    }
    move(vel) {
      this.y += vel;
    }
    offScreen(height) {
      return !(this.y <= height && this.y >= 0);
    }
    collision(obj) {
      return collide(obj, this);
    }
  }

  class Vehicle {
    constructor(x, y, health = 100) {
      this.x = x;
      this.y = y;
      this.health = health;
      this.img = null;
      this.laserImg = null;
      this.lasers = [];
      this.coolDownCounter = 0;
    }

    draw(ctx) {
      ctx.drawImage(this.img, Math.round(this.x), Math.round(this.y));
      for (const laser of this.lasers) laser.draw(ctx);
    }

    // Moves this vehicle's own lasers toward `target`; on overlap the
    // target takes 10 damage and the laser disappears. Used for
    // enemy -> player and boss -> player fire.
    moveLasers(vel, target) {
      this.cooldown();
      for (let i = this.lasers.length - 1; i >= 0; i--) {
        const laser = this.lasers[i];
        laser.move(vel);
        if (laser.offScreen(HEIGHT)) {
          this.lasers.splice(i, 1);
        } else if (laser.collision(target)) {
          target.health -= 10;
          this.lasers.splice(i, 1);
        }
      }
    }

    cooldown() {
      if (this.coolDownCounter >= Vehicle.COOLDOWN) {
        this.coolDownCounter = 0;
      } else if (this.coolDownCounter > 0) {
        this.coolDownCounter++;
      }
    }

    shoot() {
      if (this.coolDownCounter === 0) {
        this.lasers.push(new Missile(this.x, this.y, this.laserImg));
        this.coolDownCounter = 1;
        global.audioManager.playSfx("sfx_fire", 0.5);
      }
    }

    getWidth() {
      return this.img.naturalWidth || this.img.width;
    }

    getHeight() {
      return this.img.naturalHeight || this.img.height;
    }
  }
  Vehicle.COOLDOWN = 15;

  class Bigboss extends Vehicle {
    constructor(x, y, health = 500, images) {
      super(x, y, health);
      this.images = images; // {down, left, right, burn}
      this.img = images.down;
      this.laserImg = global.IMAGES.missile_red;
      this.maxHealth = health;
      this.speed = 2;
      this.direction = "down";
      this.destroyed = false;
    }

    move() {
      if (this.destroyed) return;
      if (this.y <= 100) this.y += 2;
      if (this.y === 100 && this.direction === "down") this.direction = "left";
      if (this.x < 50 && this.y >= 100) this.direction = "right";
      if (this.x > 600 && this.y >= 100) this.direction = "left";
      if (this.direction === "left") this.x -= 2;
      if (this.direction === "right") this.x += 2;
    }

    updateSprite() {
      if (this.direction === "left") this.img = this.images.left;
      if (this.direction === "right") this.img = this.images.right;
      if (this.direction === "down") this.img = this.images.down;
    }

    draw(ctx) {
      super.draw(ctx);
      if (!this.destroyed) this.healthbar(ctx);
    }

    healthbar(ctx) {
      const barY = this.y + this.getHeight() - 120;
      ctx.fillStyle = "rgb(255,0,0)";
      ctx.fillRect(this.x, barY, this.getWidth(), 10);
      ctx.fillStyle = "rgb(0,255,0)";
      ctx.fillRect(this.x, barY, this.getWidth() * (this.health / this.maxHealth), 10);
    }
  }

  class Player extends Vehicle {
    constructor(x, y, health = 100, images) {
      super(x, y, health);
      this.images = images; // {up,left,right,upleft,upright}
      this.img = images.up;
      this.laserImg = global.IMAGES.missile_yellow;
      this.maxHealth = health;
    }

    // Scans `enemies` for overlaps with this player's lasers. Faithfully
    // reproduces the original's behaviour: a laser is removed only when it
    // leaves the screen OR when it is still overlapping something at the
    // moment this method runs (an enemy already destroyed earlier in the
    // same tick by the per-enemy scan will not be in `enemies` any more, so
    // the same laser survives and keeps travelling - i.e. lasers can pierce
    // through a stacked column of enemies).
    moveLasers(vel, enemies) {
      this.cooldown();
      for (let i = this.lasers.length - 1; i >= 0; i--) {
        const laser = this.lasers[i];
        laser.move(vel);
        if (laser.offScreen(HEIGHT)) {
          this.lasers.splice(i, 1);
          continue;
        }
        for (let j = enemies.length - 1; j >= 0; j--) {
          if (laser.collision(enemies[j])) {
            enemies.splice(j, 1);
            this.lasers.splice(i, 1);
            break;
          }
        }
      }
    }

    draw(ctx) {
      super.draw(ctx);
      this.healthbar(ctx);
    }

    healthbar(ctx) {
      const barY = this.y + this.getHeight() + 10;
      ctx.fillStyle = "rgb(255,0,0)";
      ctx.fillRect(this.x, barY, this.getWidth(), 10);
      ctx.fillStyle = "rgb(0,255,0)";
      ctx.fillRect(this.x, barY, this.getWidth() * (this.health / this.maxHealth), 10);
    }

    move(vel) {
      this.y -= vel;
    }
  }

  class Enemy extends Vehicle {
    constructor(x, y, colour, images, health = 100) {
      super(x, y, health);
      this.colour = colour;
      this.img = colour === "green" ? images.green : images.blue;
      this.laserImg = colour === "green" ? images.missileGreen : images.missileBlue;
    }

    move(vel) {
      this.y += vel;
    }

    shoot() {
      if (this.coolDownCounter === 0) {
        this.lasers.push(new Missile(this.x - 20, this.y, this.laserImg));
        this.coolDownCounter = 1;
      }
    }
  }

  class Pickup {
    constructor(x, y, img) {
      this.x = x;
      this.y = y;
      this.img = img;
    }
    move(vel) {
      this.y += vel / 2;
    }
    draw(ctx) {
      ctx.drawImage(this.img, Math.round(this.x), Math.round(this.y));
    }
    getHeight() {
      return this.img.naturalHeight || this.img.height;
    }
  }

  class Upgrade {
    constructor(x, y, img) {
      this.x = x;
      this.y = y;
      this.img = img;
    }
    move(vel) {
      this.y += vel / 2;
    }
    draw(ctx) {
      ctx.drawImage(this.img, Math.round(this.x), Math.round(this.y));
    }
    getHeight() {
      return this.img.naturalHeight || this.img.height;
    }
  }

  global.Entities = { Missile, Vehicle, Bigboss, Player, Enemy, Pickup, Upgrade, collide, WIDTH, HEIGHT };
})(window);
