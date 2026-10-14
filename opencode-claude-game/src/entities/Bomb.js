import Phaser from 'phaser';
import { BOMB_TIMER_MS, KICK_SPEED_MS } from '../constants.js';
import { tileToWorld } from '../utils/Grid.js';

export default class Bomb extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} row
   * @param {number} col
   * @param {Player} owner
   * @param {number} [timerMs]
   */
  constructor(scene, row, col, owner, timerMs = BOMB_TIMER_MS) {
    const { x, y } = tileToWorld(row, col);
    super(scene, x, y, 'bomb');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.setDepth(2);

    this.row   = row;
    this.col   = col;
    this.owner = owner;
    this.range = owner ? owner.range : 1;

    // Players currently allowed to walk through this bomb (pass-through set)
    /** @type {Set<Player>} */
    this.passThroughPlayers = new Set();
    if (owner) this.passThroughPlayers.add(owner);

    this.fuse       = timerMs;
    this.exploded   = false;
    this.kicked     = false;   // currently sliding from a kick
    this._blinking  = false;

    this.body.setSize(28, 28);
  }

  update(delta) {
    if (this.exploded || this.kicked) return;

    this.fuse -= delta;

    // Blink faster as fuse nears 0
    const ratio = this.fuse / BOMB_TIMER_MS;
    if (ratio < 0.5 && !this._blinking) {
      this._blinking = true;
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 1, to: 0.3 },
        duration: Math.max(80, ratio * 300),
        yoyo: true,
        repeat: -1,
      });
      this.setTexture('bomb_lit');
    }

    if (this.fuse <= 0) {
      this.scene.detonateBomb(this);
    }
  }

  /** Immediately chain-detonate (called by explosion propagation) */
  chainDetonate() {
    if (!this.exploded) {
      this.fuse = 0;
    }
  }

  // ── Kick ─────────────────────────────────────────────────────────────

  /**
   * Start sliding the bomb in direction (dr, dc).
   * Returns a promise-like callback when the bomb stops.
   */
  startKick(dr, dc) {
    this.kicked = true;
    this._slideStep(dr, dc);
  }

  _slideStep(dr, dc) {
    const nr = this.row + dr;
    const nc = this.col + dc;

    const canSlide =
      this.scene.tilemap.isWalkable(nr, nc) &&
      !this.scene.getBombAt(nr, nc);

    if (!canSlide) {
      // Stop here — check if a sprite occupies the blocked tile
      const blocking = this.scene.getSpriteAt(nr, nc);
      if (blocking && blocking.takeDamage) {
        blocking.takeDamage(this.owner);
      }
      this.kicked = false;
      // Move the bomb's logical position to last clear tile (already correct)
      return;
    }

    // Move to (nr, nc)
    const { x, y } = tileToWorld(nr, nc);
    this.scene.moveBomb(this, nr, nc); // updates bomb grid map

    this.scene.tweens.add({
      targets: this,
      x, y,
      duration: KICK_SPEED_MS,
      ease: 'Linear',
      onComplete: () => {
        this.row = nr;
        this.col = nc;
        this._slideStep(dr, dc); // continue
      },
    });
  }
}
