import Phaser from 'phaser';
import {
  TILE, BASE_TILE_MS, SPEED_STACK_PCT, MAX_SPEED_STACKS,
  MAX_BOMBS, MAX_RANGE, RESPAWN_INVUL_MS, POST_HIT_INVUL_MS,
  PLAYER_COLORS, INPUT_LAYOUTS
} from '../config.js';
import { tileToPxX, tileToPxY } from '../managers/TilemapManager.js';

export default class Player {
  constructor(scene, index, gx, gy) {
    this.scene = scene;
    this.index = index;
    this.gx = gx;
    this.gy = gy;
    this.lives = 3;
    this.maxBombs = 1;
    this.bombsAlive = 0;
    this.range = 1;
    this.speedStacks = 0;
    this.kick = false;
    this.shield = false;
    this.invulUntil = 0;
    this.alive = true;
    this.eliminated = false;

    this.stats = { kills: 0, walls: 0, bombs: 0 };

    this.sprite = scene.physics.add.image(tileToPxX(gx), tileToPxY(gy), `player${index}`);
    this.sprite.setDepth(5);
    this.sprite.body.setSize(TILE - 8, TILE - 8);

    // Movement state.
    this.moving = false;
    this.fromX = this.sprite.x;
    this.fromY = this.sprite.y;
    this.toX = this.sprite.x;
    this.toY = this.sprite.y;
    this.tNow = 0;
    this.tDur = 0;
    this.targetGx = gx;
    this.targetGy = gy;

    // Bombs the player has stepped onto but not yet left (pass-through tracking).
    this.passThroughBombs = new Set();

    const layout = INPUT_LAYOUTS[index] || INPUT_LAYOUTS[0];
    this.keys = {
      up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[layout.up]),
      down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[layout.down]),
      left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[layout.left]),
      right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[layout.right]),
      bomb: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[layout.bomb])
    };
    // Start true so a held key carried from menu (ENTER/SPACE) doesn't fire on frame 1.
    this.bombDown = true;
  }

  get color() { return PLAYER_COLORS[this.index]; }

  tileMs() {
    return BASE_TILE_MS / (1 + SPEED_STACK_PCT * this.speedStacks);
  }

  isInvul(now) { return now < this.invulUntil; }

  update(dt, now) {
    if (!this.alive || this.eliminated) return;
    this.flicker(now);

    if (this.moving) {
      this.tNow += dt;
      const p = Math.min(1, this.tNow / this.tDur);
      this.sprite.x = Phaser.Math.Linear(this.fromX, this.toX, p);
      this.sprite.y = Phaser.Math.Linear(this.fromY, this.toY, p);
      if (p >= 1) {
        this.moving = false;
        this.gx = this.targetGx;
        this.gy = this.targetGy;
        this.sprite.x = this.toX;
        this.sprite.y = this.toY;
        this.scene.onPlayerEnterTile(this);
      }
    }

    // Bomb input (rising-edge); allowed mid-tween (places at current tile).
    const bombHeld = this.keys.bomb.isDown;
    if (bombHeld && !this.bombDown) {
      this.scene.tryPlaceBomb(this);
    }
    this.bombDown = bombHeld;

    if (!this.moving) {
      const dir = this.heldDirection();
      if (dir) {
        const ngx = this.gx + dir.dx;
        const ngy = this.gy + dir.dy;
        const blocked = this.scene.isBlockedForPlayer(this, ngx, ngy);
        if (!blocked) this.beginMove(ngx, ngy);
      }
    }
  }

  heldDirection() {
    if (this.keys.up.isDown) return { dx: 0, dy: -1 };
    if (this.keys.down.isDown) return { dx: 0, dy: 1 };
    if (this.keys.left.isDown) return { dx: -1, dy: 0 };
    if (this.keys.right.isDown) return { dx: 1, dy: 0 };
    return null;
  }

  beginMove(ngx, ngy) {
    this.targetGx = ngx;
    this.targetGy = ngy;
    this.fromX = this.sprite.x;
    this.fromY = this.sprite.y;
    this.toX = tileToPxX(ngx);
    this.toY = tileToPxY(ngy);
    this.tNow = 0;
    this.tDur = this.tileMs();
    this.moving = true;
  }

  flicker(now) {
    this.sprite.alpha = this.isInvul(now) ? (Math.floor(now / 80) % 2 ? 0.4 : 1.0) : 1.0;
  }

  applyPowerUp(type) {
    if (type === 'bomb' && this.maxBombs < MAX_BOMBS) this.maxBombs++;
    else if (type === 'range' && this.range < MAX_RANGE) this.range++;
    else if (type === 'speed' && this.speedStacks < MAX_SPEED_STACKS) this.speedStacks++;
    else if (type === 'kick') this.kick = true;
    else if (type === 'shield') this.shield = true;
  }

  takeHit(now) {
    if (this.isInvul(now)) return false;
    if (this.shield) {
      this.shield = false;
      this.invulUntil = now + POST_HIT_INVUL_MS;
      return false;
    }
    this.lives--;
    if (this.lives <= 0) {
      this.alive = false;
      this.eliminated = true;
      this.sprite.setVisible(false);
      return true;
    }
    return true; // hit absorbed via life loss
  }

  respawn(gx, gy, now) {
    this.gx = gx; this.gy = gy;
    this.targetGx = gx; this.targetGy = gy;
    this.moving = false;
    this.sprite.x = tileToPxX(gx);
    this.sprite.y = tileToPxY(gy);
    this.invulUntil = now + RESPAWN_INVUL_MS;
  }
}
