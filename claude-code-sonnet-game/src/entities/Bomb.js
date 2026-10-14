import { BOMB_TIMER_MS } from '../constants.js';
import { tileToWorld } from '../util/Grid.js';

export class Bomb {
  constructor(scene, tx, ty, owner, range) {
    this.scene = scene;
    this.tx = tx;
    this.ty = ty;
    this.owner = owner; // Player reference
    this.range = range;
    this.timeLeft = BOMB_TIMER_MS;
    this.alive = true;
    this.kicking = false;
    this.kickDir = null;
    this.kickTween = null;

    // Pass-through: players still on this tile ignore this bomb's collision
    this.passSet = new Set();
    if (owner) {
      this.passSet.add(owner.index);
    }

    const pos = tileToWorld(tx, ty);
    this.sprite = scene.add.image(pos.x, pos.y, 'bomb').setDepth(2);

    this.blinkTween = null;
    this._blinkStarted = false;
  }

  update(delta) {
    if (!this.alive) return;

    this.timeLeft -= delta;

    // Start fast blink when < 500ms left
    if (this.timeLeft < 500 && !this._blinkStarted) {
      this._blinkStarted = true;
      if (this.blinkTween) {
        this.blinkTween.stop();
        this.blinkTween = null;
      }
      this.blinkTween = this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0.2,
        duration: 80,
        yoyo: true,
        repeat: -1,
      });
    } else if (this.timeLeft < BOMB_TIMER_MS * 0.75 && !this._blinkStarted) {
      // Slow blink when 75% timer elapsed
      if (!this.blinkTween) {
        this.blinkTween = this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0.4,
          duration: 250,
          yoyo: true,
          repeat: -1,
        });
      }
    }

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
    }
  }

  /**
   * Kick the bomb in a direction. It slides until it hits a wall.
   */
  kick(dir, tilemapManager, bombManager) {
    if (this.kicking) return;
    this.kicking = true;
    this.kickDir = dir;
    this._slideStep(tilemapManager, bombManager);
  }

  _slideStep(tilemapManager, bombManager) {
    if (!this.alive) return;

    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = dirs[this.kickDir];
    const nx = this.tx + dx;
    const ny = this.ty + dy;

    // Check if next tile is passable for the bomb
    if (tilemapManager.isBlocked(nx, ny) || bombManager.hasBomb(nx, ny)) {
      // Stop here
      this.kicking = false;
      this.kickDir = null;
      return;
    }

    // Move one tile
    const targetPos = tileToWorld(nx, ny);
    const slideDuration = 60; // fast slide

    // Update logical position immediately
    this.tx = nx;
    this.ty = ny;

    this.kickTween = this.scene.tweens.add({
      targets: this.sprite,
      x: targetPos.x,
      y: targetPos.y,
      duration: slideDuration,
      ease: 'Linear',
      onComplete: () => {
        if (!this.alive) return;
        this._slideStep(tilemapManager, bombManager);
      },
    });
  }

  destroy() {
    this.alive = false;
    if (this.blinkTween) {
      this.blinkTween.stop();
      this.blinkTween = null;
    }
    if (this.kickTween) {
      this.kickTween.stop();
      this.kickTween = null;
    }
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}
